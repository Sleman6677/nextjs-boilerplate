"use client";

import { useEffect, useState } from "react";
import { ReactLenis } from "lenis/react";
import "lenis/dist/lenis.css";

/** Site-wide smooth scrolling (Lenis); skipped for visitors who prefer reduced motion. */
export function SmoothScroll() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setOn(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return on ? <ReactLenis root options={{ anchors: true }} /> : null;
}
