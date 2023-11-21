import { Container } from "@mui/material";

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Container maxWidth="sm">
      {children}
    </Container>
  );
}
