import Navigation from "@/components/Navigation";
import { Box } from "@mui/material";

export default function RoomsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box>
      <Navigation />
      {children}
    </Box>
  );
}
