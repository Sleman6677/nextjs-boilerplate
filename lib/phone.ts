/* Israeli phone numbers (client-safe). Stored as +972XXXXXXXXX. */

/** "054-123 4567", "+972541234567", "972541234567" → "+972541234567"; null if not an Israeli number. */
export function normalizePhone(raw: unknown): string | null {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("972")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  if (!/^(5\d{8}|7\d{8}|[23489]\d{7})$/.test(d)) return null;
  return `+972${d}`;
}

/** Mobile numbers can receive SMS (login codes, order updates). */
export const isMobile = (e164: string | null | undefined): e164 is string => Boolean(e164 && /^\+9725\d{8}$/.test(e164));

/** "+972541234567" → "054-123-4567" */
export function displayPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const local = `0${e164.replace(/^\+972/, "")}`;
  return local.length === 10 ? `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}` : local;
}
