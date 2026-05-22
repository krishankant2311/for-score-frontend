const DEFAULT_DAYS = 30;

export function formatPeriodLabel(period) {
  let s = String(period ?? "").trim();
  if (s.startsWith("/")) s = s.replace(/^\/+/, "").trim();
  if (!s) return `${DEFAULT_DAYS} days`;
  if (/\b(day|week|month|year)s?\b/i.test(s)) return s;
  const n = Number.parseInt(s.replace(/[^\d]/g, ""), 10);
  if (Number.isFinite(n) && n > 0) return `${n} days`;
  return s;
}

/** Strip a leading $ and commas; keep the numeric / plain amount. */
export function amountWithoutCurrency(value) {
  return String(value ?? "")
    .trim()
    .replace(/^\$+/, "")
    .replace(/,/g, "")
    .trim();
}

/**
 * Renders as: $39.99/30 days (amount in foreground, /period in muted)
 */
export function formatPricePeriodParts(price, period) {
  const raw = amountWithoutCurrency(price);
  return {
    amount: raw || "—",
    period: formatPeriodLabel(period),
  };
}
