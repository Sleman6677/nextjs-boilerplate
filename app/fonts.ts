import { Albert_Sans, Cormorant_Garamond, Heebo, Readex_Pro } from "next/font/google";

// Kohl world: one quiet sans in two weights per script. Albert Sans (Latin, dealt
// by taste-skill for a consumer product), Readex Pro (Arabic, same calm geometry),
// Heebo (Hebrew; also the ₪ glyph).
const albert = Albert_Sans({ variable: "--font-albert", subsets: ["latin"], weight: ["400", "500"], display: "swap" });
const readex = Readex_Pro({ variable: "--font-readex", subsets: ["arabic", "latin"], weight: ["400", "500"], display: "swap" });
// The wordmark only: the serif printed on the Serag Lashes box.
const wordmark = Cormorant_Garamond({ variable: "--font-wordmark", subsets: ["latin"], weight: "600", display: "swap" });
const heebo = Heebo({ variable: "--font-heebo", subsets: ["hebrew"], weight: ["400", "500"], display: "swap", preload: false });

/** CSS variables for every brand font; put on <html>. */
export const fontVariables = [albert, readex, wordmark, heebo].map((f) => f.variable).join(" ");
