import Navigation from "@/components/Navigation";

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      {children}
    </>
  );
}
