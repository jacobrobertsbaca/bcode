import Navigation from "@/components/Navigation";
import { Container } from "@mui/material";

export default function RoomsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Container
      maxWidth="md"
    >
      <Navigation />
      {children}
    </Container>
  );
}
