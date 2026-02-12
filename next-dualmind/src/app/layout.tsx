import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DualMind - Battle Arena",
  description: "DualMind - AI Battle Arena for comparing language models",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* Favicon */}
        <link
          rel="icon"
          type="image/svg+xml"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 21 21'><rect width='9' height='9' rx='1' fill='%23577B87'/><rect x='12' width='9' height='9' rx='1' fill='%234AABC2'/><rect x='12' y='12' width='9' height='9' rx='1' fill='%23CB9275'/><rect y='12' width='9' height='9' rx='1' fill='%23FDF4CD'/></svg>"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
