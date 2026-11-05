import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Amiri, Aref_Ruqaa, Cormorant_Garamond, Frank_Ruhl_Libre, Heebo, Noto_Sans_Arabic } from "next/font/google";
import { AnnouncementBar, Footer, WhatsAppFloat } from "@/components/chrome";
import { Header } from "@/components/header";
import { I18nProvider } from "@/components/i18n-provider";
import { dir, isLocale, locales } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { accountsEnabled } from "@/lib/supabase/config";
import "../globals.css";

const cormorant = Cormorant_Garamond({ variable: "--font-cormorant", subsets: ["latin"], weight: ["300", "400", "500", "600"], style: ["normal", "italic"], display: "swap" });
const amiri = Amiri({ variable: "--font-amiri", subsets: ["arabic"], weight: ["400", "700"], display: "swap" });
const notoArabic = Noto_Sans_Arabic({ variable: "--font-noto-arabic", subsets: ["arabic", "latin"], display: "swap" });
const ruqaa = Aref_Ruqaa({ variable: "--font-ruqaa", subsets: ["arabic"], weight: ["400", "700"], display: "swap" });
// Hebrew: Frank Ruhl Libre (display) and Heebo (body). Also provide the ₪ glyph the other fonts lack.
const frank = Frank_Ruhl_Libre({ variable: "--font-frank", subsets: ["hebrew"], weight: ["400", "500"], display: "swap", preload: false });
const heebo = Heebo({ variable: "--font-heebo", subsets: ["hebrew"], weight: ["400", "500", "600", "700"], display: "swap", preload: false });

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = getDictionary(lang);
  return {
    title: { template: dict.meta.template, default: dict.meta.title },
    description: dict.meta.description,
    alternates: { languages: { ar: "/ar", he: "/he", en: "/en" } },
    openGraph: { title: dict.meta.title, description: dict.meta.description, locale: lang === "ar" ? "ar_AR" : lang === "he" ? "he_IL" : "en_US", type: "website", siteName: "Serag Lashes" },
  };
}

export const viewport: Viewport = { themeColor: "#14100e" };

// Enables scroll-reveal styles before first paint (no flash), unless the visitor prefers reduced motion.
const motionScript = `try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.motion='on'}catch(e){}`;

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <html
      lang={lang}
      dir={dir(lang)}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${cormorant.variable} ${amiri.variable} ${notoArabic.variable} ${ruqaa.variable} ${frank.variable} ${heebo.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionScript }} />
      </head>
      <body className="min-h-dvh">
        <I18nProvider lang={lang} dict={dict}>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[70] focus:rounded-full focus:bg-gold focus:px-5 focus:py-3 focus:text-ink">
            {dict.nav.skip}
          </a>
          <div className="scroll-progress fixed inset-x-0 top-0 z-[70] h-[2px] bg-gradient-to-l from-gold-soft via-gold to-gold-deep" aria-hidden="true" />
          <AnnouncementBar lang={lang} />
          <Header accounts={accountsEnabled()} />
          <main id="main">{children}</main>
          <Footer lang={lang} />
          <WhatsAppFloat lang={lang} />
        </I18nProvider>
      </body>
    </html>
  );
}
