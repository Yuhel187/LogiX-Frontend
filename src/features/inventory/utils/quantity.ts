/**
 * Quantities are Decimal(18,3) strings from the backend. Everything here works
 * on the string so a 3-decimal value can never drift through a JS number.
 */

const DECIMAL_PATTERN = /^(-?)(\d+)(?:\.(\d{1,3}))?$/;

export function formatQuantity(value: string, locale = "vi-VN"): string {
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (!match) return value;

  const [, sign, whole, fraction = ""] = match;
  const groupedWhole = new Intl.NumberFormat(locale).format(BigInt(whole));
  const trimmedFraction = fraction.replace(/0+$/, "");
  if (!trimmedFraction) return `${sign}${groupedWhole}`;

  const decimalSeparator = locale.startsWith("vi") ? "," : ".";
  return `${sign}${groupedWhole}${decimalSeparator}${trimmedFraction}`;
}

export function formatSignedQuantity(value: string, locale = "vi-VN"): string {
  const normalized = value.trim();
  if (normalized.startsWith("-")) {
    return `−${formatQuantity(normalized.slice(1), locale)}`;
  }
  return `+${formatQuantity(normalized, locale)}`;
}

export function isNegativeQuantity(value: string): boolean {
  return value.trim().startsWith("-");
}

/** Reuse one key for every retry of the same submit attempt. */
export function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
