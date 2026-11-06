/* Where an order came from: ?utm_source=instagram&utm_campaign=… or ?ref=influencer (last visit wins, 30 days). */

export const ATTRIBUTION_COOKIE = "serag_src";

export function attributionFromUrl(url: URL): string | null {
  const source = (url.searchParams.get("ref") ? `ref:${url.searchParams.get("ref")}` : url.searchParams.get("utm_source"))?.trim().toLowerCase().slice(0, 60);
  if (!source) return null;
  const campaign = url.searchParams.get("utm_campaign")?.trim().slice(0, 80) ?? "";
  return JSON.stringify({ s: source.replace(/[^\p{L}\p{N}:_.-]/gu, ""), c: campaign.replace(/[^\p{L}\p{N} _.-]/gu, "") });
}

export function attributionFrom(cookie: string | undefined): { source: string | null; campaign: string | null } {
  try {
    const v = JSON.parse(cookie ?? "") as { s?: string; c?: string };
    return { source: v.s || null, campaign: v.c || null };
  } catch {
    return { source: null, campaign: null };
  }
}
