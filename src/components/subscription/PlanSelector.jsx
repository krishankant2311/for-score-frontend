"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPricePeriodParts } from "@/lib/subscriptionFormat";
import { HiCheck } from "react-icons/hi";

const DEFAULT_PLANS = [
  {
    id: "basic",
    name: "Basic",
    tagline: "Perfect to get started",
    price: "$9.99",
    period: "/month",
    features: ["Basic workouts", "Diet tracking", "Progress tracker", "Email support"],
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Perfect to get started",
    price: "$19.99",
    period: "/month",
    features: ["All Basic +", "Advanced programs", "Meal plans", "Video tutorials", "Priority support"],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Perfect to get started",
    price: "$29.99",
    period: "/month",
    features: ["All Premium +", "Personal coaching", "Custom plans", "Nutrition consult", "Analytics"],
  },
];

function PlanCard({ plan, selected, onSelect, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(plan.id)}
      className={cn(
        "text-left rounded-2xl transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <Card
        className={cn(
          "h-full border-2 py-0 shadow-sm hover:shadow-md transition-all",
          selected ? "border-[#0A3161] bg-[#0A3161]/[0.03]" : "border-[#C8D7E9] bg-white"
        )}
      >
        <CardHeader className="px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base text-[#0A3161]">{plan.name}</CardTitle>
              <CardDescription className="mt-1 text-xs text-[#5671A6]">{plan.tagline}</CardDescription>
            </div>
            {selected ? (
              <span className="inline-flex items-center justify-center rounded-xl border border-[#0A3161]/25 bg-[#0A3161]/10 text-[#0A3161] h-9 w-9 shrink-0">
                <HiCheck className="h-5 w-5" />
              </span>
            ) : (
              <span className="inline-flex items-center justify-center rounded-xl border border-[#C8D7E9] bg-white text-transparent h-9 w-9 shrink-0">
                <HiCheck className="h-5 w-5" />
              </span>
            )}
          </div>

          <div className="mt-4 flex items-baseline flex-wrap gap-0">
            {(() => {
              const { amount, period: periodText } = formatPricePeriodParts(plan.price, plan.period);
              if (amount === "—") {
                return <div className="text-2xl text-[#0A3161]">—</div>;
              }
              return (
                <>
                  <span className="text-2xl font-semibold text-[#0A3161] tabular-nums">${amount}</span>
                  <span className="text-sm text-[#5671A6]">/{periodText}</span>
                </>
              );
            })()}
          </div>
        </CardHeader>

        <CardContent className="px-5 pb-5">
          <ul className="space-y-2">
            {plan.features?.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-[#2158A3]">
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-lg bg-[#0A3161]/10 text-[#0A3161] shrink-0">
                  <HiCheck className="h-4 w-4" />
                </span>
                <span className="leading-snug">{f}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </button>
  );
}

/**
 * PlanSelector
 * - Controlled: pass `value` + `onChange`
 * - Uncontrolled: omit `value`, read selection via `onConfirm(selectedId)`
 */
export default function PlanSelector({
  title = "Select Plan",
  subtitle = "Select a plan — you can change it anytime",
  plans = DEFAULT_PLANS,
  value,
  defaultValue,
  onChange,
  onConfirm,
  confirmLabel,
  disabled = false,
  className = "",
}) {
  const planIds = useMemo(() => plans.map((p) => p.id), [plans]);
  const initial = useMemo(() => {
    if (value) return value;
    if (defaultValue) return defaultValue;
    return planIds[0] ?? "";
  }, [defaultValue, planIds, value]);

  const [internal, setInternal] = useState(initial);
  const selectedId = value ?? internal;

  const setSelected = (id) => {
    if (disabled) return;
    if (!planIds.includes(id)) return;
    setInternal(id);
    onChange?.(id);
  };

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedId) ?? null,
    [plans, selectedId]
  );

  const finalConfirmLabel = confirmLabel ?? "Save changes";

  return (
    <section className={cn("rounded-2xl border border-[#C8D7E9] bg-white shadow-sm", className)}>
      <div className="px-5 py-4 md:px-6 md:py-4 bg-gradient-to-r from-[#FAFCFF] via-white to-[#F5F8FC] border-b border-[#E8EEF7] rounded-t-2xl">
        <h2 className="text-sm font-semibold text-[#0A3161] leading-snug">{title}</h2>
        {subtitle ? <p className="text-xs text-[#5671A6] mt-1 leading-relaxed">{subtitle}</p> : null}
      </div>

      <div className="p-5 md:p-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              selected={p.id === selectedId}
              onSelect={setSelected}
              disabled={disabled}
            />
          ))}
        </div>

        {onConfirm ? (
          <div className="flex items-center justify-end">
            <Button
              type="button"
              onClick={() => onConfirm(selectedId)}
              disabled={disabled || !selectedId}
            >
              {finalConfirmLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

