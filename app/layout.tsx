import type { Metadata } from "next";
import "./mobile.css";
import "./reading.css";
import "./experience.css";
import "./theatre.css";
import "./active-motion.css";
import "./chat-frame.css";

export const metadata: Metadata = {
  title: "사이 — 오늘의 세상, 두 개의 시선",
  description: "오늘의 뉴스 5개. 서로 다른 시선으로 이해하고, 당신의 생각을 남겨요.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "사이", statusBarStyle: "default" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/icon-180.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
