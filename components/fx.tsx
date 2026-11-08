"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import ClickSpark from "./ClickSpark";
import GlareHover from "./GlareHover";
import Magnet from "./Magnet";
import ScrollReveal from "./ScrollReveal";
import ShinyText from "./ShinyText";

/* Site-tuned wrappers around the React Bits components, so pages (server
   components) can use them without repeating brand colours or motion checks. */

const QUERY = "(prefers-reduced-motion: reduce)";
function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}

/** A fan of lash strokes flicks up wherever the visitor clicks inside the page content. */
export function SiteSpark({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <ClickSpark shape="line" sparkColor={["#4b1530", "#8a2a55", "#c9a45c"]} sparkSize={11} sparkRadius={24} sparkCount={11} sparkWidth={1.6} direction={0} spread={150} gravity={0} randomness={0.15} duration={560} disabled={reduce} className="!h-auto">
      {children}
    </ClickSpark>
  );
}

/** A light band that sweeps across the text now and then. */
export function Shiny({ children, color = "#eda4b6", shine = "#fbf7f1" }: { children: string; color?: string; shine?: string }) {
  const reduce = useReducedMotion();
  return <ShinyText text={children} color={color} shineColor={shine} speed={3} delay={2} disabled={reduce} />;
}

/** Pulls its child towards the pointer when it comes near. */
export function MagnetLink({ children, strength = 4 }: { children: ReactNode; strength?: number }) {
  const reduce = useReducedMotion();
  return (
    <Magnet padding={70} magnetStrength={strength} disabled={reduce}>
      {children}
    </Magnet>
  );
}

/** A glossy sweep across a product photo on hover. */
export function Glare({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <GlareHover width="100%" height="auto" background="transparent" borderRadius="1.6rem" glareColor="#ffffff" glareOpacity={0.35} glareSize={220} variant="sheen" className="!block !border-0 ![place-items:normal]">
      {children}
    </GlareHover>
  );
}

/** A paragraph whose words light up as it scrolls through the viewport. */
export function Statement({ children, className = "" }: { children: string; className?: string }) {
  return (
    <ScrollReveal as="p" wordAnimationEnd="bottom 55%" baseOpacity={0.15} enableBlur blurStrength={3} baseRotation={0} containerClassName={`!my-0 ${className}`} textClassName="!text-[length:inherit] !leading-[inherit] !font-[inherit]">
      {children}
    </ScrollReveal>
  );
}
