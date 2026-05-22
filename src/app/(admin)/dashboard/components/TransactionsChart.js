"use client";
import { Bar } from "react-chartjs-2";

export default function TransactionsChart({ data, baseOptions }) {
  return (
    <div className="surface-card p-6 h-72 md:h-96">
      <Bar
        data={data}
        options={{
          ...baseOptions,
          plugins: {
            ...baseOptions.plugins,
            title: { ...baseOptions.plugins.title, text: "Transactions per Month" },
          },
        }}
      />
    </div>
  );
}
