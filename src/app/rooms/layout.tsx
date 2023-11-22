import Navigation from "@/components/Navigation";
import createServer from "@/provider/server";
import { Box } from "@mui/material";
import { redirect } from "next/navigation";

/**
 * Generate layout for the host view.
 * Note that all rooms descending from this route are auth-protected.
 */
export default async function RoomsLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  return (
    <Box>
      <Navigation />
      {children}
    </Box>
  );
}
