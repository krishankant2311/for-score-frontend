"use client";

import Link from "next/link";

function WireCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-[#C8D7E9] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[#0A3161]">{title}</h2>
        <div className="h-6 w-20 rounded-full bg-[#EEF4FF]" />
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Skeleton({ className }) {
  return <div className={`animate-pulse rounded-xl bg-[#EEF4FF] ${className}`} />;
}

export default function AdminWireframePage() {
  return (
    <div className="min-h-[80vh]">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#0A3161]">Admin Wireframe</h1>
            <p className="mt-1 text-sm text-[#2158A3]">
              Low‑fi layout blueprint for the admin panel UI.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="rounded-xl border border-[#C8D7E9] bg-white px-4 py-2 text-sm font-semibold text-[#0A3161] hover:bg-[#EEF4FF]"
            >
              Back to Dashboard
            </Link>
            <span className="rounded-xl border border-[#C8D7E9] bg-[#0A3161] px-4 py-2 text-sm font-semibold text-white">
              Theme: FOUR Score Admin
            </span>
          </div>
        </div>

        {/* Global layout */}
        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          <WireCard title="Header / Navbar" className="lg:col-span-12">
            <div className="grid grid-cols-12 gap-3">
              <Skeleton className="col-span-7 h-10" />
              <Skeleton className="col-span-3 h-10" />
              <Skeleton className="col-span-2 h-10" />
            </div>
          </WireCard>
        </div>

        {/* KPI row */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {["Total Users", "Active Today", "Exercises Today", "Nutrition Logs"].map((t) => (
            <WireCard key={t} title={t}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="mt-3 h-4 w-40" />
                </div>
                <Skeleton className="h-12 w-12 rounded-2xl" />
              </div>
            </WireCard>
          ))}
        </div>

        {/* Charts grid */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          {["Users Trend", "Active Users Trend", "Exercise (Weekly)", "Nutrition (Weekly)"].map((t) => (
            <WireCard key={t} title={t}>
              <Skeleton className="h-44 w-full" />
              <div className="mt-3 flex gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </WireCard>
          ))}
        </div>

        {/* Breakdown + tables */}
        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 grid gap-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {["Users Status", "Exercise Types", "Nutrition Logging"].map((t) => (
                <WireCard key={t} title={t}>
                  <div className="mx-auto flex w-full items-center justify-center">
                    <Skeleton className="h-40 w-40 rounded-full" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </WireCard>
              ))}
            </div>

            <WireCard title="Table Panel (Top / Recent)">
              <div className="grid grid-cols-12 gap-3">
                <Skeleton className="col-span-4 h-9" />
                <Skeleton className="col-span-4 h-9" />
                <Skeleton className="col-span-4 h-9" />
              </div>
              <div className="mt-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </WireCard>
          </div>

          <div className="lg:col-span-4 grid gap-6">
            <WireCard title="Quick Actions">
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </WireCard>

            <WireCard title="Recent Activity">
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start justify-between gap-3">
                    <Skeleton className="h-10 w-56" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Skeleton className="h-10 w-full" />
              </div>
            </WireCard>
          </div>
        </div>
      </div>
    </div>
  );
}

