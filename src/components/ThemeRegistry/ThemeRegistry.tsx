"use client";

import * as React from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import NextAppDirEmotionCacheProvider from "./EmotionCache";
import { SnackbarProvider } from "notistack";
import createTheme from "./theme";
import { useMediaQuery } from "@mui/material";
import { AppProgressBar } from "../navigation/AppProgressBar";

export const ColorModeContext = React.createContext({ toggleColorMode: () => {} });

type ColorMode = "light" | "dark";
const kColorModeStorageKey = "ThemeRegistry-PreferredColorMode";

function defaultColorMode(prefersDarkModeSystem: boolean): ColorMode {
  const prefersDarkModeStored = localStorage.getItem(kColorModeStorageKey);
  if (prefersDarkModeStored) {
    if (prefersDarkModeStored === "light" || prefersDarkModeStored === "dark") return prefersDarkModeStored;
  }

  return prefersDarkModeSystem ? "dark" : "light";
}

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const prefersDarkModeSystem = useMediaQuery("(prefers-color-scheme: dark)");
  const [mode, setMode] = React.useState<ColorMode>(defaultColorMode(prefersDarkModeSystem));

  const theme = createTheme(mode);
  const colorMode = React.useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === "light" ? "dark" : "light";
          localStorage.setItem(kColorModeStorageKey, newMode);
          return newMode;
        });
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
        <AppProgressBar
          height="4px"
          color={theme.palette.background.contrast}
          options={{ showSpinner: false }}
          shallowRouting
        />
      </ColorModeContext.Provider>
    </NextAppDirEmotionCacheProvider>
  );
}
