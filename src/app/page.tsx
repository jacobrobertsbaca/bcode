import Logo from "@/components/Logo";
import SignInButton from "@/components/SignInButton";
import { AppBar, Container, IconButton, Stack, Toolbar, Typography } from "@mui/material";
import Image from "next/image";

function LoginToolbar() {
  return (
    <AppBar
      sx={{
        zIndex: 2000,
        backdropFilter: "blur(6px)",
        backgroundColor: "#ffffffaa",
      }}
      elevation={0}
    >
      <Toolbar sx={{ backgroundColor: "transparent" }}>
        <IconButton href="https://github.com/jacobrobertsbaca/bcode" target="_blank">
          <Image alt="GitHub Logo" width={20} height={20} src="/github.svg" />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}

export default function HomePage() {
  return (
    <Container maxWidth="sm">
      <LoginToolbar />
      <Stack alignItems="center" spacing={2}>
        <Logo />
        <Typography>create collaborative section problems for CS106B</Typography>
        <SignInButton />
      </Stack>
    </Container>
  );
}
