import { AppBar, Button, Container, IconButton, Stack, Toolbar, Typography } from "@mui/material";
import Image from "next/image";

const GitHubIcon = () => (
  <Image
    alt="GitHub Logo"
    width={20}
    height={20}
    src="/github.svg"
    style={{
      filter: "grayscale(1)",
    }}
  />
);

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
        <IconButton href="https://github.com/jacobrobertsbaca/bcode">
          <GitHubIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}

export default function HomePage() {
  return (
    <Container maxWidth="lg">
      <LoginToolbar />
      <Stack alignItems="center" spacing={2}>
        <Typography variant="h3" fontWeight={300}>
          <Typography variant="inherit" display="inline">
            b
          </Typography>
          <Typography variant="inherit" display="inline" color="text.secondary">
            code
          </Typography>
          <Typography
            variant="inherit"
            display="inline"
            color="text.secondary"
            sx={{
              "@keyframes blinking": {
                "50%": { opacity: 0 },
              },
              animation: "blinking 1s ease-in-out infinite",
            }}
          >
            _
          </Typography>
        </Typography>
        <Typography>create collaborative section problems for CS106B</Typography>
        <Button variant="text" fullWidth startIcon={<GitHubIcon />}>
          Continue with GitHub
        </Button>
      </Stack>
    </Container>
  );
}
