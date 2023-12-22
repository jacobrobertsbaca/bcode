import * as React from "react";
import Box from "@mui/material/Box";
import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry";
import { Container } from "@mui/material";
import createServer from "@/provider/server";
import AuthObserver from "@/components/AuthObserver";
import { Metadata } from "next";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "bcode",
  description: "Create collaborative section problems for CS106B",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServer(true);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  /* Get value of theme cookie from headers to pass to ThemeRegistry */
  const cookieStore = cookies();
  const theme = cookieStore.get("theme")?.value;

  return (
    <html style={{ height: "100%" }} lang="en">
      <body style={{ height: "100%" }}>
        <AuthObserver accessToken={session?.access_token} />
        <ThemeRegistry theme={theme}>
          <Container
            maxWidth="lg"
            sx={{
              minHeight: 1,
              alignItems: "center",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Box width={1} mx={6} my={10}>
              {children}
            </Box>
          </Container>
        </ThemeRegistry>
      </body>
    </html>
  );
}
