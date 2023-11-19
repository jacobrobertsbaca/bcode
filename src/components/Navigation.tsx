"use client";

import Link from "next/link";
import AppBar from "@mui/material/AppBar";
import Drawer from "@mui/material/Drawer";
import Toolbar from "@mui/material/Toolbar";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuIcon from '@heroicons/react/24/solid/Bars3Icon';
import HomeIcon from "@mui/icons-material/Home";
import StarIcon from "@mui/icons-material/Star";
import ChecklistIcon from "@mui/icons-material/Checklist";
import SettingsIcon from "@mui/icons-material/Settings";
import SupportIcon from "@mui/icons-material/Support";
import LogoutIcon from "@mui/icons-material/Logout";
import React from "react";
import { IconButton, SvgIcon } from "@mui/material";

const DrawerWidth = 240;
const AppBarZ = 2000;

const PlaceholderLinks = [
  { text: "Settings", icon: SettingsIcon },
  { text: "Support", icon: SupportIcon },
  { text: "Logout", icon: LogoutIcon },
];

export default function Navigation() {
  const [navOpen, setNavOpen] = React.useState(false);
  return (
    <>
      <AppBar
        sx={{
          zIndex: AppBarZ,
          backdropFilter: "blur(6px)",
          backgroundColor: "#ffffffaa",
        }}
        elevation={0}
      >
        <Toolbar sx={{ backgroundColor: "transparent" }}>
          <IconButton onClick={() => setNavOpen(true)}>
            <SvgIcon>
              <MenuIcon />
            </SvgIcon>
          </IconButton>
        </Toolbar>
      </AppBar>
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
        onClose={() => setNavOpen(false)}
        anchor="left"
        variant="temporary"
      >
        <Divider sx={{ mt: "auto" }} />
        <List>
          {PlaceholderLinks.map(({ text, icon: Icon }) => (
            <ListItem key={text} disablePadding>
              <ListItemButton>
                <ListItemIcon>
                  <Icon />
                </ListItemIcon>
                <ListItemText primary={text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
    </>
  );
}
