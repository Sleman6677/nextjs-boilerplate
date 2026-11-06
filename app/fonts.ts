import { Amiri, Aref_Ruqaa, Cormorant_Garamond, Frank_Ruhl_Libre, Heebo, Noto_Sans_Arabic } from "next/font/google";

const cormorant = Cormorant_Garamond({ variable: "--font-cormorant", subsets: ["latin"], weight: ["300", "400", "500", "600"], style: ["normal", "italic"], display: "swap" });
const amiri = Amiri({ variable: "--font-amiri", subsets: ["arabic"], weight: ["400", "700"], display: "swap" });
const notoArabic = Noto_Sans_Arabic({ variable: "--font-noto-arabic", subsets: ["arabic", "latin"], display: "swap" });
const ruqaa = Aref_Ruqaa({ variable: "--font-ruqaa", subsets: ["arabic"], weight: ["400", "700"], display: "swap" });
// Hebrew: Frank Ruhl Libre (display) and Heebo (body). Also provide the ₪ glyph the other fonts lack.
const frank = Frank_Ruhl_Libre({ variable: "--font-frank", subsets: ["hebrew"], weight: ["400", "500"], display: "swap", preload: false });
const heebo = Heebo({ variable: "--font-heebo", subsets: ["hebrew"], weight: ["400", "500", "600", "700"], display: "swap", preload: false });

/** CSS variables for every brand font; put on <html>. */
export const fontVariables = [cormorant, amiri, notoArabic, ruqaa, frank, heebo].map((f) => f.variable).join(" ");
