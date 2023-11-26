"use client";

import createClient from "@/provider/client";
import { Button } from "@mui/material";
import { enqueueSnackbar } from "notistack";
import GithubIcon from "./icons/GithubIcon";

export default function SignInButton() {
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
      startIcon={<GithubIcon />}
      onClick={signIn}
    >
      Continue with GitHub
    </Button>
  );
}
