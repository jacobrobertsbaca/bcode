import * as React from "react";
import Box from "@mui/material/Box";
import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry";
import { Container } from "@mui/material";
import createServer from "@/provider/server";
import AuthObserver from "@/components/AuthObserver";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "bcode",
  description: "Create collaborative section problems for CS106B",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
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
            <Box width={1} mx={6} my={10}>
              {children}
            </Box>
          </Container>
        </ThemeRegistry>
      </body>
    </html>
  );
}
