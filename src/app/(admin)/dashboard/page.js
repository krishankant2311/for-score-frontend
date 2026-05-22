"use client";
import Card from "@/components/CardGen";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { LuApple, LuUsers } from "react-icons/lu";
import { TbActivityHeartbeat } from "react-icons/tb";
import { LiaDumbbellSolid } from "react-icons/lia";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import AdminHeaderCard from "@/components/admin/AdminHeaderCard";
import StatusDoughnut from "./components/UserDistributionChart";
import UserGrowthChart from "./components/UserGrowthChart";
import ActiveUsersWeekChart from "./components/ActiveUsersWeekChart";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [apiData, setApiData] = useState(null);
  const [rawApiPayload, setRawApiPayload] = useState(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const timeframeLabelMap = {
    all: "All time",
    last_week: "Last week",
    last_3_months: "Last months",
  };

  const normalizeArray = (val) => {
    if (Array.isArray(val)) return val;
    if (val && Array.isArray(val.items)) return val.items;
    if (val && Array.isArray(val.data)) return val.data;
    if (val && Array.isArray(val.results)) return val.results;
    return null;
  };

  const firstDefined = (...vals) => {
    for (const v of vals) if (v !== undefined && v !== null) return v;
    return undefined;
  };

  const makeLineDataset = (label, data, color) => ({
    label,
    data,
    borderColor: color,
    backgroundColor: (ctx) => {
      const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 400);
      const rgba =
        color === "#0A3161"
          ? ["rgba(10,49,97,0.3)", "rgba(10,49,97,0)"]
          : color === "#16a34a"
            ? ["rgba(22,163,74,0.28)", "rgba(22,163,74,0)"]
            : ["rgba(21,93,252,0.22)", "rgba(21,93,252,0)"];
      gradient.addColorStop(0, rgba[0]);
      gradient.addColorStop(1, rgba[1]);
      return gradient;
    },
    pointBackgroundColor: color,
    pointRadius: 4,
    pointHoverRadius: 6,
    tension: 0.35,
    fill: true,
  });

  const coerceChartJs = (raw, kind) => {
    // If backend already returns Chart.js compatible object, use it as-is.
    if (raw && Array.isArray(raw.labels) && Array.isArray(raw.datasets)) return raw;

    const labels = raw?.labels ?? raw?.xAxis ?? raw?.x ?? raw?.categories;
    const values =
      raw?.data ??
      raw?.values ??
      raw?.yAxis ??
      raw?.y ??
      raw?.counts ??
      raw?.series;

    // series array support: [{ label, data/values }]
    if (Array.isArray(labels) && Array.isArray(raw?.series)) {
      return {
        labels,
        datasets: raw.series.map((s, idx) => {
          const sData = s?.data ?? s?.values ?? [];
          const sLabel = s?.label ?? `Series ${idx + 1}`;
          const color = idx === 0 ? "#0A3161" : idx === 1 ? "#16a34a" : "#155dfc";
          return kind === "line"
            ? makeLineDataset(sLabel, sData, color)
            : {
              label: sLabel,
              data: sData,
              backgroundColor: color,
              borderRadius: 6,
              barThickness: 40,
            };
        }),
      };
    }

    if (!Array.isArray(labels)) return undefined;
    if (!Array.isArray(values)) return undefined;

    if (kind === "doughnut") {
      return {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: raw?.backgroundColor ?? ["#155dfc", "#388df9", "#7fb6ff", "#cfe4ff"],
            borderColor: "#fff",
            borderWidth: 2,
            hoverOffset: 8,
          },
        ],
      };
    }

    if (kind === "bar") {
      return {
        labels,
        datasets: [
          {
            label: raw?.label ?? "Count",
            data: values,
            backgroundColor: raw?.backgroundColor ?? "#0A3161",
            borderRadius: 6,
            barThickness: 40,
          },
        ],
      };
    }

    // line
    return {
      labels,
      datasets: [makeLineDataset(raw?.label ?? "Value", values, raw?.borderColor ?? "#0A3161")],
    };
  };

  const emptyLineChart = (label = "Value", color = "#0A3161") => ({
    labels: [],
    datasets: [makeLineDataset(label, [], color)],
  });

  const emptyBarChart = (label = "Count", color = "#0A3161") => ({
    labels: [],
    datasets: [
      {
        label,
        data: [],
        backgroundColor: color,
        borderRadius: 6,
        barThickness: 40,
      },
    ],
  });

  const emptyDoughnutChart = () => ({
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: ["#155dfc", "#388df9", "#7fb6ff", "#cfe4ff"],
        borderColor: "#fff",
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  });

  const kvArrayToDoughnut = (arr) => {
    if (!Array.isArray(arr)) return undefined;
    return {
      labels: arr.map((x) => x?.label ?? x?.name ?? ""),
      datasets: [
        {
          data: arr.map((x) => Number(x?.value ?? x?.count ?? 0)),
          backgroundColor: ["#16a34a", "#f59e0b", "#ef4444", "#155dfc", "#388df9"],
          borderColor: "#fff",
          borderWidth: 2,
          hoverOffset: 8,
        },
      ],
    };
  };

  const seriesToLine = (arr, { labelKey = "label", valueKey = "value", datasetLabel = "Value", color = "#0A3161" } = {}) => {
    if (!Array.isArray(arr)) return undefined;
    const labels = arr.map((x) => x?.[labelKey] ?? x?.month ?? x?.date ?? x?.day ?? "");
    const values = arr.map((x) => Number(x?.[valueKey] ?? x?.count ?? x?.total ?? 0));
    return { labels, datasets: [makeLineDataset(datasetLabel, values, color)] };
  };

  const seriesToBar = (arr, { labelKey = "label", valueKey = "value", datasetLabel = "Count", color = "#0A3161" } = {}) => {
    if (!Array.isArray(arr)) return undefined;
    const labels = arr.map((x) => x?.[labelKey] ?? x?.month ?? x?.date ?? x?.day ?? "");
    const values = arr.map((x) => Number(x?.[valueKey] ?? x?.count ?? x?.total ?? 0));
    return {
      labels,
      datasets: [
        {
          label: datasetLabel,
          data: values,
          backgroundColor: color,
          borderRadius: 6,
          barThickness: 40,
        },
      ],
    };
  };

  const pickSubscriptionRevenue = (cards) =>
    firstDefined(
      cards?.subscriptionRevenue,
      cards?.subscriptionAmount,
      cards?.totalSubscriptionRevenue,
      cards?.totalRevenue,
      cards?.revenue,
      cards?.amount,
      cards?.totalAmount
    ) ?? 0;

  const isDev = process.env.NODE_ENV !== "production";

  const Skeleton = ({ className }) => (
    <div className={`animate-pulse rounded-xl bg-muted ${className}`} />
  );

  const SkeletonCard = () => (
    <div className="surface-card w-full overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-emerald-50 via-background to-amber-50/40 dark:from-emerald-950/35 dark:via-background dark:to-amber-950/15">
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-12 w-12 rounded-2xl" />
        </div>
        <div className="my-4 h-px w-full bg-border/80" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    </div>
  );

  const SkeletonPanel = ({ title }) => (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-emerald-50 via-background to-amber-50/40 dark:from-emerald-950/35 dark:via-background dark:to-amber-950/15 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="p-6">
        <Skeleton className="h-44 w-full" />
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );

  const SkeletonDoughnut = ({ title }) => (
    <div className="surface-card h-72 overflow-hidden md:h-96">
      <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-emerald-50 via-background to-amber-50/40 dark:from-emerald-950/35 dark:via-background dark:to-amber-950/15">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">Distribution for selected timeframe</p>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-center">
          <Skeleton className="h-40 w-40 rounded-full" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    </div>
  );

  // Show skeleton until we have real API data.
  const shouldShowSkeleton = isLoading || !hasLoadedData;

  const getChartMax = (chart) => {
    const ds = chart?.datasets ?? [];
    let max = 0;
    for (const d of ds) {
      const arr = Array.isArray(d?.data) ? d.data : [];
      for (const v of arr) {
        const n = Number(v);
        if (Number.isFinite(n)) max = Math.max(max, n);
      }
    }
    return max;
  };

  const niceMax = (max, minMax = 5) => {
    const m = Math.max(minMax, Math.ceil(max * 1.25));
    if (m <= 10) return 10;
    if (m <= 25) return 25;
    if (m <= 50) return 50;
    if (m <= 100) return 100;
    return Math.ceil(m / 100) * 100;
  };

  const niceStep = (yMax) => {
    if (yMax <= 10) return 2;
    if (yMax <= 25) return 5;
    if (yMax <= 50) return 10;
    if (yMax <= 100) return 20;
    return Math.max(50, Math.round(yMax / 4 / 10) * 10);
  };

  const timeframeChips = useMemo(
    () => [
      { label: "All", value: "all" },
      { label: "Last Week", value: "last_week" },
      { label: "Last months", value: "last_3_months" },
    ],
    []
  );

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "hsl(var(--muted-foreground))",
          font: { size: 14, family: "Inter, sans-serif" },
          boxWidth: 20,
          padding: 16,
        },
      },
      title: {
        display: true,
        color: "hsl(var(--foreground))",
        font: { size: 18, weight: "600", family: "Inter, sans-serif" },
        padding: { top: 10, bottom: 20 },
      },
      tooltip: {
        backgroundColor: "hsl(var(--foreground))",
        titleColor: "hsl(var(--background))",
        bodyColor: "hsl(var(--background))",
        cornerRadius: 8,
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: { color: "hsl(var(--border) / 0.6)" },
        ticks: { color: "hsl(var(--muted-foreground))" },
      },
      y: {
        grid: { color: "hsl(var(--border) / 0.6)" },
        ticks: { color: "hsl(var(--muted-foreground))" },
      },
    },
  };

  const usersStatusData =
    apiData?.doughnuts?.usersStatus ??
    (apiData ? emptyDoughnutChart() : {
      labels: ["Active", "Inactive", "Blocked"],
      datasets: [
        {
          data: [980, 210, 42],
          backgroundColor: ["#16a34a", "#f59e0b", "#ef4444"],
          borderColor: "#fff",
          borderWidth: 2,
          hoverOffset: 8,
        },
      ],
    });

  const exerciseTypesData =
    apiData?.doughnuts?.exerciseTypes ??
    (apiData ? emptyDoughnutChart() : {
      labels: ["Strength", "Cardio", "Mobility", "Recovery"],
      datasets: [
        {
          data: [420, 310, 180, 90],
          backgroundColor: ["#155dfc", "#388df9", "#7fb6ff", "#cfe4ff"],
          borderColor: "#fff",
          borderWidth: 2,
          hoverOffset: 8,
        },
      ],
    });

  const nutritionLoggingData =
    apiData?.doughnuts?.nutritionLogging ??
    (apiData ? emptyDoughnutChart() : {
      labels: ["On track", "Partial", "Missed"],
      datasets: [
        {
          data: [640, 220, 120],
          backgroundColor: ["#0ea5e9", "#a3e635", "#fb7185"],
          borderColor: "#fff",
          borderWidth: 2,
          hoverOffset: 8,
        },
      ],
    });

  const subscriptionsData =
    apiData?.doughnuts?.subscriptions ??
    (apiData ? emptyDoughnutChart() : undefined);

  const quickActions = [
    { label: "Manage Users", href: "/users" },
    // { label: "Exercise Library", href: "/exercise-library" },
    // { label: "Nutrition & Macros", href: "/nutrition-macros" },
    // { label: "Recovery Content", href: "/recovery-content" },
    { label: "Fitness Programs", href: "/fitness-programs" },
    { label: "Notifications", href: "/notification" },
    { label: "Content Management", href: "/content-management" },
    { label: "FAQ", href: "/faq" },
    { label: "Subscription", href: "/subscription" },
    { label: "Active Users Today", href: "/active-users-today" },
    { label: "Settings", href: "/settings" },
    // { label: "Onboarding", href: "/onboarding" },

  ];

  const recentActivity =
    normalizeArray(apiData?.recentActivity) ?? [
      { time: "2m ago", event: "New user registered", meta: "Email verified" },
      { time: "18m ago", event: "Exercise completed", meta: "Program: Beginner" },
      { time: "1h ago", event: "Nutrition log added", meta: "Macros updated" },
      { time: "3h ago", event: "FAQ updated", meta: "Content team" },
    ];

  const topExercises =
    normalizeArray(apiData?.topExercises) ?? [
      { name: "Squat", completions: 1420, change: "+8%" },
      { name: "Push-up", completions: 1180, change: "+5%" },
      { name: "Plank", completions: 940, change: "+3%" },
      { name: "Jumping Jacks", completions: 760, change: "+2%" },
      { name: "Lunges", completions: 690, change: "-1%" },
    ];

  // Users (monthly)
  const newUsersMonthlyData =
    apiData?.charts?.newUsersMonthly ??
    (apiData ? emptyLineChart("New Users", "#0A3161") : {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      datasets: [
        {
          label: "New Users",
          data: [120, 180, 260, 210, 320, 290],
          borderColor: "#0A3161",
          backgroundColor: (ctx) => {
            const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, "rgba(10,49,97,0.3)");
            gradient.addColorStop(1, "rgba(10,49,97,0)");
            return gradient;
          },
          pointBackgroundColor: "#0A3161",
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: true,
        },
      ],
    });

  // Exercises breakdown (bar) — derived from exercise types donut
  const exerciseTypesBarData = (() => {
    const d = apiData?.doughnuts?.exerciseTypes;
    const labels = d?.labels;
    const data = d?.datasets?.[0]?.data;
    if (!Array.isArray(labels) || !Array.isArray(data)) {
      return apiData ? emptyBarChart("Programs", "#0A3161") : undefined;
    }
    return {
      labels,
      datasets: [
        {
          label: "Programs",
          data,
          backgroundColor: "#0A3161",
          borderRadius: 6,
          barThickness: 40,
        },
      ],
    };
  })();

  // Exercise completions (this week)
  const exerciseCompletionsWeekData =
    apiData?.charts?.exerciseCompletionsWeek ??
    (apiData ? emptyBarChart("Programs Completed", "#0A3161") : {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          label: "Programs Completed",
          data: [320, 410, 380, 520, 450, 610, 560],
          backgroundColor: "#0A3161",
          borderRadius: 6,
          barThickness: 40,
        },
      ],
    });

  // Nutrition adherence (this week, %)
  const subscriptionRevenueWeekData =
    apiData?.charts?.subscriptionRevenueWeek ??
    (apiData ? emptyBarChart("Revenue", "#155dfc") : {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          label: "Revenue",
          data: [6200, 6800, 6500, 7100, 6900, 7500, 7300],
          backgroundColor: "#155dfc",
          borderRadius: 6,
          barThickness: 40,
        },
      ],
    });

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = localStorage.getItem("token");
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

      if (!baseUrl) {
        toast.error("API base URL is missing (NEXT_PUBLIC_API_BASE_URL).");
        return;
      }
      if (!token) {
        toast.error("Session expired. Please login again.");
        return;
      }

      setIsLoading(true);
      setFetchError(null);
      try {
        const endpoints = [`${baseUrl}/api/admin/dashboard`];
        let res = null;

        for (const url of endpoints) {
          try {
            res = await axios.get(url, {
              headers: { token },
              params: { timeframe },
            });
            break;
          } catch (e) {
            res = null;
          }
        }
        console.log(res);
        if (!res) throw new Error("Dashboard API not reachable.");

        const payload = res?.data?.result ?? res?.data ?? {};
        setRawApiPayload(payload);

        // Backend response (your sample) uses: cards, charts, donuts, tables, recentActivity
        const cards = payload?.cards ?? {};
        const charts = payload?.charts ?? {};
        const donuts = payload?.donuts ?? {};
        const tables = payload?.tables ?? {};
        const recent = payload?.recentActivity ?? {};

        const recentUsers = normalizeArray(recent?.users) ?? [];
        const recentWorkouts = normalizeArray(recent?.workouts) ?? [];
        const recentMeals = normalizeArray(recent?.meals) ?? [];

        const recentActivityUnified = [
          ...recentUsers.map((u) => ({
            time: u?.createdAt ? new Date(u.createdAt).toLocaleDateString() : "",
            event: "New user registered",
            meta: u?.email ?? u?.name ?? "",
          })),
          ...recentWorkouts.map((w) => ({
            time: w?.createdAt ? new Date(w.createdAt).toLocaleDateString() : "",
            event: "Workout completed",
            meta: w?.programName ?? w?.title ?? "",
          })),
          ...recentMeals.map((m) => ({
            time: m?.createdAt ? new Date(m.createdAt).toLocaleDateString() : "",
            event: "Meal logged",
            meta: m?.name ?? m?.title ?? "",
          })),
        ].slice(0, 5);

        setApiData({
          cards: {
            totalUsers: cards.totalUsers,
            activeToday: cards.activeToday,
            exercisesToday: cards.exercisesToday,
            nutritionLogsToday: cards.nutritionLogsToday,
            subscriptionRevenue: pickSubscriptionRevenue(cards),
          },
          charts: {
            newUsersMonthly:
              coerceChartJs(charts.newUsersMonthly, "line") ??
              seriesToLine(charts.usersCreatedByMonth, {
                labelKey: "month",
                valueKey: "count",
                datasetLabel: "New Users",
                color: "#0A3161",
              }),
            activeUsersMonthly:
              coerceChartJs(charts.activeUsersMonthly, "line") ??
              seriesToLine(charts.monthlyActiveUsers, {
                labelKey: "month",
                valueKey: "count",
                datasetLabel: "Active Users",
                color: "#16a34a",
              }),
            exerciseCompletionsWeek:
              coerceChartJs(charts.exerciseCompletionsWeek, "bar") ??
              seriesToBar(charts.exerciseCompletionsByDay, {
                labelKey: "day",
                valueKey: "count",
                datasetLabel: "Programs Completed",
                color: "#0A3161",
              }),
            nutritionAdherenceWeek:
              coerceChartJs(charts.subscriptionRevenueWeek, "bar") ??
              coerceChartJs(charts.subscriptionRevenueByDay, "bar") ??
              coerceChartJs(charts.subscriptionAmountByDay, "bar") ??
              coerceChartJs(charts.revenueByDay, "bar") ??
              seriesToBar(charts.subscriptionRevenueByDay, {
                labelKey: "day",
                valueKey: "amount",
                datasetLabel: "Revenue",
                color: "#155dfc",
              }) ??
              seriesToBar(charts.revenueByDay, {
                labelKey: "day",
                valueKey: "amount",
                datasetLabel: "Revenue",
                color: "#155dfc",
              }),
          },
          doughnuts: {
            usersStatus: kvArrayToDoughnut(donuts.userStatus),
            // More useful than "Other:0" — show library categories if available
            exerciseTypes:
              kvArrayToDoughnut(donuts.exerciseLibraryCategories) ??
              kvArrayToDoughnut(donuts.exerciseTypesThisWeek),
            nutritionLogging:
              kvArrayToDoughnut(donuts.nutritionLoggingStatus) ??
              kvArrayToDoughnut(donuts.nutritionLogsThisWeek),
            subscriptions:
              kvArrayToDoughnut(donuts.subscriptionPlans) ??
              kvArrayToDoughnut(donuts.subscriptionsByPlan) ??
              kvArrayToDoughnut(donuts.subscriptionStatus),
          },
          recentActivity: recentActivityUnified,
          topExercises: normalizeArray(tables.topExercisesThisWeek) ?? [],
        });
        setHasLoadedData(true);
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Failed to load dashboard data.";
        setFetchError(msg);
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [timeframe, refreshNonce]);

  // (Removed FOUR Score component distributions; dashboard is admin modules focused)

  return (
    <div className="min-h-[80vh] h-auto">
      <div className="mx-auto w-full py-6">
        <AdminHeaderCard
          title="Dashboard"
          subtitle="Admin overview for users, fitness programs, and subscription revenue."
          actions={
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Timeframe
              </span>
              {timeframeChips.map((chip) => {
                const active = timeframe === chip.value;
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => setTimeframe(chip.value)}
                    className={[
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-card text-foreground/80 hover:bg-accent hover:text-foreground",
                    ].join(" ")}
                  >
                    {chip.label}
                  </button>
                );
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRefreshNonce((n) => n + 1)}
              >
                Refresh
              </Button>
            </div>
          }
        />

        {shouldShowSkeleton ? (
          <div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              <SkeletonPanel title="Users" />
              <SkeletonPanel title="Programs" />
              {/* <SkeletonPanel title="Exercise" /> */}
              <SkeletonPanel title="Nutrition" />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8 grid gap-6">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  <SkeletonDoughnut title="Users Status" />
                  <SkeletonDoughnut title="Exercise Types" />
                  <SkeletonDoughnut title="Nutrition Logging" />
                </div>
                <div className="surface-card p-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">Top Programs</p>
                    <Skeleton className="h-9 w-28 rounded-xl" />
                  </div>
                  <div className="mt-4 space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="surface-card p-6">
                  <p className="text-sm font-semibold text-foreground">Quick Actions</p>
                  <div className="mt-4 space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                </div>
                <div className="surface-card p-6">
                  <p className="text-sm font-semibold text-foreground">Recent Activity</p>
                  <div className="mt-4 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-start justify-between gap-3">
                        <Skeleton className="h-10 w-56" />
                        <Skeleton className="h-4 w-14" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {fetchError && !isLoading && !hasLoadedData ? (
              <div className="mt-6 surface-card p-6 border border-rose-500/25 bg-rose-500/5">
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-200">Couldn’t load dashboard</p>
                <p className="mt-1 text-sm text-muted-foreground">{fetchError}</p>
                <div className="mt-4">
                  <Button type="button" variant="outline" onClick={() => setRefreshNonce((n) => n + 1)}>
                    Retry
                  </Button>
                </div>
              </div>
            ) : null}
        {/* {isDev && rawApiPayload && (
          <div className="mt-4 rounded-2xl border border-[#C8D7E9] bg-white p-4 shadow-sm mx-4">
            <details>
              <summary className="cursor-pointer select-none text-sm font-semibold text-[#0A3161]">
                API Debug (dev only)
              </summary>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-[#E6EEF9] bg-[#F6F9FF] p-3">
                  <p className="text-xs font-semibold text-gray-600">Top-level keys</p>
                  <p className="mt-1 text-xs text-gray-700 break-words">
                    {Object.keys(rawApiPayload || {}).join(", ") || "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-[#E6EEF9] bg-[#F6F9FF] p-3">
                  <p className="text-xs font-semibold text-gray-600">Recent activity items</p>
                  <p className="mt-1 text-xs font-semibold text-gray-900">
                    {normalizeArray(rawApiPayload?.recentActivity) ||
                    normalizeArray(rawApiPayload?.activity) ||
                    normalizeArray(rawApiPayload?.recent_activity)
                      ? (
                          normalizeArray(rawApiPayload?.recentActivity) ||
                          normalizeArray(rawApiPayload?.activity) ||
                          normalizeArray(rawApiPayload?.recent_activity)
                        ).length
                      : 0}
                  </p>
                </div>
                <div className="rounded-xl border border-[#E6EEF9] bg-[#F6F9FF] p-3">
                  <p className="text-xs font-semibold text-gray-600">Top exercises items</p>
                  <p className="mt-1 text-xs font-semibold text-gray-900">
                    {normalizeArray(rawApiPayload?.topExercises) ||
                    normalizeArray(rawApiPayload?.top_exercises)
                      ? (
                          normalizeArray(rawApiPayload?.topExercises) ||
                          normalizeArray(rawApiPayload?.top_exercises)
                        ).length
                      : 0}
                  </p>
                </div>
              </div>
              <pre className="mt-3 max-h-72 overflow-auto rounded-xl border border-[#E6EEF9] bg-[#0B1220] p-3 text-xs text-[#E5E7EB]">
{JSON.stringify(rawApiPayload, null, 2)}
              </pre>
            </details>
          </div>
        )} */}

        {/* Cards */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            title="Total Users"
            amount={apiData?.cards?.totalUsers ?? 0}
            percentage={12}
            isIncrease={false}
            para={`${timeframeLabelMap[timeframe]} users` ?? "All time users"}
            icon={LuUsers}
            iconBg="bg-sky-500/10"
            iconColor="text-sky-700"
          />
          <Card
            title="Active Users"
            amount={apiData?.cards?.activeToday ?? 0}
            percentage={8}
            isIncrease={true}
            para={`${timeframeLabelMap[timeframe]} active users` ?? "All time active users"}
            icon={TbActivityHeartbeat}
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-700"
          />
          <Card
            title="Total Programs"
            amount={apiData?.cards?.exercisesToday ?? 0}
            percentage={11}
            isIncrease={true}
            para={`${timeframeLabelMap[timeframe]} programs` ?? "All time programs"}
            icon={LiaDumbbellSolid}
            iconBg="bg-rose-500/10"
            iconColor="text-rose-700"
          />
          <Card
            title="Subscription Revenue"
            amount={apiData?.cards?.subscriptionRevenue ?? 0}
            percentage={6}
            isIncrease={true}
            para={`${timeframeLabelMap[timeframe]} revenue from subscriptions` ?? "All time subscription revenue"}
            isCurrency
            currency="USDT"
            icon={LuApple}
            iconBg="bg-indigo-500/10"
            iconColor="text-indigo-700"
          />
        </div>

        {/* Charts */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <UserGrowthChart
            data={newUsersMonthlyData}
            baseOptions={baseOptions}
            title="Users"
            subtitle={`${timeframeLabelMap[timeframe]} new users` ?? "All time new users"}
            yMax={niceMax(getChartMax(newUsersMonthlyData), 5)}
            yStep={niceStep(niceMax(getChartMax(newUsersMonthlyData), 5))}
          />
          <ActiveUsersWeekChart
            data={exerciseTypesBarData}
            baseOptions={baseOptions}
            title="Programs"
            subtitle={`${timeframeLabelMap[timeframe]} programs` ?? "All time programs"}
            yMax={niceMax(getChartMax(exerciseTypesBarData), 5)}
            yStep={niceStep(niceMax(getChartMax(exerciseTypesBarData), 5))}
          />
          {/* <ActiveUsersWeekChart
          data={exerciseCompletionsWeekData}
          baseOptions={baseOptions}
          title="Exercise"
          subtitle="Exercises completed (this week)"
          yMax={700}
          yStep={100}
        /> */}
          <ActiveUsersWeekChart
            data={subscriptionRevenueWeekData}
            baseOptions={baseOptions}
            title="Subscription Revenue"
            subtitle={`${timeframeLabelMap[timeframe]} revenue` ?? "All time revenue"}
            yMax={niceMax(getChartMax(subscriptionRevenueWeekData), 10)}
            yStep={niceStep(niceMax(getChartMax(subscriptionRevenueWeekData), 10))}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          {/* Doughnuts */}
          <div className="lg:col-span-8 grid gap-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <StatusDoughnut
                title="Users Status"
                chartData={usersStatusData}
                baseOptions={baseOptions}
              />
              <StatusDoughnut
                title="Programs"
                chartData={exerciseTypesData}
                baseOptions={baseOptions}
              />
              <StatusDoughnut
                title="Subscriptions"
                chartData={subscriptionsData ?? nutritionLoggingData}
                baseOptions={baseOptions}
              />
            </div>

            {/* Fills the left-side blank space */}
            <div className="surface-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-emerald-50 via-background to-amber-50/40 dark:from-emerald-950/35 dark:via-background dark:to-amber-950/15">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold tracking-tight text-foreground">
                      Top Programs
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {timeframeLabelMap[timeframe]} • Highest completions across users
                    </p>
                  </div>
                  <Link
                    href="/exercise-library"
                    className="shrink-0 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-primary transition hover:bg-accent"
                  >
                    View details
                  </Link>
                </div>
              </div>

              <div className="p-5">
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="grid grid-cols-12 bg-muted/60 px-4 py-3 text-xs font-semibold text-muted-foreground">
                    <div className="col-span-6">Programs</div>
                    <div className="col-span-4 text-right">Completions</div>
                    <div className="col-span-2 text-right">Change</div>
                  </div>
                  <div className="divide-y divide-border/70">
                    {topExercises.slice(0, 5).map((row, idx) => {
                      const name = row.name ?? row.exerciseName ?? "—";
                      const completions = row.completions ?? row.count ?? 0;
                      const change = typeof row.change === "string" ? row.change : null;
                      const down = (change ?? "").startsWith("-");
                      const key = row._id ?? row.id ?? `${name}-${idx}`;
                      return (
                        <div
                          key={key}
                          className="grid grid-cols-12 items-center px-4 py-3 transition-colors hover:bg-muted/30"
                        >
                          <div className="col-span-6 truncate text-sm font-semibold text-foreground">
                            {name}
                          </div>
                          <div className="col-span-4 text-right text-sm font-semibold text-foreground">
                            {Number(completions).toLocaleString()}
                          </div>
                          <div
                            className={[
                              "col-span-2 text-right text-sm font-semibold",
                              change
                                ? down
                                  ? "text-rose-600 dark:text-rose-300"
                                  : "text-emerald-700 dark:text-emerald-300"
                                : "text-muted-foreground",
                            ].join(" ")}
                          >
                            {change ?? "—"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side panels */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="surface-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-emerald-50 via-background to-amber-50/40 dark:from-emerald-950/35 dark:via-background dark:to-amber-950/15">
                <h2 className="text-base font-semibold tracking-tight text-foreground">Quick Actions</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Jump to the most used admin sections.
                </p>
              </div>
              <div className="p-5">
                <div className="max-h-[320px] overflow-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(15,23,42,0.35)_transparent] dark:[scrollbar-color:rgba(255,255,255,0.25)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-900/20 dark:[&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-slate-900/30 dark:hover:[&::-webkit-scrollbar-thumb]:bg-white/30">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    {quickActions.map((a) => (
                      <Link
                        key={a.href}
                        href={a.href}
                        className="group flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-accent"
                      >
                        <span className="truncate">{a.label}</span>
                        <span className="text-muted-foreground transition group-hover:translate-x-0.5">→</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="surface-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-emerald-50 via-background to-amber-50/40 dark:from-emerald-950/35 dark:via-background dark:to-amber-950/15">
                <h2 className="text-base font-semibold tracking-tight text-foreground">Recent Activity</h2>
                <p className="mt-1 text-xs text-muted-foreground">Latest events across modules.</p>
              </div>
              <div className="p-5">
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="divide-y divide-border/70">
                    {recentActivity.slice(0, 3).map((row, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {row.event}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{row.meta}</p>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-muted-foreground">
                          {row.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 shrink-0">
                <Link
  href="/active-users-today"
  className="w-full inline-block text-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-accent"
>
  View all activity
</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
