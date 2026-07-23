export function fmtNum(n: number | null | undefined, opts: { compact?: boolean; digits?: number } = {}): string {
  if (n == null || isNaN(n)) return "—";
  const { compact = false, digits = 2 } = opts;
  if (compact) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
}

export function fmtPct(n: number | null | undefined, digits = 2): string {
  if (n == null || isNaN(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

export function fmtCurrency(n: number | null | undefined, compact = false): string {
  if (n == null || isNaN(n)) return "—";
  if (compact) {
    return "$" + new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
  }
  return "$" + n.toFixed(2);
}
