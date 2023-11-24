"use client";
import * as React from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import NextAppDirEmotionCacheProvider from "./EmotionCache";
import theme from "./theme";
import { SnackbarProvider } from "notistack";
import { AppProgressBar } from "next-nprogress-bar";

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <NextAppDirEmotionCacheProvider options={{ key: "mui" }}>
      <ThemeProvider theme={theme}>
        {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
        <CssBaseline />
        <SnackbarProvider />
        {children}
      </ThemeProvider>
      <AppProgressBar height="4px" color="black" options={{ showSpinner: false }} shallowRouting />
    </NextAppDirEmotionCacheProvider>
  );
}
