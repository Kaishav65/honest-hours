import type { Metadata, Viewport } from "next";
import { Caveat, DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  axes: ["opsz"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Honest Hours",
  description: "An honest coach for where your hours go.",
  appleWebApp: { capable: true, title: "Honest Hours", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#566e46",
};

// Sets data-theme before first paint so there's no light/dark flash.
// "hh-theme" = "light" | "dark" | "system" (follow the computer) | missing (light by default).
const themeScript = `(function(){try{var t=localStorage.getItem("hh-theme");if(t==="system"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}else if(t!=="dark"){t="light"}document.documentElement.dataset.theme=t}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${fraunces.variable} ${dmSans.variable} ${caveat.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
