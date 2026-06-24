import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mustafa Edu",
  description: "Application de gestion éducative",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
