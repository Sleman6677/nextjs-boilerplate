import { Amiri, Frank_Ruhl_Libre, Heebo, IBM_Plex_Sans_Arabic, Italiana, Outfit } from "next/font/google";

// Cinematic system: Italiana (display) + Outfit (body) for Latin; Amiri and
// IBM Plex Sans Arabic for Arabic; Frank Ruhl Libre and Heebo for Hebrew
// (Heebo also supplies the ₪ glyph).
const italiana = Italiana({ variable: "--font-italiana", subsets: ["latin"], weight: "400", display: "swap" });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], weight: ["300", "400", "600"], display: "swap" });
const amiri = Amiri({ variable: "--font-amiri", subsets: ["arabic"], weight: ["400"], display: "swap" });
const plexArabic = IBM_Plex_Sans_Arabic({ variable: "--font-plex-arabic", subsets: ["arabic"], weight: ["300", "400", "600"], display: "swap" });
const frank = Frank_Ruhl_Libre({ variable: "--font-frank", subsets: ["hebrew"], weight: ["400"], display: "swap", preload: false });
const heebo = Heebo({ variable: "--font-heebo", subsets: ["hebrew"], weight: ["300", "400", "600"], display: "swap", preload: false });

/** CSS variables for every brand font; put on <html>. */
export const fontVariables = [italiana, outfit, amiri, plexArabic, frank, heebo].map((f) => f.variable).join(" ");
