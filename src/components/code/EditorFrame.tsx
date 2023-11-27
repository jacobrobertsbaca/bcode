"use client";

import { Card, CardProps } from "@mui/material";

export default function EditorFrame({ sx, ...rest }: CardProps) {
  return (
    <Card
      sx={{
        border: (theme) => `1px solid ${theme.palette.divider}`,
        backgroundColor: (theme) => theme.palette.editor.main,
        position: "relative",
        minHeight: "400px",
        ...sx,
      }}
      elevation={0}
      {...rest}
    >
      {rest.children}
    </Card>
  );
}
