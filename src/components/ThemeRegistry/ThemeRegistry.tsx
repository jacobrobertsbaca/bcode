"use client";

import * as React from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import NextAppDirEmotionCacheProvider from "./EmotionCache";
import { SnackbarProvider } from "notistack";
import { AppProgressBar } from "next-nprogress-bar";
import createTheme from "./theme";
import { useMediaQuery } from "@mui/material";

export const ColorModeContext = React.createContext({ toggleColorMode: () => {} });

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = React.useState<"light" | "dark">(prefersDarkMode ? "dark" : "light");
  const theme = createTheme(mode);
  const colorMode = React.useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
      },
    }),
    []
  );

  return (
    <NextAppDirEmotionCacheProvider options={{ key: "mui" }}>
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
          <CssBaseline />
          <SnackbarProvider />
          {children}
        </ThemeProvider>
        <AppProgressBar height="4px" color="black" options={{ showSpinner: false }} shallowRouting />
      </ColorModeContext.Provider>
    </NextAppDirEmotionCacheProvider>
  );
}
