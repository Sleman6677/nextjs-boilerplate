"use client";

import { useEffect, useRef, useState } from "react";
import { ReactLenis, useLenis, type LenisRef } from "lenis/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "lenis/dist/lenis.css";

gsap.registerPlugin(ScrollTrigger);

/** Tells ScrollTrigger about every Lenis scroll frame. */
function TriggerSync() {
  useLenis(ScrollTrigger.update);
  return null;
}

/**
 * Site-wide smooth scrolling (Lenis), driven by GSAP's ticker so every
 * ScrollTrigger effect moves in the same frame as the scroll itself.
 * Skipped for visitors who prefer reduced motion.
 */
export function SmoothScroll() {
  const [on, setOn] = useState(false);
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setOn(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!on) return;
    const update = (time: number) => lenisRef.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(update);
      gsap.ticker.lagSmoothing(500, 33);
    };
  }, [on]);

  if (!on) return null;
  return (
    <>
      <ReactLenis root ref={lenisRef} options={{ autoRaf: false, anchors: true, lerp: 0.09 }} />
      <TriggerSync />
    </>
  );
}
