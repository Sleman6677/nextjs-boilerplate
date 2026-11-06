/**
 * SMS through 019 SMS (docs.019sms.co.il).
 *   SMS019_USERNAME  account user name
 *   SMS019_TOKEN     API token (Settings → Token API in the 019 dashboard)
 *   SMS_SENDER       sender name, up to 11 English letters/digits (default "SeragLashes")
 *   SMS019_API_URL   optional override (local testing)
 */

export function smsConfigured(): boolean {
  return Boolean(process.env.SMS019_USERNAME && process.env.SMS019_TOKEN);
}

export type SmsResult = { ok: true; ref: string | null } | { ok: false; error: string };

export async function sendSms(phoneE164: string, message: string): Promise<SmsResult> {
  if (!smsConfigured()) return { ok: false, error: "not_configured" };
  const local = `0${phoneE164.replace(/^\+972/, "")}`;
  const sender = (process.env.SMS_SENDER || "SeragLashes").replace(/[^A-Za-z0-9]/g, "").slice(0, 11);
  try {
    const res = await fetch(process.env.SMS019_API_URL || "https://019sms.co.il/api", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.SMS019_TOKEN}` },
      body: JSON.stringify({
        sms: {
          user: { username: process.env.SMS019_USERNAME },
          source: sender,
          destinations: { phone: [{ _: local }] },
          message: message.slice(0, 1000),
        },
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => null)) as { status?: number | string; message?: string; shipment_id?: string } | null;
    if (data && Number(data.status) === 0) return { ok: true, ref: data.shipment_id ? String(data.shipment_id) : null };
    return { ok: false, error: `019 ${data?.status ?? res.status}: ${data?.message ?? "no response"}`.slice(0, 300) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "send failed" };
  }
}
