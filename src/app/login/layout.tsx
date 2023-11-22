import { Container } from "@mui/material";

export default async function RoomLayout({
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
