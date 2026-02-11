import type { Metadata, Viewport } from "next"
import { Outfit, JetBrains_Mono } from "next/font/google"
import "./globals.css"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
})

export const metadata: Metadata = {
  title: "DualMind - AI Battle Arena",
  description:
    "Compare AI models side-by-side in blind battles. Vote for better responses and shape the leaderboard.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 21 21'><rect width='9' height='9' rx='1' fill='%23577B87'/><rect x='12' width='9' height='9' rx='1' fill='%234AABC2'/><rect x='12' y='12' width='9' height='9' rx='1' fill='%23CB9275'/><rect y='12' width='9' height='9' rx='1' fill='%23FDF4CD'/></svg>",
  },
}

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${outfit.variable} ${jetbrainsMono.variable} font-sans`}>
        {children}
      </body>
    </html>
  )
}
