/**
 * The backend runs `ValidationPipe({ whitelist, forbidNonWhitelisted })`, so an
 * empty optional field must be omitted rather than sent as "".
 */
export function stripBlanks<T extends Record<string, unknown>>(
  input: T
): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }
  return out as Partial<T>;
}
