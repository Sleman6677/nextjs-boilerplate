import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseKey, supabaseUrl } from "./config";

/** Supabase client bound to the request cookies (server components, server actions, route handlers). */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl()!, supabaseKey()!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a server component: cookies are refreshed by proxy.ts instead.
        }
      },
    },
  });
}
