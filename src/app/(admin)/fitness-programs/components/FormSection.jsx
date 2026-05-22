/** Shared layout for Add / Edit fitness program forms */
const TONE_HEADER = {
  default:
    "bg-gradient-to-r from-[#FAFCFF] via-white to-[#F5F8FC] border-b border-[#E8EEF7]",
  sky: "bg-gradient-to-r from-sky-50 via-white to-indigo-50/40 border-b border-[#D9E8F5]",
  violet: "bg-gradient-to-r from-violet-50/90 via-white to-sky-50/30 border-b border-[#E8E4F5]",
  emerald: "bg-gradient-to-r from-emerald-50/80 via-white to-amber-50/40 border-b border-[#E5EDE5]",
  slate: "bg-gradient-to-r from-slate-50/90 via-white to-slate-50/50 border-b border-[#E0E7F0]",
  amber: "bg-gradient-to-r from-amber-50/70 via-white to-orange-50/30 border-b border-[#F5E6D3]",
};

export function FormSection({ title, hint, children, className = "", icon, tone = "default" }) {
  const headerTone = TONE_HEADER[tone] ?? TONE_HEADER.default;

  return (
    <section
      className={`rounded-2xl border border-[#C8D7E9] bg-white shadow-sm overflow-hidden ${className}`}
    >
      <div className={`px-5 py-4 md:px-6 md:py-4 ${headerTone}`}>
        <div className={`flex gap-3 ${icon ? "items-start" : "items-center"}`}>
          {icon ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/90 text-[#0A3161] shadow-sm border border-[#C8D7E9]/70 [&_svg]:h-5 [&_svg]:w-5">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-[#0A3161] leading-snug">{title}</h2>
            {hint ? <p className="text-xs text-[#5671A6] mt-1 leading-relaxed">{hint}</p> : null}
          </div>
        </div>
      </div>
      <div className="p-5 md:p-6 space-y-4">{children}</div>
    </section>
  );
}

export const lbl = "block text-xs font-semibold uppercase tracking-wide text-[#2158A3]";

export function choiceChip(active) {
  return `rounded-xl border text-sm font-medium py-2.5 px-4 text-center transition-all ${
    active
      ? "border-[#0A3161] bg-[#0A3161]/5 text-[#0A3161] shadow-sm"
      : "border-[#C8D7E9] bg-white text-[#2158A3] hover:bg-[#F2F5FA]"
  }`;
}
