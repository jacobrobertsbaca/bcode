"use client";

import createClient from "@/provider/client";
import { Button } from "@mui/material";
import { useRouter } from "next/navigation";
import { enqueueSnackbar } from "notistack";
import Image from "next/image";

export default function SignInButton() {
  const router = useRouter();

  async function signIn() {
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo },
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
