import * as React from "react";
import Box from "@mui/material/Box";
import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry";
import Navigation from "@/components/Navigation";
import { Container } from "@mui/material";

export const metadata = {
  title: "Next.js App Router + Material UI v5",
  description: "Next.js App Router + Material UI v5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <Navigation />
          <Container
            maxWidth="lg"
            sx={{
              bgcolor: "background.default",
              mt: ["48px", "56px", "64px"],
              p: 3,
            }}
          >
            {children}
          </Container>
        </ThemeRegistry>
      </body>
    </html>
  );
}
