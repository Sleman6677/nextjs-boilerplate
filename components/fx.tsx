"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import GlareHover from "./GlareHover";
import Magnet from "./Magnet";

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
    <GlareHover width="100%" height="auto" background="transparent" borderRadius="15px" glareColor="#ffffff" glareOpacity={0.5} glareSize={220} variant="sheen" className="!block !border-0 ![place-items:normal]">
      {children}
    </GlareHover>
  );
}
