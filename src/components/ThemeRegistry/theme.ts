import { alpha, createTheme as createMuiTheme } from "@mui/material/styles";
import { jakarta } from "./fonts";

declare module "@mui/material/styles" {
  interface Palette {
    editor: Palette["primary"];
  }

  interface PaletteOptions {
    editor?: PaletteOptions["primary"];
  }

  interface TypeBackground {
    contrast: string;
  }
}

export default function createTheme(mode: "light" | "dark") {
  const theme = createMuiTheme({
    palette: {
      mode,
      ...(mode === "light"
        ? {
            primary: { main: "rgba(70, 70, 70, 1.0)" },
            text: {
              primary: "rgba(0, 0, 0, 0.6)",
              secondary: "rgba(0, 0, 0, 0.46)",
            },
            editor: { main: "#fcfcfc" },
            background: { contrast: "#000" },
          }
        : {
            primary: { main: "rgba(225, 225, 225, 1.0)" },
            text: {
              primary: "rgba(255, 255, 255, 0.8)",
              secondary: "rgba(255, 255, 255, 0.46)",
            },
            editor: { main: "#141414" },
            background: {
              contrast: "#fff",
              paper: "rgb(22, 22, 22)",
            },
          }),
    },
    typography: {
      fontFamily: jakarta.style.fontFamily,
    },
    shape: {
      borderRadius: 9,
    },
  });

  theme.components = {
    ...theme.components,
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "unset",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          boxShadow: "0 2px 6px rgba(0,0,0,.05)",
          ["&.Mui-focused"]: {
            ["& .MuiOutlinedInput-notchedOutline"]: {
              borderWidth: 1,
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${theme.palette.divider}`,
        },
        head: {
          fontWeight: 500,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: "0px !important",
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontSize: "1rem",
          color: "white",
        },
      },
    },
  };

  return theme;
}
