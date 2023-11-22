"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/provider/client";

/**
 * React component to refresh Next.js router when auth changes.
 */
export default function AuthObserver({ accessToken }: { accessToken?: string }) {
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
