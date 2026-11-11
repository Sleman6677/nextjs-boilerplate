"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { LashPair } from "../lash-box";

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const smooth = (t: number) => t * t * (3 - 2 * t);

/* Six lash pairs thrown out of the box when it opens: where each one flies
   (in vw/vh from the box), how high it arcs and how much it spins. */
const LASHES = [
  { style: "classic", map: "natural", dx: -34, up: 30, dy: 22, spin: -40, at: 0.16 },
  { style: "hybrid", map: "cat", dx: -16, up: 44, dy: 52, spin: 25, at: 0.19 },
  { style: "volume", map: "doll", dx: 6, up: 50, dy: 30, spin: -18, at: 0.22 },
  { style: "wet", map: "squirrel", dx: -46, up: 24, dy: 62, spin: 55, at: 0.25 },
  { style: "mega", map: "doll", dx: -26, up: 36, dy: 84, spin: -60, at: 0.28 },
  { style: "natural", map: "cat", dx: 10, up: 20, dy: 72, spin: 35, at: 0.31 },
] as const;

/* Hearts and sparkles from the box art, bursting when the lid lifts. */
const BITS = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2 + (i % 3) * 0.4;
  const r = 14 + ((i * 37) % 17);
  return { heart: i % 3 === 0, x: Math.cos(a) * r, y: Math.sin(a) * r * 0.8 - 6, size: 10 + ((i * 13) % 14), delay: (i % 5) * 0.012, twinkle: 1.6 + (i % 4) * 0.5 };
});

/**
 * The page's background: the real Serag box falls in on load, then keeps
 * falling down the page as it scrolls, swaying and turning. Its lid (the box
 * photograph) tips open, six lash pairs fly out across the page and hearts
 * and sparkles burst around it; everything floats gently at rest. A fixed
 * layer behind the content (pointer-events none). Reduced motion: the closed
 * box, still, beside the hero.
 */
export function BoxScene({ alt }: { alt: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const lid = useRef<HTMLDivElement>(null);
  const tray = useRef<HTMLDivElement>(null);
  const lashes = useRef<(HTMLDivElement | null)[]>([]);
  const bits = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rtl = document.documentElement.dir === "rtl";
    const start = performance.now();
    let raf = 0;
    let visible = !document.hidden;

    const frame = (now: number) => {
      raf = 0;
      const t = (now - start) / 1000;
      const vw = window.innerWidth / 100;
      const vh = window.innerHeight / 100;
      const phone = window.innerWidth < 1024;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const p = clamp(window.scrollY / max);

      // Load: a gravity drop with one small bounce.
      const d = clamp(t / 1.1);
      const drop = d < 0.62 ? -110 * (1 - Math.pow(d / 0.62, 2)) : -4 * Math.sin(((d - 0.62) / 0.38) * Math.PI);
      // Scroll: it keeps falling down the page, swaying, turning, shrinking a little.
      const fall = smooth(clamp(p / 0.9));
      const sway = Math.sin(p * Math.PI * 3) * (phone ? 6 : 10);
      const side = rtl ? -1 : 1;
      const baseX = phone ? 50 : rtl ? 27 : 73;
      const x = (baseX + side * sway * 0.4) * vw;
      const y = ((phone ? 36 : 52) + drop + fall * (phone ? 40 : 28)) * vh + Math.sin(t * 1.4) * 6;
      const rot = Math.sin(p * Math.PI * 4) * 9 + Math.sin(t * 1.1) * 1.5 - 4 * (1 - d);
      const scale = (phone ? 0.85 : 1) * (1 - 0.3 * fall);
      // Phones: behind running text after the first screen, so it steps back to a soft background.
      if (stage.current) stage.current.style.opacity = phone ? String(1 - 0.72 * smooth(clamp((window.scrollY - 0.35 * window.innerHeight) / (0.4 * window.innerHeight)))) : "1";
      if (box.current) box.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${rot}deg) scale(${scale})`;

      // Lid opens with the scroll, and settles closed again near the end.
      const open = ease(clamp((p - 0.06) / 0.14)) * (1 - ease(clamp((p - 0.86) / 0.12)));
      if (lid.current) lid.current.style.transform = `translateY(${-6 * open}%) rotateX(${-86 * open}deg)`;
      if (tray.current) tray.current.style.opacity = String(clamp(open * 4));

      // Lash pairs fly out in arcs and drift, then float back home at the end.
      const unit = phone ? 1.2 : 1;
      lashes.current.forEach((el, i) => {
        if (!el) return;
        const L = LASHES[i];
        const k = ease(clamp((p - L.at) / 0.22)) * (1 - ease(clamp((p - 0.84) / 0.12)));
        const bob = Math.sin(t * (1.2 + i * 0.15) + i) * 8 * k;
        const lx = side * L.dx * k * vw * unit;
        const ly = (-L.up * Math.sin(k * Math.PI * 0.85) + L.dy * k * 0.35) * vh + bob;
        const r = L.spin * k + Math.sin(t * 0.9 + i) * 6 * k;
        el.style.opacity = String(clamp(k * 3));
        el.style.transform = `translate(${lx}px, ${ly}px) rotate(${r}deg) scale(${0.5 + 0.7 * k})`;
      });

      // Hearts and sparkles: a burst at the opening, then a soft twinkle.
      const burst = ease(clamp((p - 0.1) / 0.12));
      const fade = 1 - clamp((p - 0.5) / 0.2);
      bits.current.forEach((el, i) => {
        if (!el) return;
        const B = BITS[i];
        const k = clamp((burst - B.delay * 10) / (1 - B.delay * 10));
        const tw = 0.6 + 0.4 * Math.sin(t * B.twinkle + i);
        el.style.opacity = String(k * fade * tw);
        el.style.transform = `translate(${side * B.x * k * vw}px, ${B.y * k * vh}px) scale(${0.4 + 0.8 * k * tw})`;
      });

      if (visible) raf = requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      visible = !document.hidden;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div ref={stage} className="box-stage pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div ref={box} className="box-actor absolute top-0 left-0 w-[min(46vw,640px)] max-lg:w-[min(88vw,520px)]">
        <div className="relative aspect-[1344/960] [perspective:1400px]">
          {/* Open box: the tray */}
          <div ref={tray} className="absolute top-[10%] right-[3%] bottom-[7%] left-[3%] rounded-[14px] bg-copper p-[3.5%] opacity-0">
            <div className="grid h-full grid-cols-6 grid-rows-4 gap-[3%] rounded-[10px] bg-stone-2 p-[4%]">
              {Array.from({ length: 24 }, (_, i) => (
                <svg key={i} viewBox="0 0 40 20" fill="none" stroke="currentColor" strokeLinecap="round" className="h-full w-full text-kohl/50">
                  <path d="M4 6 Q20 17 36 6" strokeWidth="1.8" />
                  {[8, 13, 18, 22, 27, 32].map((x) => {
                    const y = 6 + 5.5 * (1 - Math.pow((x - 20) / 16, 2));
                    return <path key={x} d={`M${x} ${y} l${(x - 20) * 0.12} 5.5`} strokeWidth="1.2" />;
                  })}
                </svg>
              ))}
            </div>
          </div>
          {/* Hearts and sparkles */}
          {BITS.map((b, i) => (
            <span key={i} ref={(n) => void (bits.current[i] = n)} className="absolute top-[40%] left-1/2 text-pink-deep opacity-0 will-change-transform" style={{ width: b.size, height: b.size }}>
              {b.heart ? (
                <svg viewBox="0 0 24 24" className="h-full w-full" fill="currentColor">
                  <path d="M12 21s-7.5-4.6-9.6-9.2C.8 8.3 2.9 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.2 1.8-2 3.3-3.2 5.4-3.2 3.7 0 5.8 3.8 4.2 7.3C19.5 16.4 12 21 12 21z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-full w-full" fill="currentColor">
                  <path d="M12 1.5c.7 5.2 3.8 8.3 9 9-5.2.7-8.3 3.8-9 9-.7-5.2-3.8-8.3-9-9 5.2-.7 8.3-3.8 9-9z" />
                </svg>
              )}
            </span>
          ))}
          {/* Lash pairs that fly out */}
          {LASHES.map((l, i) => (
            <div key={i} ref={(n) => void (lashes.current[i] = n)} className="absolute top-[42%] left-[36%] w-[28%] text-kohl opacity-0 will-change-transform">
              <LashPair style={l.style} map={l.map} seed={4 + i} />
            </div>
          ))}
          {/* Lid: the real box photograph, hinged on its top edge */}
          <div ref={lid} className="absolute inset-0 origin-[50%_9%] will-change-transform">
            <Image src="/images/serag-lashes-box.jpg" alt={alt} width={1344} height={960} priority sizes="(min-width: 1024px) 46vw, 88vw" className="h-full w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
