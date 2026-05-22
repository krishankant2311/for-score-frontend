"use client";
import { Doughnut } from "react-chartjs-2";

export default function StatusDoughnut({ title, chartData, baseOptions }) {
  const hasData = Array.isArray(chartData?.labels) && chartData.labels.length > 0;
  const total = (chartData?.datasets?.[0]?.data ?? []).reduce((sum, v) => sum + Number(v || 0), 0);

  const centerTextPlugin = {
    id: "centerText",
    beforeDraw(chart) {
      if (!hasData) return;
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      if (!meta?.data?.[0]) return;
      const { x, y } = meta.data[0];
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "hsl(var(--foreground))";
      ctx.font = "600 18px Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillText(String(total.toLocaleString()), x, y - 6);
      ctx.fillStyle = "hsl(var(--muted-foreground))";
      ctx.font = "500 12px Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillText("total", x, y + 14);
      ctx.restore();
    },
  };

  return (
    <div className="surface-card flex h-72 flex-col overflow-hidden md:h-96">
      <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-emerald-50 via-background to-amber-50/40 dark:from-emerald-950/35 dark:via-background dark:to-amber-950/15">
        <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">Distribution for selected timeframe</p>
      </div>
      <div className="relative min-h-0 flex-1 p-5">
        <Doughnut
          data={chartData}
          options={{
            ...baseOptions,
            plugins: {
              ...baseOptions.plugins,
              title: { ...baseOptions.plugins.title, display: false },
              legend: {
                ...baseOptions.plugins?.legend,
                labels: {
                  ...baseOptions.plugins?.legend?.labels,
                  font: { size: 12, family: "Inter, sans-serif" },
                  boxWidth: 14,
                  padding: 10,
                },
              },
            },
            // Doughnut charts shouldn't render cartesian axes
            scales: {},
            cutout: "70%",
          }}
          plugins={[centerTextPlugin]}
          style={{ height: "100%", width: "100%" }}
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
