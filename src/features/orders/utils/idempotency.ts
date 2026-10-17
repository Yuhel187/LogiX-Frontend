/**
 * Idempotency keys must be unguessable and unique per submission.
 * `getRandomValues` is used as the fallback because `randomUUID` is only
 * exposed in secure contexts (HTTPS/localhost).
 */
export function createIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}
