import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import "./globals.css";
import { DemoReset } from "@/components/portal/DemoReset";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Page titles in the Figma spec are "DM Sans SemiBold, opsz 14".
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Hireable",
  description: "Hiring, made human.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <TooltipProvider>
          {children}
          <DemoReset />
        </TooltipProvider>
      </body>
    </html>
  );
}
