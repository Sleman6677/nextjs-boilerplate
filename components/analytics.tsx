import Script from "next/script";

const gaId = () => process.env.NEXT_PUBLIC_GA_ID?.replace(/[^A-Z0-9-]/gi, "") || null;
const pixelId = () => process.env.NEXT_PUBLIC_META_PIXEL_ID?.replace(/\D/g, "") || null;

/**
 * Inline init stubs for <head>: Google Analytics 4 (NEXT_PUBLIC_GA_ID) and Meta Pixel (NEXT_PUBLIC_META_PIXEL_ID).
 * They run before hydration, so events from the first render are queued; nothing loads without the IDs.
 */
export function AnalyticsHead() {
  const ga = gaId();
  const pixel = pixelId();
  const code = [
    ga ? `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${ga}');` : "",
    pixel
      ? `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`
      : "",
  ].join("");
  return code ? <script dangerouslySetInnerHTML={{ __html: code }} /> : null;
}

/** Loads the Google tag library after the page is interactive. */
export function Analytics() {
  const ga = gaId();
  return ga ? <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" /> : null;
}
