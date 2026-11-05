import type { Metadata, Viewport } from "next";
import { Amiri, Aref_Ruqaa, Cormorant_Garamond, Frank_Ruhl_Libre, Noto_Sans_Arabic } from "next/font/google";
import { AnnouncementBar, Footer, WhatsAppFloat } from "@/components/chrome";
import { Header } from "@/components/header";
import { site } from "@/lib/site";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic", "latin"],
  display: "swap",
});

const ruqaa = Aref_Ruqaa({
  variable: "--font-ruqaa",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
});

// Fallback for the shekel sign (₪), which the brand fonts lack. Only downloaded where ₪ appears.
const frank = Frank_Ruhl_Libre({
  variable: "--font-frank",
  subsets: ["hebrew"],
  weight: ["400", "500"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    template: `%s | ${site.name} · ${site.nameAr}`,
    default: `${site.name} · ${site.nameAr} — ${site.tagline}`,
  },
  description: site.description,
  openGraph: {
    title: `${site.name} · ${site.nameAr}`,
    description: site.description,
    locale: "ar_AR",
    type: "website",
    siteName: site.name,
  },
};

export const viewport: Viewport = {
  themeColor: "#14100e",
};

// Enables scroll-reveal styles before first paint (no flash), unless the visitor prefers reduced motion.
const motionScript = `try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.motion='on'}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${cormorant.variable} ${amiri.variable} ${notoArabic.variable} ${ruqaa.variable} ${frank.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionScript }} />
      </head>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:right-3 focus:z-[70] focus:rounded-full focus:bg-gold focus:px-5 focus:py-3 focus:text-ink"
        >
          تخطّي إلى المحتوى
        </a>
        <div className="scroll-progress fixed inset-x-0 top-0 z-[70] h-[2px] origin-right bg-gradient-to-l from-gold-soft via-gold to-gold-deep" aria-hidden="true" />
        <AnnouncementBar />
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <WhatsAppFloat />
      </body>
    </html>
  );
}
