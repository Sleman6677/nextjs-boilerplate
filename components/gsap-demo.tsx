"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function GsapDemo() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return;
      gsap.from(".box", { opacity: 0, y: 40, stagger: 0.12, duration: 0.7, ease: "power3.out" });
    },
    { scope: container },
  );

  const { contextSafe } = useGSAP({ scope: container });
  const spin = contextSafe(() => {
    gsap.to(".box", { rotation: "+=360", duration: 0.8, stagger: 0.08, ease: "back.out(1.7)" });
  });

  return (
    <div ref={container} className="mx-auto max-w-xl p-8">
      <div className="flex gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="box h-20 w-20 rounded-xl bg-current" />
        ))}
      </div>
      <button onClick={spin} className="mt-6 rounded-full border px-5 py-2">
        Spin
      </button>
    </div>
  );
}
