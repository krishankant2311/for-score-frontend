"use client";
import { Line } from "react-chartjs-2";

export default function RevenueChart({ data, baseOptions }) {
  return (
    <div className="surface-card p-6 h-72 md:h-96">
      <Line
        data={data}
        options={{
          ...baseOptions,
          plugins: {
            ...baseOptions.plugins,
            title: { ...baseOptions.plugins.title, text: "Monthly Revenue" },
          },
        }}
      />
    </div>
  );
}
