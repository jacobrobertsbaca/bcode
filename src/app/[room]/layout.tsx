import { Container } from "@mui/material";

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Container
      maxWidth="sm"
      sx={{
        height: 1,
        flex: "1 1 auto",
        alignItems: "center",
        display: "flex",
        justifyContent: "center",
      }}
    >
      {children}
    </Container>
  );
}
