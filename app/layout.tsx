import type { Metadata } from "next";
import { DM_Sans, Inter, Playfair_Display, Source_Serif_4 } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["700", "900"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["300", "400"],
});

const bogueBlack = localFont({
  src: "./fonts/Bogue-Black.ttf",
  variable: "--font-bogue",
  weight: "900",
});

export const metadata: Metadata = {
  title: "Study the moment",
  description: "Watch annotated capoeira jogos with expert insights",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${dmSans.variable} ${playfair.variable} ${sourceSerif.variable} ${bogueBlack.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
