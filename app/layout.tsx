import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Classroom Lens — Rehearse teaching, see learning",
  description: "An AI classroom simulator for K–12 STEM teachers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body suppressHydrationWarning>{children}</body></html>;
}
