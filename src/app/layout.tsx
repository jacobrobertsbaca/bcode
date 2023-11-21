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
    <html style={{ height: '100%' }} lang="en">
      <body style={{ height: '100%' }}>
        <ThemeRegistry>
          <Box p={3} height={1}>{children}</Box>
        </ThemeRegistry>
      </body>
    </html>
  );
}
