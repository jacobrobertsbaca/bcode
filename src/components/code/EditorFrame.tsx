"use client";

import { Card, CardProps } from "@mui/material";

export type EditorFrameProps = CardProps;

export default function EditorFrame({ sx = [], children, ...rest }: EditorFrameProps) {
  return (
    <Card
      sx={[
        {
          border: (theme) => `1px solid ${theme.palette.divider}`,
          backgroundColor: (theme) => theme.palette.editor.main,
          position: "relative",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      elevation={0}
      {...rest}
    >
      {children}
    </Card>
  );
}
