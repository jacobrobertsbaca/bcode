"use client";

import createClient from "@/provider/client";
import { Button } from "@mui/material";
import { useRouter } from "next/navigation";
import { enqueueSnackbar } from "notistack";
import Image from "next/image";

export default function SignInButton() {
  const router = useRouter();

  function getRedirectURL() {
    let url =
      process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
      process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
      'http://localhost:3000/';
    
    // Make sure to include `https://` when not localhost.
    url = url.includes('http') ? url : `https://${url}`
    // Make sure to include a trailing `/`.
    url = url.charAt(url.length - 1) === '/' ? url : `${url}/`
    return `${url}auth/callback`;
  }

  async function signIn() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: getRedirectURL() },
    });
    if (error) enqueueSnackbar(error.message, { variant: "error" });
  }

  return (
    <Button
      variant="text"
      fullWidth
      startIcon={<Image alt="GitHub Logo" width={20} height={20} src="/github.svg" />}
      onClick={signIn}
    >
      Continue with GitHub
    </Button>
  );
}
