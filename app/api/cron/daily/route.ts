import { runDaily } from "@/lib/automations";

/**
 * Daily job (vercel.json → crons): cancels unpaid orders, expires points, sends birthday gifts
 * and abandoned-cart reminders. Vercel calls it with "Authorization: Bearer $CRON_SECRET".
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 401 });
  }
  return Response.json({ ok: true, ...(await runDaily()) });
}
