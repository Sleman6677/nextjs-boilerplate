import { sql } from "@/lib/db";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { sendMessage } from "@/lib/messages";
import { normalizePhone } from "@/lib/phone";
import { verifyStandardWebhook } from "@/lib/webhook";

const reply = (body: object, status = 200) => Response.json(body, { status, headers: { "content-type": "application/json" } });

/**
 * Supabase Auth "Send SMS" hook: Supabase creates the login code, we deliver it through 019 SMS.
 * Set up in Supabase → Authentication → Hooks (HTTP) with this URL and SUPABASE_SMS_HOOK_SECRET.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyStandardWebhook(raw, request.headers, process.env.SUPABASE_SMS_HOOK_SECRET)) {
    return reply({ error: { http_code: 401, message: "invalid signature" } }, 401);
  }
  let payload: { user?: { phone?: string }; sms?: { otp?: string } };
  try {
    payload = JSON.parse(raw);
  } catch {
    return reply({ error: { http_code: 400, message: "bad payload" } }, 400);
  }
  const phone = normalizePhone(payload.user?.phone);
  const code = String(payload.sms?.otp ?? "");
  if (!phone || !/^\d{4,10}$/.test(code)) return reply({ error: { http_code: 400, message: "bad payload" } }, 400);

  const [p] = await sql()`select preferred_lang from profiles where phone_norm = ${phone}`;
  const lang: Locale = p && isLocale(String(p.preferred_lang)) ? (String(p.preferred_lang) as Locale) : "ar";
  const result = await sendMessage({ phone, template: "login_code", lang, vars: { code } });
  if (result.status !== "sent") {
    console.error("login code not sent", result.error);
    return reply({ error: { http_code: 500, message: "sms not sent" } }, 500);
  }
  return reply({});
}
