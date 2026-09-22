import type { Metadata } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Post Studio",
  description: "Draft a post with Claude, attach a photo, and publish to LinkedIn or Facebook.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-[#f3f2ef] font-sans text-[#191919]">
        <div className="flex flex-1 flex-col">{children}</div>
        <footer className="px-4 py-6 text-center text-xs text-[#666]">
          <Link href="/privacy" className="underline-offset-2 hover:underline">
            Privacy
          </Link>
        </footer>
      </body>
    </html>
  );
}
