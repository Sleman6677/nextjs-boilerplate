import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Standard Webhooks verification (used by Supabase Auth hooks).
 * Signed content: "{webhook-id}.{webhook-timestamp}.{body}", HMAC-SHA256 with the base64 secret
 * that follows "whsec_" in the "v1,whsec_..." value; the header lists "v1,<base64 signature>" entries.
 */
export function verifyStandardWebhook(body: string, headers: Headers, secretValue: string | undefined, toleranceSeconds = 300): boolean {
  if (!secretValue) return false;
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatures = headers.get("webhook-signature");
  if (!id || !timestamp || !signatures) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > toleranceSeconds) return false;
  const secret = Buffer.from(secretValue.replace(/^v1,/, "").replace(/^whsec_/, ""), "base64");
  const expected = Buffer.from(createHmac("sha256", secret).update(`${id}.${timestamp}.${body}`).digest("base64"));
  return signatures.split(" ").some((entry) => {
    const [version, sig] = entry.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig);
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
