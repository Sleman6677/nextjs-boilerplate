import Script from "next/script";

/**
 * Google Analytics 4 (NEXT_PUBLIC_GA_ID) and Meta Pixel (NEXT_PUBLIC_META_PIXEL_ID); nothing loads without them.
 * The tiny init stubs run before hydration so events from the first render are queued, not lost.
 */
export function Analytics() {
  const ga = process.env.NEXT_PUBLIC_GA_ID?.replace(/[^A-Z0-9-]/gi, "");
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID?.replace(/\D/g, "");
  return (
    <>
      {ga ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="beforeInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${ga}');`}</Script>
        </>
      ) : null}
      {pixel ? (
        <Script id="meta-pixel" strategy="beforeInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}</Script>
      ) : null}
    </>
  );
}
