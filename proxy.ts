import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ATTRIBUTION_COOKIE, attributionFromUrl } from "./lib/attribution";
import { defaultLocale, isLocale, type Locale } from "./lib/i18n/config";

const COOKIE = "NEXT_LOCALE";

function preferred(request: NextRequest): Locale {
  const cookie = request.cookies.get(COOKIE)?.value;
  if (cookie && isLocale(cookie)) return cookie;
  const header = request.headers.get("accept-language") ?? "";
  for (const part of header.split(",")) {
    const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    if (code === "iw") return "he";
    if (isLocale(code)) return code;
  }
  return defaultLocale;
}

/**
 * Refreshes the Supabase session cookies (access tokens expire hourly and refresh
 * tokens rotate). Only runs when the visitor already has a Supabase auth cookie.
 */
async function refreshSession(request: NextRequest, response: NextResponse): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return response;

  let res = response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        const next = NextResponse.next({ request });
        for (const c of res.cookies.getAll()) next.cookies.set(c);
        for (const { name, value, options } of cookiesToSet) next.cookies.set(name, value, options);
        res = next;
      },
    },
  });
  await supabase.auth.getUser();
  return res;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];

  // The owner panel is not localized.
  if (first === "admin") return refreshSession(request, NextResponse.next({ request }));

  if (isLocale(first)) {
    const res = NextResponse.next({ request });
    // Where the visitor came from (?ref=influencer, ?utm_source=instagram): kept 30 days, last visit wins.
    const source = attributionFromUrl(request.nextUrl);
    if (source) res.cookies.set(ATTRIBUTION_COOKIE, source, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax", httpOnly: true });
    // Remember the language the visitor chose.
    if (request.cookies.get(COOKIE)?.value !== first) {
      res.cookies.set(COOKIE, first, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
    return refreshSession(request, res);
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${preferred(request)}${pathname === "/" ? "" : pathname}`;
  const redirect = NextResponse.redirect(url);
  const source = attributionFromUrl(request.nextUrl);
  if (source) redirect.cookies.set(ATTRIBUTION_COOKIE, source, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax", httpOnly: true });
  return redirect;
}

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
