import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Analytics, AnalyticsHead } from "@/components/analytics";
import { AnnouncementBar, Footer, WhatsAppFloat } from "@/components/chrome";
import { Header } from "@/components/header";
import { SmoothScroll } from "@/components/smooth-scroll";
import { MotionFx } from "@/components/motion-fx";
import { BronzeStage } from "@/components/bronze-stage";
import { CinemaOverlay } from "@/components/cinema-overlay";
import { SiteSpark } from "@/components/fx";
import { StoreProvider } from "@/components/shop/store-provider";
import { Toaster } from "@/components/shop/toast";
import { I18nProvider } from "@/components/i18n-provider";
import { dir, isLocale, locales } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { siteUrl } from "@/lib/site-url";
import { getStoreInfo } from "@/lib/social";
import { accountsEnabled } from "@/lib/supabase/config";
import { fontVariables } from "../fonts";
import "../globals.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = getDictionary(lang);
  return {
    metadataBase: new URL(siteUrl()),
    title: { template: dict.meta.template, default: dict.meta.title },
    description: dict.meta.description,
    alternates: { languages: { ar: "/ar", he: "/he", en: "/en" } },
    openGraph: { title: dict.meta.title, description: dict.meta.description, locale: lang === "ar" ? "ar_AR" : lang === "he" ? "he_IL" : "en_US", type: "website", siteName: "Serag Lashes" },
  };
}

export const viewport: Viewport = { themeColor: "#000000" };

// Enables scroll-reveal styles before first paint (no flash), unless the visitor prefers reduced motion.
const motionScript = `try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.motion='on'}catch(e){}`;

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const info = await getStoreInfo();
  const accounts = accountsEnabled();

  return (
    <html
      lang={lang}
      dir={dir(lang)}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={fontVariables}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionScript }} />
        <AnalyticsHead />
      </head>
      <body className="min-h-dvh">
        <BronzeStage />
        <CinemaOverlay />
        <I18nProvider lang={lang} dict={dict}>
          <StoreProvider lang={lang} enabled={accounts}>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[70] focus:rounded-full focus:bg-gold focus:px-5 focus:py-3 focus:text-ink">
            {dict.nav.skip}
          </a>
          <div className="scroll-progress fixed inset-x-0 top-0 z-[70] h-[2px] bg-gradient-to-l from-gold-soft via-gold to-gold-deep" aria-hidden="true" />
          <AnnouncementBar lang={lang} info={info} />
          <Header accounts={accounts} social={{ instagram: info.instagram, tiktok: info.tiktok, whatsapp: info.whatsapp }} />
          <SiteSpark>
            <main id="main">{children}</main>
          </SiteSpark>
          <Footer lang={lang} info={info} />
          <WhatsAppFloat lang={lang} info={info} />
          <Toaster />
          <SmoothScroll />
          <MotionFx />
          <Analytics />
          </StoreProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
