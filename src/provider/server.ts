import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
