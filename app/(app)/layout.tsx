import Shell from "@/components/Shell";

/**
 * Everything behind the nav. Kept as a route group so a sign-in screen can be
 * added later without the sidebar wrapping it.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <Shell>{children}</Shell>;
}
