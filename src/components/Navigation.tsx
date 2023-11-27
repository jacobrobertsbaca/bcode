"use client";

import AppBar from "@mui/material/AppBar";
import Drawer from "@mui/material/Drawer";
import Toolbar from "@mui/material/Toolbar";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import React, { useCallback, useContext } from "react";
import { Box, IconButton, Stack, SvgIcon, useTheme } from "@mui/material";

import Logo from "./Logo";
import { DoorBackOutlined, LogoutRounded } from "@mui/icons-material";
import Link from "next/link";
import createClient from "@/provider/client";
import { enqueueSnackbar } from "notistack";

import MenuIcon from "@heroicons/react/24/solid/Bars3Icon";
import DarkModeIcon from "@heroicons/react/24/solid/MoonIcon";
import LightModeIcon from "@heroicons/react/24/solid/SunIcon";
import { ColorModeContext } from "./ThemeRegistry/ThemeRegistry";

const DrawerWidth = 240;
const AppBarZ = 1000;

type NavigationProps = {
  nav?: boolean;
  action?: React.ReactNode;
};

export default function Navigation({ nav, action: actions }: NavigationProps) {
  const theme = useTheme();
  const { toggleColorMode } = useContext(ColorModeContext);
  const [navOpen, setNavOpen] = React.useState(false);
  const onClose = useCallback(() => setNavOpen(false), []);
  const signOut = useCallback(async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) enqueueSnackbar(`Failed to sign out: ${error.message}`, { variant: "error" });
    onClose();
  }, []);

  return (
    <>
      <AppBar
        sx={{
          zIndex: AppBarZ,
          backgroundColor: "transparent",
          backdropFilter: "blur(6px)",
        }}
        elevation={0}
      >
        <Toolbar sx={{ backgroundColor: "transparent" }}>
          <Stack direction="row" alignItems="center" spacing={1} width={1}>
            {nav && (
              <IconButton onClick={() => setNavOpen(true)}>
                <SvgIcon>
                  <MenuIcon />
                </SvgIcon>
              </IconButton>
            )}
            {actions}
            <Box flexGrow={1} />
            <IconButton onClick={() => toggleColorMode()}>
              <SvgIcon sx={{ width: 20, height: 20, color: "background.contrast" }}>
                {theme.palette.mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
              </SvgIcon>
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>
      {nav && (
        <Drawer
          sx={{
            width: DrawerWidth,
            flexShrink: 0,
            zIndex: AppBarZ + 10,
            "& .MuiDrawer-paper": {
              width: DrawerWidth,
              boxSizing: "border-box",
              height: "auto",
              bottom: 0,
            },
          }}
          open={navOpen}
          onClose={onClose}
          anchor="left"
          variant="temporary"
          keepMounted
        >
          <Logo variant="h6" mt={2} ml={2} />
          <Divider sx={{ mt: "auto" }} />
          <List dense>
            <ListItem disablePadding>
              <ListItemButton component={Link} href="/rooms" onClick={onClose}>
                <ListItemIcon>
                  <DoorBackOutlined />
                </ListItemIcon>
                <ListItemText primary="Rooms" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={signOut}>
                <ListItemIcon>
                  <LogoutRounded />
                </ListItemIcon>
                <ListItemText primary="Sign out" />
              </ListItemButton>
            </ListItem>
          </List>
        </Drawer>
      )}
    </>
  );
}
