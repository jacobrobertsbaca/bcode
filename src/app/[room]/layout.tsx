import { Container } from "@mui/material";

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Container
      maxWidth="md"
      sx={{
        minHeight: 1,
        alignItems: "center",
        display: "flex",
        justifyContent: "center"
      }}
    >
      {children}
    </Container>
  );
}
