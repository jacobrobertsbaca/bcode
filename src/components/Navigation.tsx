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
import React from "react";
import { IconButton, SvgIcon } from "@mui/material";

import RoomsIcon from "@heroicons/react/24/outline/CommandLineIcon";
import SignOutIcon from "@heroicons/react/24/outline/ArrowLeftCircleIcon";
import MenuIcon from "@heroicons/react/24/solid/Bars3Icon";

const DrawerWidth = 240;
const AppBarZ = 1000;

const PlaceholderLinks = [
  { text: "Rooms", icon: RoomsIcon },
  { text: "Logout", icon: SignOutIcon },
];

export default function Navigation() {
  const [navOpen, setNavOpen] = React.useState(false);
  return (
    <>
      <AppBar
        sx={{
          zIndex: AppBarZ,
          backgroundColor: "transparent",
          backdropFilter: "blur(6px)"
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
        keepMounted
      >
        <Divider sx={{ mt: "auto" }} />
        <List>
          {PlaceholderLinks.map(({ text, icon: Icon }) => (
            <ListItem key={text} disablePadding>
              <ListItemButton>
                <ListItemIcon>
                  <SvgIcon>
                    <Icon />
                  </SvgIcon>
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
