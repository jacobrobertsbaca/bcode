"use client";

import createClient from "@/provider/client";
import { Button } from "@mui/material";
import { useRouter } from "next-nprogress-bar";
import { enqueueSnackbar } from "notistack";
import Image from "next/image";

export default function SignInButton() {
  const router = useRouter();

  function getRedirectURL() {
    let url = window.location.origin;
    // Make sure to include `http://` to match Supabase redirect allow list
    url = url.includes('http') ? url : `http://${url}`
    // Make sure to include a trailing `/`.
    url = url.charAt(url.length - 1) === '/' ? url : `${url}/`
    console.log(url);
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
