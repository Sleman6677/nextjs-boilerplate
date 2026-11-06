/* Formatting for the owner panel: Arabic words, Western digits, Israel time. */

const TZ = "Asia/Jerusalem";

export function shekel(amount: number): string {
  const v = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${v} ₪`;
}

export function when(value: string | Date): string {
  return new Intl.DateTimeFormat("ar-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).format(new Date(value));
}

export function day(value: string | Date): string {
  return new Intl.DateTimeFormat("ar-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(value));
}

/** YYYY-MM-DD in Israel time, for <input type="date">. */
export function dateInput(value: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: TZ }).format(new Date(value));
}

/** wa.me link for an Israeli number like 053-772-5568. */
export function whatsappTo(phone: string, message?: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `972${digits.slice(1)}`;
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
