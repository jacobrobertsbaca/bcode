import { Link, Stack, Typography } from "@mui/material";

export default function NotFound() {
  return (
    <Stack spacing={2}>
      <Typography variant="h3">404</Typography>
      <Typography>
        The page you were looking for couldn't be found.
        {" "}
        <Link display="inline" href="/">
          Go home?
        </Link>
      </Typography>
    </Stack>
  );
}
