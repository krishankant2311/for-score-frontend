import { IoIosTrendingDown, IoIosTrendingUp } from "react-icons/io";
import { FaUser } from "react-icons/fa";

export default function Card({
  title = "Total Guardians",
  amount = 0,
  percentage = 0,
  isIncrease = true,
  para = "Parents Who Have Visited So Far",
  isCurrency = false,
  currency = "INR",
  locale = "en-IN",
  icon: Icon = FaUser,
  iconBg = "bg-blue-100",
  iconColor = "text-blue-600",
}) {
  const formattedAmount = (() => {
    const n = Number(amount);
    if (!Number.isFinite(n)) return isCurrency ? "—" : "0";
    if (!isCurrency) return n.toLocaleString(locale);
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      return `$${n.toLocaleString(locale)}`;
    }
  })();

  return (
    <div className="surface-card w-full transition-shadow duration-300 hover:shadow-[var(--shadow-premium)]">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-primary/75">{title}</p>
            <h1 className="mt-1 text-xl font-semibold leading-7 tracking-tight text-primary">
              {formattedAmount}
            </h1>
          </div>
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 ring-border/60 ${iconBg}`}
          >
            <Icon className={`text-2xl ${iconColor}`} />
          </div>
        </div>

        <div className="my-3 h-px w-full bg-border/70" />
        <div className="flex items-center gap-4">
          <div
            className={[
              "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold shadow-sm",
              isIncrease
                ? "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                : "bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
            ].join(" ")}
          >
            {isIncrease ? <IoIosTrendingUp /> : <IoIosTrendingDown />}
            {percentage}%
          </div>
          <p className="text-sm font-medium text-muted-foreground">{para}</p>
        </div>
      </div>
    </div>
  );
}
