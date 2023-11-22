import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export default function createServer() {
  const store = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
    },
  });
}
