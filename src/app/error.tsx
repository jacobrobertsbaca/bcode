"use client";

import { Link, Stack, Typography } from "@mui/material";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Stack spacing={2}>
      <Typography variant="h3">Oops...</Typography>
      <Typography>
        Something went wrong. Click{" "}
        <Link display="inline" href="#" onClick={reset}>
          here
        </Link>{" "}
        to try again.
      </Typography>
    </Stack>
  );
}
