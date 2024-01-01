import Logo from "@/components/Logo";
import Navigation from "@/components/navigation/Navigation";
import SignInButton from "@/components/SignInButton";
import GithubIcon from "@/components/icons/GithubIcon";
import { Container, IconButton, Stack, Typography } from "@mui/material";

export default function HomePage() {
  return (
    <Container maxWidth="sm">
      <Navigation
        action={
          <IconButton href="https://github.com/jacobrobertsbaca/bcode" target="_blank">
            <GithubIcon />
          </IconButton>
        }
      />
      <Stack alignItems="center" spacing={2}>
        <Logo />
        <Typography>create collaborative section problems for CS106A/B</Typography>
        <SignInButton />
      </Stack>
    </Container>
  );
}
