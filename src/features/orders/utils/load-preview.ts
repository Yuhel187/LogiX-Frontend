/**
 * Exact decimal arithmetic for the load preview. Quantities and unit metrics
 * are decimal strings; multiplying them as JS numbers would drift
 * (0.1 * 3 !== 0.3), so values are scaled to BigInt instead.
 */

interface ScaledDecimal {
  units: bigint;
  scale: number;
}

const DECIMAL_PATTERN = /^(\d+)(?:\.(\d+))?$/;

function parseDecimal(value: string): ScaledDecimal | null {
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (!match) return null;
  const fraction = match[2] ?? "";
  return { units: BigInt(`${match[1]}${fraction}`), scale: fraction.length };
}

function rescale(value: ScaledDecimal, scale: number): bigint {
  return value.units * BigInt(10) ** BigInt(scale - value.scale);
}

function toDecimalString({ units, scale }: ScaledDecimal): string {
  if (scale === 0) return units.toString();
  const digits = units.toString().padStart(scale + 1, "0");
  return `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}

export interface LoadPreviewLine {
  quantity: string;
  unitWeight: string;
  unitVolume: string;
}

export interface LoadPreview {
  totalQuantity: string;
  totalWeight: string;
  totalVolume: string;
}

function sum(values: ScaledDecimal[]): ScaledDecimal {
  const scale = Math.max(0, ...values.map((value) => value.scale));
  const units = values.reduce(
    (total, value) => total + rescale(value, scale),
    BigInt(0)
  );
  return { units, scale };
}

function multiply(a: ScaledDecimal, b: ScaledDecimal): ScaledDecimal {
  return { units: a.units * b.units, scale: a.scale + b.scale };
}

/**
 * Lines whose quantity or metrics are not valid decimals are skipped: the
 * preview is informational and the backend recomputes authoritative totals.
 */
export function computeLoadPreview(lines: LoadPreviewLine[]): LoadPreview {
  const quantities: ScaledDecimal[] = [];
  const weights: ScaledDecimal[] = [];
  const volumes: ScaledDecimal[] = [];

  for (const line of lines) {
    const quantity = parseDecimal(line.quantity);
    const weight = parseDecimal(line.unitWeight);
    const volume = parseDecimal(line.unitVolume);
    if (!quantity || !weight || !volume) continue;
    quantities.push(quantity);
    weights.push(multiply(quantity, weight));
    volumes.push(multiply(quantity, volume));
  }

  return {
    totalQuantity: toDecimalString(sum(quantities)),
    totalWeight: toDecimalString(sum(weights)),
    totalVolume: toDecimalString(sum(volumes)),
  };
}
