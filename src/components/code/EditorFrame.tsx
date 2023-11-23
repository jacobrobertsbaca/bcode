import { Card, CardProps } from "@mui/material";

export default function EditorFrame({ sx, ...rest }: CardProps) {
  return (
    <Card
      sx={{
        border: "1px solid #0001",
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
