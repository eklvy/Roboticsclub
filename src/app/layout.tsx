import type { Metadata } from "next";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "ROBO–LOCKDOWN | NEXUS–09",
  description:
    "The system is compromised. Your escape begins now. An immersive six-sector robotic escape room.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* Extensions such as Grammarly add body attributes before hydration.
          Scope this exception to the body; descendants retain hydration checks. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
