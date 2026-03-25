import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { Manrope, Space_Grotesk } from "next/font/google";
import IframeHostSync from "../components/iframe-host-sync";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata = {
  title: "Fence Estimator",
  description: "Fence quote tool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>
        <IframeHostSync />
        {children}
      </body>
    </html>
  );
}
