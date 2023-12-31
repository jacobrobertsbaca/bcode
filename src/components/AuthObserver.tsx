"use client";

import { useEffect } from "react";
import { useRouter } from "@/components/navigation/AppProgressBar";
import createClient from "@/provider/client";

/**
 * React component to refresh Next.js router when auth changes.
 */
export default function AuthObserver({ accessToken }: { accessToken?: string }) {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription: authListener },
    } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.access_token !== accessToken) router.refresh();
    });

    return () => authListener?.unsubscribe();
  }, [accessToken, router]);

  return null;
}
