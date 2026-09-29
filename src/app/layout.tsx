import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import "./globals.css";
import { DemoReset } from "@/components/portal/demo-reset";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Page titles are DM Sans SemiBold at opsz 14, so the optical-size axis is loaded.
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
          {/* The laptop UI scale (globals.css .ui-zoom); portalled popups scale themselves. */}
          <div className="ui-zoom flex min-h-full flex-1 flex-col">{children}</div>
          <DemoReset />
        </TooltipProvider>
      </body>
    </html>
  );
}
