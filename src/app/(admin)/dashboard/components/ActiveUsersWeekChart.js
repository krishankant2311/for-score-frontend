"use client";
import { Bar } from "react-chartjs-2";

export default function ActiveUsersWeekChart({
  data,
  baseOptions,
  title = "Activity (This Week)",
  subtitle = "Daily activity count",
  yMax = 900,
  yStep = 200,
}) {
  const hasData = Array.isArray(data?.labels) && data.labels.length > 0;
  return (
    <div className="surface-card flex h-72 flex-col overflow-hidden md:h-96">
      <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-emerald-50 via-background to-amber-50/40 dark:from-emerald-950/35 dark:via-background dark:to-amber-950/15">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-tight text-foreground">{title}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="flex-1 min-h-0 relative overflow-hidden p-5">
        <Bar
        data={data}
        options={{
          ...baseOptions,
          clip: true,
          layout: {
            padding: {
              top: 10,
              bottom: 10,
              left: 10,
              right: 10,
            },
          },
          plugins: {
            ...baseOptions.plugins,
            legend: {
              display: false,
            },
            title: {
              display: false,
            },
          },
          scales: {
            ...baseOptions.scales,
            y: {
              ...baseOptions.scales.y,
              beginAtZero: true,
              max: yMax,
              ticks: {
                stepSize: yStep,
                color: "hsl(var(--muted-foreground))",
                maxTicksLimit: 5,
              },
              grid: { color: "hsl(var(--border) / 0.6)" },
            },
            x: {
              ...baseOptions.scales.x,
              grid: { 
                display: false,
                color: "hsl(var(--border) / 0.6)" 
              },
              ticks: { color: "hsl(var(--muted-foreground))" },
            },
          },
        }}
        />

        {!hasData ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm font-medium text-muted-foreground">
              No data for selected timeframe
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
