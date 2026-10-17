/**
 * Locale-aware display formatters. Decimal values arrive from the backend as
 * strings (numeric columns) and are formatted from the string so precision is
 * never lost through a JS number.
 */

const DECIMAL_PATTERN = /^(-?)(\d+)(?:\.(\d+))?$/;

export function formatDecimal(value: string, locale: string): string {
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (!match) return value;

  const [, sign, whole, fraction = ""] = match;
  const groupedWhole = new Intl.NumberFormat(locale).format(BigInt(whole));
  const trimmedFraction = fraction.replace(/0+$/, "");
  if (!trimmedFraction) return `${sign}${groupedWhole}`;

  return `${sign}${groupedWhole}${decimalSeparator(locale)}${trimmedFraction}`;
}

export function formatDateTime(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function decimalSeparator(locale: string): string {
  const parts = new Intl.NumberFormat(locale).formatToParts(1.1);
  return parts.find((part) => part.type === "decimal")?.value ?? ".";
}
