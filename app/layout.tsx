import type { Metadata } from "next";
import { Newsreader, Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
  variable: "--font-mono-num",
});

export const metadata: Metadata = {
  title: "KadriLex — Cabinet Juridique",
  description: "Solution de gestion pour le cabinet SCPA Kadri Legal — Niamey, Niger",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        {/* Material Symbols Outlined est self-hébergée (public/fonts/ +
            @font-face dans globals.css) : plus de dépendance runtime au
            CDN Google Fonts, qui peut être bloqué/inaccessible sur
            certains réseaux (ex. réseaux au Niger). font-display: block
            évite le flash des ligatures brutes (ex: "person_outline" en
            texte) — voir app/globals.css. */}
        {/* Anti-flash thème sombre : applique data-theme AVANT le premier render
            React. Sans ça, le mode sombre s'affiche en clair pendant ~50 ms au reload. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('kadrilex:theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${newsreader.variable} ${manrope.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <ThemeProvider>
          <AppLayout>{children}</AppLayout>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
