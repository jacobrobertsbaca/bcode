import * as React from "react";
import Box from "@mui/material/Box";
import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry";
import { Container } from "@mui/material";
import supabase from "@/provider/server";
import AuthObserver from "@/components/AuthObserver";

export const metadata = {
  title: "Next.js App Router + Material UI v5",
  description: "Next.js App Router + Material UI v5",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { data: { session } } = await supabase.auth.getSession();
  return (
    <html style={{ height: "100%" }} lang="en">
      <body style={{ height: "100%" }}>
        <AuthObserver accessToken={session?.access_token} />
        <ThemeRegistry>
          <Container
            maxWidth="lg"
            sx={{
              minHeight: 1,
              alignItems: "center",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Box width={1} m={6}>{children}</Box>
          </Container>
        </ThemeRegistry>
      </body>
    </html>
  );
}
