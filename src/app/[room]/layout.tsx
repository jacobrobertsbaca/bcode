import Navigation from "@/components/navigation/Navigation";

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      {children}
    </>
  );
}
