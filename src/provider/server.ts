import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase server client using the service role API key.
 * @param useCookies If `true`, will use request cookies.
 * If a user session is present in cookies, then the client will **still** obey Supabase RLS.
 * If `false`, cookies are ignored.
 * @returns A Supabase client.
 */
export default function createServer(useCookies: boolean = false) {
  const store = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVER_KEY!, {
    cookies: useCookies
      ? {
          get(name: string) {
            return store.get(name)?.value;
          },
        }
      : {},
  });
}
