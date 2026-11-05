/**
 * Business settings and catalogue structure (language-independent).
 * All visible text lives in lib/i18n/dictionaries/{ar,he,en}.ts.
 * Values marked TODO are placeholders to replace before launch.
 */

import type { LashMap, LashStyle } from "./lash";

export const site = {
  name: "Serag Lashes",
  // WhatsApp in international format, digits only (0537725568 -> 972537725568)
  whatsapp: "972537725568",
  phoneDisplay: "+972 53 772 5568",
  // TODO: the real account names
  instagram: "seraglashes",
  tiktok: "seraglashes",
  offerCode: "SERAG20",
  currency: "₪",
} as const;

export const navItems = [
  { href: "/", key: "home" },
  { href: "/services", key: "services" },
  { href: "/gallery", key: "gallery" },
  { href: "/shop", key: "shop" },
  { href: "/about", key: "about" },
] as const;

export type ServiceId = "classic" | "hybrid" | "volume" | "mega" | "wet" | "lift";

/** TODO: real prices (₪). */
export const services: { id: ServiceId; latin: string; style: LashStyle; map: LashMap; price: number; featured?: boolean }[] = [
  { id: "classic", latin: "Classic", style: "classic", map: "natural", price: 40 },
  { id: "hybrid", latin: "Hybrid", style: "hybrid", map: "squirrel", price: 50, featured: true },
  { id: "volume", latin: "Volume", style: "volume", map: "cat", price: 60 },
  { id: "mega", latin: "Mega Volume", style: "mega", map: "doll", price: 75 },
  { id: "wet", latin: "Wet Look", style: "wet", map: "natural", price: 55 },
  { id: "lift", latin: "Lash Lift & Tint", style: "lift", map: "natural", price: 35 },
];

export const extras = [
  { id: "refill2", price: 25 },
  { id: "refill3", price: 30 },
  { id: "removal", price: 10 },
] as const;

export const lashMapIds: { id: LashMap; latin: string }[] = [
  { id: "natural", latin: "Natural" },
  { id: "cat", latin: "Cat Eye" },
  { id: "doll", latin: "Doll Eye" },
  { id: "squirrel", latin: "Squirrel" },
];

export const facts = [{ value: 4 }, { value: 3 }, { value: 100, percent: true }, { value: 180 }];

export type GalleryItem = {
  id: "g1" | "g2" | "g3" | "g4" | "g5" | "g6" | "g7" | "g8" | "g9";
  style: LashStyle;
  map: LashMap;
  tone: "ink" | "cream" | "blush" | "sand";
  /** Path to a real photo of your work (e.g. "/gallery/hybrid-01.jpg") to show instead of the drawing */
  image?: string;
};

export const gallery: GalleryItem[] = [
  { id: "g1", style: "hybrid", map: "squirrel", tone: "ink" },
  { id: "g2", style: "classic", map: "natural", tone: "cream" },
  { id: "g3", style: "volume", map: "cat", tone: "blush" },
  { id: "g4", style: "mega", map: "doll", tone: "sand" },
  { id: "g5", style: "wet", map: "natural", tone: "ink" },
  { id: "g6", style: "lift", map: "natural", tone: "cream" },
  { id: "g7", style: "volume", map: "doll", tone: "sand" },
  { id: "g8", style: "hybrid", map: "cat", tone: "blush" },
  { id: "g9", style: "classic", map: "squirrel", tone: "ink" },
];

/* ───────────── Shop ───────────── */

export const shop = {
  currency: "₪",
  /** Price of one box in shekels */
  boxPrice: 200,
};

/** Bit manual transfer (the PayPlus card flow is configured through environment variables). */
export const payments = {
  bit: { phone: "0537725568", display: "053-772-5568" },
};

export type BoxId = "daily-natural" | "wispy" | "doll" | "cat" | "soft-volume" | "glam";

export type LashBox = {
  id: BoxId;
  latin: string;
  style: LashStyle;
  map: LashMap;
  tone: "petal" | "rose" | "blush" | "berry";
};

export const lashBoxes: LashBox[] = [
  { id: "daily-natural", latin: "Daily Natural", style: "classic", map: "natural", tone: "petal" },
  { id: "wispy", latin: "Wispy", style: "wet", map: "squirrel", tone: "rose" },
  { id: "doll", latin: "Doll Eye", style: "hybrid", map: "doll", tone: "blush" },
  { id: "cat", latin: "Cat Eye", style: "hybrid", map: "cat", tone: "berry" },
  { id: "soft-volume", latin: "Soft Volume", style: "volume", map: "squirrel", tone: "rose" },
  { id: "glam", latin: "Glam Night", style: "mega", map: "doll", tone: "petal" },
];

export function whatsappLink(text?: string): string {
  const base = `https://wa.me/${site.whatsapp}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
