"use client";

import * as React from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import NextAppDirEmotionCacheProvider from "./EmotionCache";
import { SnackbarProvider } from "notistack";
import createTheme from "./theme";
import { useMediaQuery } from "@mui/material";
import { AppProgressBar } from "../navigation/AppProgressBar";
import { useCookies } from "react-cookie";

export const ColorModeContext = React.createContext({ toggleColorMode: () => {} });

export default function ThemeRegistry({ theme, children }: { theme?: string; children: React.ReactNode }) {
  const systemMode = useMediaQuery("(prefers-color-scheme: dark)") ? "dark" : "light";
  const initialMode = theme === "light" || theme === "dark" ? theme : systemMode;
  const [mode, setMode] = React.useState<"light" | "dark">(initialMode);
  const [cookies, setCookie] = useCookies(["theme"]);

  /* Observe cookies changes to ensure theme changes across tabs */
  React.useEffect(() => {
    const newTheme = cookies.theme;
    if (newTheme !== "light" && newTheme != "dark") return;
    setMode(newTheme);
  }, [cookies]);

  const muiTheme = createTheme(mode);
  const colorMode = React.useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === "light" ? "dark" : "light";
          setCookie("theme", newMode, {
            path: "/",
            maxAge: 365 * 24 * 60 * 60, // 365 days to expire
          });
          return newMode;
        });
      },
    }),
    []
  );

  return (
    <NextAppDirEmotionCacheProvider options={{ key: "mui" }}>
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={muiTheme}>
          {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
          <CssBaseline enableColorScheme />
          <SnackbarProvider />
          {children}
        </ThemeProvider>
        <AppProgressBar
          height="4px"
          color={muiTheme.palette.background.contrast}
          options={{ showSpinner: false }}
          shallowRouting
        />
      </ColorModeContext.Provider>
    </NextAppDirEmotionCacheProvider>
  );
}
