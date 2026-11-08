import { Heebo, IBM_Plex_Sans_Arabic, Onest } from "next/font/google";

// Editorial system: one thin sans per script. Onest (Latin), IBM Plex Sans
// Arabic and Heebo (Hebrew, also supplies the ₪ glyph) all ship 200 weights
// for the whisper-thin display type.
const onest = Onest({ variable: "--font-onest", subsets: ["latin"], weight: ["200", "300", "400", "500", "600"], display: "swap" });
const plexArabic = IBM_Plex_Sans_Arabic({ variable: "--font-plex-arabic", subsets: ["arabic"], weight: ["200", "300", "400", "500", "600"], display: "swap" });
const heebo = Heebo({ variable: "--font-heebo", subsets: ["hebrew"], weight: ["200", "300", "400", "500", "600"], display: "swap", preload: false });

/** CSS variables for every brand font; put on <html>. */
export const fontVariables = [onest, plexArabic, heebo].map((f) => f.variable).join(" ");
