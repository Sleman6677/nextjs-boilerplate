import { Heebo, IBM_Plex_Sans_Arabic } from "next/font/google";

// Runway system: Helvetica/Arial from the device for Latin; neutral sans
// faces for Arabic (IBM Plex Sans Arabic) and Hebrew (Heebo, also the ₪ glyph).
const plexArabic = IBM_Plex_Sans_Arabic({ variable: "--font-plex-arabic", subsets: ["arabic"], weight: ["400", "500", "600"], display: "swap" });
const heebo = Heebo({ variable: "--font-heebo", subsets: ["hebrew"], weight: ["400", "500", "600"], display: "swap", preload: false });

/** CSS variables for every brand font; put on <html>. */
export const fontVariables = [plexArabic, heebo].map((f) => f.variable).join(" ");
