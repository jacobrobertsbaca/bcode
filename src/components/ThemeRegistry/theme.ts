import { createTheme } from '@mui/material/styles';
import { jakarta } from './fonts';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: "rgba(0, 0, 0, 0.6)" },
    text: {
      primary: "rgba(0, 0, 0, 0.6)",
      secondary: "rgba(0, 0, 0, 0.26)"
    }
  },
  typography: {
    fontFamily: jakarta.style.fontFamily,
  },
  components: {
    MuiAlert: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          ...(ownerState.severity === 'info' && {
            backgroundColor: '#60a5fa',
          }),
        }),
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none"
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          boxShadow: "0 2px 6px rgba(0,0,0,.05)",
          borderRadius: "10px",
          ["&.Mui-focused"]: {
            ["& .MuiOutlinedInput-notchedOutline"]: {
              borderWidth: 1
            }
          }
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 500
        }
      }
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          borderRadius: "10px !important"
        }
      }
    },
    MuiSlider: {
      styleOverrides: {
        thumb: {
          color: "rgba(80, 80, 80, 1)"
        }
      }
    }
  },
});

export default theme;
