"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import type { Product } from "@/lib/catalog";
import { href } from "@/lib/i18n/config";
import { localized, money, num, t } from "@/lib/i18n/format";
import { stockStatus } from "@/lib/stock";
import { trackAddToCart } from "@/lib/track";
import { cart } from "../cart-store";
import { useI18n } from "../i18n-provider";
import { ProductImage, ProductThumb } from "./product-card";
import { toast } from "./toast";
import "./runway.css";

/* ───────────── Motion constants (ring on desktop, classic line on phones) ───────────── */
const K = 95; // spring stiffness ("balanced")
const C = 2 * Math.sqrt(K); // critically damped
const AR = 0.8; // figure aspect (4:5 lash box)
const FS = 1.08; // front figure stands 8% taller in the ring
const SPEED = 5000; // autoplay, ms per look

type Look = { hero: Product; pieces: Product[] };

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * "Try the Look": a turning 3D ring of lash looks on a white stage. The front
 * look's pieces are listed in the panel beside it, each with an option picker,
 * and the whole look can go to the bag at once.
 */
export function Runway({ products }: { products: Product[] }) {
  const { lang, dict } = useI18n();
  const r = dict.store.home.runway;

  const looks = useMemo<Look[]>(() => {
    const n = products.length;
    return products.slice(0, 6).map((hero, i) => ({ hero, pieces: [0, 1, 2].map((k) => products[(i + k) % n]).filter((p, k, a) => a.indexOf(p) === k) }));
  }, [products]);
  const L = looks.length;
  const N = L * Math.ceil(8 / L); // bodies on the ring (originals + clones)

  const [index, setIndexState] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [cursorMode, setCursorMode] = useState<"" | "view" | "link">("");
  const [dragging, setDragging] = useState(false);
  const [sweep, setSweep] = useState(0);
  const [hold, setHold] = useState(0);

  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const bodies = useRef<(HTMLDivElement | null)[]>([]);
  const cursor = useRef<HTMLSpanElement>(null);
  const st = useRef({ target: 0, cur: 0, vel: 0, W: 0, H: 0, mobile: false, reduce: false, raf: 0, last: 0, visible: true, dragging: false, panelHover: false, engaged: false, unit: 200, blur: [] as number[], x: [] as number[], g: [] as number[], v: [] as number[], trip: [] as (null | { from: number; goal: number })[], prevGoal: [] as number[] });
  const indexRef = useRef(0);
  const playingRef = useRef(false);

  /* ── Layout ── */
  const measure = useCallback(() => {
    const s = st.current;
    const el = stage.current;
    if (!el) return;
    s.mobile = window.innerWidth < 750;
    const rect = el.getBoundingClientRect();
    s.W = rect.width;
    s.H = rect.height;
    const fs = s.mobile ? 1 : FS;
    let h = s.mobile ? s.H - 24 - 18 : (s.H - 34 - 18) / fs;
    h = Math.min(h, (s.W * (s.mobile ? 0.62 : 0.3)) / AR); // keep the wide boxes from crowding
    el.style.setProperty("--rw-model-h", `${Math.max(140, Math.round(h))}px`);
    s.unit = s.mobile ? Math.max(90, s.W * 0.32 * 1.6) : Math.max(120, s.W * 0.3);
  }, []);

  /* ── Placement ── */
  const put = (i: number, x: number, bottom: number, scale: number, opacity: number, blur: number, z: number) => {
    const b = bodies.current[i];
    if (!b) return;
    const s = st.current;
    const w = b.offsetWidth;
    if (x + (w * scale) / 2 < -4 || x - (w * scale) / 2 > s.W + 4) opacity = 0;
    b.style.transform = `translate3d(${x}px, ${-bottom}px, 0) translateX(-50%) scale(${scale})`;
    b.style.opacity = opacity.toFixed(3);
    b.style.zIndex = String(z);
    b.style.visibility = opacity < 0.01 ? "hidden" : "visible";
    b.style.pointerEvents = opacity < 0.5 ? "none" : "auto";
    const bl = Math.round(blur * 10) / 10;
    if (s.blur[i] !== bl) {
      s.blur[i] = bl;
      b.style.filter = bl > 0.05 ? `blur(${bl}px)` : "";
    }
  };

  const renderRing = useCallback(() => {
    const s = st.current;
    const { W, H, cur } = s;
    const cx = 0.5 * W,
      R = 0.62 * W,
      P = 1.65 * W,
      floor = H - 34,
      horizon = 0.36 * H,
      step = (2 * Math.PI) / N;
    for (let a = 0; a < N; a++) {
      let phi = ((a - cur) * step) % (2 * Math.PI);
      if (phi > Math.PI) phi -= 2 * Math.PI;
      if (phi <= -Math.PI) phi += 2 * Math.PI;
      const z = R * (1 - Math.cos(phi));
      const persp = P / (P + z);
      const sl = Math.abs(phi) / step;
      const scale = persp * (1 + (FS - 1) * clamp(1 - sl, 0, 1));
      const x = cx + R * Math.sin(phi) * persp;
      const feet = horizon + (floor - horizon) * persp;
      const blur = sl <= 1 ? 1.8 * sl : Math.min(1.8 + (sl - 1) * 2, 6.5);
      const op = clamp((Math.cos(phi) + 0.55) / 0.3, 0, 1);
      put(a, x, H - feet, scale, op, blur, Math.round(scale * 1000));
    }
  }, [N]);

  const renderLine = useCallback(() => {
    const s = st.current;
    const { W } = s;
    const ax = 0.34,
      ay = 22,
      sx = 0.32,
      sy = 22,
      sr = 0.76,
      ex = 0.55,
      d = 4;
    for (let a = 0; a < N; a++) {
      const x = s.x[a] ?? 0;
      const trip = s.trip[a];
      let k = x,
        e = -1;
      if (trip) {
        const u = clamp(Math.abs(x - trip.from) / Math.max(0.0001, Math.abs(trip.goal - trip.from)), 0, 1);
        if (trip.goal > trip.from) {
          if (u < 0.5) e = 2 * u * 1.4;
          else k = trip.goal + 2 * (1 - u);
        } else if (u < 0.5) k = trip.from + 2 * u;
        else e = 2 * (1 - u) * 1.4;
      } else if (k < 0) e = Math.min(-k, 1.4);
      if (e >= 0) {
        put(a, W * (ax - ex * e), ay - 22 * e, 1 + 0.14 * e, Math.max(0, 1 - 1.05 * e), 4 * Math.min(e, 1), 1100);
      } else {
        const op = k <= d - 1 ? 1 - 0.13 * k : Math.max(0, 0.61 * (d - k));
        put(a, W * (ax + sx * k), ay + sy * k, Math.pow(sr, k), op, Math.min(0.9 * k, 3.2), 1000 - Math.round(10 * k));
      }
    }
  }, [N]);

  /* ── Loop ── */
  const frameRef = useRef<(t: number) => void>(() => {});
  const wrapN = useCallback((v: number) => ((v % N) + N) % N, [N]);

  const frame = useCallback(
    (now: number) => {
      const s = st.current;
      s.raf = 0;
      const dt = s.last ? Math.min(0.034, (now - s.last) / 1000) : 1 / 60;
      s.last = now;
      let moving = s.dragging;
      if (!s.mobile) {
        if (s.reduce) {
          s.cur = s.target;
          s.vel = 0;
        } else {
          const h = dt / 3;
          for (let i = 0; i < 3; i++) {
            const acc = -K * (s.cur - s.target) - C * s.vel;
            s.vel += acc * h;
            s.cur += s.vel * h;
          }
          if (Math.abs(s.cur - s.target) <= 0.0005 && Math.abs(s.vel) <= 0.0005) {
            s.cur = s.target;
            s.vel = 0;
          } else moving = true;
        }
        renderRing();
      } else {
        for (let a = 0; a < N; a++) {
          const goal = wrapN(a - s.target);
          if (s.prevGoal[a] !== undefined && Math.abs(goal - s.prevGoal[a]) > N / 2) s.trip[a] = { from: s.x[a], goal };
          s.prevGoal[a] = goal;
          if (s.reduce) {
            s.x[a] = goal;
            s.g[a] = goal;
            s.v[a] = 0;
            s.trip[a] = null;
            continue;
          }
          const tau = s.dragging ? 0.016 : s.trip[a] ? 0.1 : 0.03 + 0.04 * Math.min(goal, 4);
          s.g[a] += (goal - s.g[a]) * (1 - Math.exp(-dt / tau));
          const h = dt / 3;
          for (let i = 0; i < 3; i++) {
            const acc = -K * (s.x[a] - s.g[a]) - C * s.v[a];
            s.v[a] += acc * h;
            s.x[a] += s.v[a] * h;
          }
          const trip = s.trip[a];
          if (trip && Math.abs(s.x[a] - trip.goal) < 0.02) s.trip[a] = null;
          if (Math.abs(s.x[a] - goal) > 0.0006 || Math.abs(s.v[a]) > 0.0006) moving = true;
          else {
            s.x[a] = goal;
            s.v[a] = 0;
          }
        }
        renderLine();
      }
      if (moving && s.visible && !document.hidden) s.raf = requestAnimationFrame((t) => frameRef.current(t));
      else s.last = 0;
    },
    [N, renderLine, renderRing, wrapN],
  );

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);
  const kick = useCallback(() => {
    const s = st.current;
    if (!s.raf) s.raf = requestAnimationFrame((t) => frameRef.current(t));
  }, []);

  /* ── Index / navigation ── */
  const setIndex = useCallback(
    (i: number) => {
      if (i === indexRef.current) return;
      indexRef.current = i;
      setIndexState(i);
      setZoom(false);
      if (!st.current.reduce) setSweep((n) => n + 1);
    },
    [],
  );
  const moveTo = useCallback(
    (T: number) => {
      st.current.target = T;
      setIndex(((T % L) + L) % L);
      kick();
    },
    [L, kick, setIndex],
  );
  const next = useCallback(() => moveTo(Math.round(st.current.target) + 1), [moveTo]);
  const prev = useCallback(() => moveTo(Math.round(st.current.target) - 1), [moveTo]);
  const go = useCallback(
    (i: number) => {
      let d = (((i - indexRef.current) % L) + L) % L;
      if (d > L / 2) d -= L;
      moveTo(Math.round(st.current.target) + d);
    },
    [L, moveTo],
  );

  const engage = useCallback(() => {
    st.current.engaged = true;
    setPlaying(false);
  }, []);

  /* ── Setup: measure, reveal, observers ── */
  useEffect(() => {
    const s = st.current;
    s.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    measure();
    const start = s.reduce ? 0 : 1.15;
    s.cur = -start;
    s.x = Array.from({ length: N }, (_, a) => wrapN(a) + start);
    s.g = [...s.x];
    s.v = Array(N).fill(0);
    s.trip = Array(N).fill(null);
    s.prevGoal = [];
    kick();

    const io = new IntersectionObserver(([e]) => {
      s.visible = e.isIntersecting;
      if (s.visible) kick();
    });
    if (root.current) io.observe(root.current);
    const reveal = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        reveal.disconnect();
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            setRevealed(true);
            if (!s.reduce) setPlaying(true);
          }),
        );
      },
      { rootMargin: "0px 0px -22% 0px" },
    );
    if (root.current) reveal.observe(root.current);
    let timer = 0;
    const onResize = () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        measure();
        kick();
      }, 120);
    };
    const ro = new ResizeObserver(onResize);
    if (stage.current) ro.observe(stage.current);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(s.raf);
      s.raf = 0;
      io.disconnect();
      reveal.disconnect();
      ro.disconnect();
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [N, kick, measure, wrapN]);

  /* ── Autoplay ── */
  useEffect(() => {
    playingRef.current = playing;
    if (!playing) return;
    const id = window.setTimeout(() => {
      const s = st.current;
      if (playingRef.current && s.visible && !s.dragging && !document.hidden && !s.panelHover && !zoom && !s.engaged) next();
      else setHold((h) => h + 1); // held (hover, drag, popup…): restart the bar
    }, SPEED);
    return () => clearTimeout(id);
  }, [playing, index, zoom, next, hold]);

  /* ── Pointer drag / swipe ── */
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const s = st.current;
    let down: null | { x: number; y: number; t: number; id: number; drag: boolean; samples: { x: number; time: number }[] } = null;
    let suppress = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      down = { x: e.clientX, y: e.clientY, t: s.target, id: e.pointerId, drag: false, samples: [{ x: e.clientX, time: e.timeStamp }] };
    };
    const onMove = (e: PointerEvent) => {
      if (!down || e.pointerId !== down.id) return;
      if (e.pointerType === "mouse" && e.buttons === 0) return onUp(e);
      const dx = e.clientX - down.x,
        dy = e.clientY - down.y;
      if (!down.drag) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
          down = null;
          return;
        }
        if (Math.abs(dx) > 8 && Math.abs(dx) > 1.2 * Math.abs(dy)) {
          down.drag = true;
          s.dragging = true;
          setDragging(true);
          el.setPointerCapture(e.pointerId);
        } else return;
      }
      down.samples.push({ x: e.clientX, time: e.timeStamp });
      if (down.samples.length > 6) down.samples.shift();
      s.target = down.t - dx / s.unit;
      kick();
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      const d = down;
      down = null;
      if (!d.drag) return;
      s.dragging = false;
      setDragging(false);
      suppress = e.timeStamp + 60;
      const dx = e.clientX - d.x;
      const f = d.samples[0],
        l = d.samples[d.samples.length - 1];
      const vx = (l.x - f.x) / Math.max(1, l.time - f.time);
      const from = Math.round(d.t);
      if (s.mobile) {
        moveTo(Math.abs(dx) > 30 || Math.abs(vx) > 0.3 ? from - (dx > 0 ? 1 : -1) : from);
      } else {
        let i = Math.round(s.target + (-vx * 160) / s.unit);
        if (i === from && Math.abs(vx) > 0.3) i = from + (vx > 0 ? -1 : 1);
        moveTo(clamp(i, from - 2, from + 2));
      }
    };
    const onClickCapture = (e: MouseEvent) => {
      if (e.timeStamp < suppress) {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    let acc = 0,
      lock = 0;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (e.timeStamp < lock) return;
      acc += e.deltaX;
      if (Math.abs(acc) > 45) {
        if (acc > 0) next();
        else prev();
        acc = 0;
        lock = e.timeStamp + 520;
      }
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("wheel", onWheel);
    };
  }, [kick, moveTo, next, prev]);

  /* ── Custom Drag / View cursor (mouse & trackpad only) ── */
  const fine = useMedia("(hover: hover) and (pointer: fine)");
  useEffect(() => {
    if (!fine) return;
    const el = stage.current;
    const c = cursor.current;
    if (!el || !c) return;
    const k = st.current.reduce ? 1 : 0.18;
    let x = 0,
      y = 0,
      tx = 0,
      ty = 0,
      raf = 0,
      on = false;
    const step = () => {
      x += (tx - x) * k;
      y += (ty - y) * k;
      c.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = Math.hypot(tx - x, ty - y) > 0.2 ? requestAnimationFrame(step) : 0;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      tx = e.clientX - r.left;
      ty = e.clientY - r.top;
      if (!on) {
        on = true;
        x = tx;
        y = ty;
        c.classList.add("is-on");
      }
      const tgt = e.target as Element;
      setCursorMode(tgt.closest("[data-rw-zoom]") ? "view" : tgt.closest("[data-rw-go]") ? "link" : "");
      if (!raf) raf = requestAnimationFrame(step);
    };
    const onLeave = () => {
      on = false;
      c.classList.remove("is-on");
      setCursorMode("");
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [fine]);

  /* ── Keyboard ── */
  const onStageKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    }
  };
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  /* ── Rank of a body relative to the front (for clicks and a11y) ── */
  const rankOf = (a: number) => {
    let k = (((a - Math.round(st.current.target)) % N) + N) % N;
    if (k > N / 2) k -= N;
    return k;
  };
  const onBody = (a: number) => {
    const k = rankOf(a);
    if (k === 0) {
      engage();
      setZoom(true);
    } else if (Math.abs(k) < N / 2) moveTo(Math.round(st.current.target) + k);
  };

  const current = looks[index];
  const rtl = lang !== "en";

  return (
    <section
      ref={root}
      className={`rw ${revealed ? "is-revealed" : ""} ${zoom ? "rw--zoom" : ""} ${dragging ? "is-dragging" : ""} ${fine ? "rw--cursor" : ""} ${playing ? "is-playing" : ""}`}
      style={{ "--rw-progress": ((index + 1) / L).toFixed(3) } as CSSProperties}
      aria-label={r.title}
    >
      <div className="rw__grid">
        <div className="rw__left">
          <div className="rw__head">
            <div className="rw__intro">
              <h2 className="rw__title">{r.title}</h2>
              <p className="rw__sub">{r.sub}</p>
            </div>
            <span className="sr-only" aria-live="polite" aria-atomic="true">
              {`${r.look} ${num(index + 1, lang)}: ${localized(current.hero.name, lang)}`}
            </span>
          </div>

          <div
            ref={stage}
            className={`rw__stage ${sweep ? "is-sweep" : ""}`}
            tabIndex={0}
            role="region"
            aria-roledescription="carousel"
            aria-label={r.region}
            onKeyDown={onStageKey}
            dir="ltr"
          >
            <div className="rw__actors">
              {Array.from({ length: N }, (_, a) => {
                const look = looks[a % L];
                const name = localized(look.hero.name, lang);
                const front = a % L === index;
                return (
                  <div key={a} ref={(el) => void (bodies.current[a] = el)} className="rw__model" aria-hidden={!front}>
                    <span className="rw__shadow" />
                    <div className="rw__figure">
                      <ProductImage p={look.hero} index={a % L} sizes="320px" />
                      <button
                        type="button"
                        className="rw__hit"
                        data-rw-go={a}
                        {...(front ? { "data-rw-zoom": "" } : {})}
                        tabIndex={-1}
                        aria-label={front ? `${r.viewLook}: ${name}` : `${r.look} ${num((a % L) + 1, lang)}: ${name}`}
                        onClick={() => onBody(a)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <span key={sweep} className="rw__sweep" aria-hidden="true" />
            {fine ? (
              <span ref={cursor} className={`rw__cursor ${cursorMode === "view" && !dragging ? "is-view" : ""} ${cursorMode === "link" && !dragging ? "is-link" : ""}`} aria-hidden="true">
                <span className="rw__cursor-in">
                  <span className="rw__cursor-label rw__cursor-drag">{r.drag}</span>
                  <span className="rw__cursor-label rw__cursor-view">{r.view}</span>
                </span>
              </span>
            ) : null}
            <span className="rw__walk" aria-hidden="true">
              <span className="rw__walk-line" />
            </span>
          </div>

          <div className="rw__controls">
            <button type="button" className="rw__icon rw__prev" onClick={prev} aria-label={r.prev}>
              <svg width="26" height="14" viewBox="0 0 26 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={rtl ? { transform: "scaleX(-1)" } : undefined}>
                <path d="M25 7H1M7 1L1 7l6 6" />
              </svg>
            </button>
            <div className="rw__ticks">
              {looks.map((l, i) => {
                const name = localized(l.hero.name, lang);
                return (
                  <button
                    key={i}
                    type="button"
                    className={`rw__tick ${i < index ? "is-past" : ""}`}
                    aria-current={i === index}
                    aria-label={`${r.look} ${num(i + 1, lang)}: ${name}`}
                    onClick={() => go(i)}
                  >
                    <span className="rw__tick-bar">
                      <span key={i === index ? `${index}-${playing}-${hold}` : "x"} className={`rw__tick-fill ${i === index && playing ? "is-run" : ""}`} />
                    </span>
                    <span className="rw__tick-label">
                      {num(String(i + 1).padStart(2, "0"), lang)}
                      <span className="rw__tick-name">{`  ${name}`}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="rw__icon rw__auto"
              aria-pressed={playing}
              aria-label={r.autoplay}
              onClick={() => {
                if (!playing) st.current.engaged = false;
                setPlaying(!playing);
              }}
            >
              {playing ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 4.5h3.5v15H6.5zM14 4.5h3.5v15H14z" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l12.5-7.5z" /></svg>
              )}
            </button>
            <button type="button" className="rw__icon rw__next" onClick={next} aria-label={r.next}>
              <svg width="26" height="14" viewBox="0 0 26 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={rtl ? { transform: "scaleX(-1)" } : undefined}>
                <path d="M1 7h24M19 1l6 6-6 6" />
              </svg>
            </button>
          </div>

          {/* View look */}
          <div className="rw__lb" role="region" aria-label={r.viewLook} aria-hidden={!zoom} onClick={(e) => e.target === e.currentTarget && setZoom(false)}>
            {zoom ? (
              <>
                <div className="rw__lb-stage" onClick={(e) => e.target === e.currentTarget && setZoom(false)}>
                  <div className="rw__lb-model">
                    <ProductImage p={current.hero} index={index} sizes="(min-width: 750px) 40vw, 80vw" priority />
                  </div>
                </div>
                <div className="rw__lb-top">
                  <p className="rw__lb-cap">
                    <span className="rw__lb-kicker">{`${r.look} ${num(String(index + 1).padStart(2, "0"), lang)}`}</span>
                    <span className="rw__lb-name">{localized(current.hero.name, lang)}</span>
                  </p>
                  <button type="button" className="rw__lb-close" aria-label={r.close} onClick={() => setZoom(false)} autoFocus>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 5l14 14M19 5L5 19" /></svg>
                  </button>
                </div>
                <Link href={href(lang, `/p/${current.hero.slug}`)} className="rw__lb-hint">
                  {r.hint}
                </Link>
              </>
            ) : null}
          </div>
        </div>

        <LookPanel
          key={index}
          look={current}
          lookIndex={index}
          onEngage={engage}
          onHover={(h) => {
            st.current.panelHover = h;
          }}
        />
      </div>
    </section>
  );
}

/* ───────────── "In this look" panel ───────────── */
function LookPanel({ look, lookIndex, onEngage, onHover }: { look: Look; lookIndex: number; onEngage: () => void; onHover: (h: boolean) => void }) {
  const { lang, dict } = useI18n();
  const r = dict.store.home.runway;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState("");
  const name = (p: Product) => localized(p.name, lang);
  const opts = (p: Product) => p.variants.filter((v) => v.active);
  const total = look.pieces.reduce((s, p) => s + p.displayPrice, 0);
  const sellable = look.pieces.filter((p) => stockStatus(p) !== "out");
  const complete = sellable.length >= 2 && sellable.every((p) => added[p.id]);

  const addOne = (p: Product) => {
    const variant = opts(p).length ? (choice[p.id] ?? opts(p)[0].id) : null;
    setLoading((s) => ({ ...s, [p.id]: true }));
    window.setTimeout(() => {
      cart.add(p.id, variant);
      trackAddToCart({ id: p.id, name: p.name.en || name(p), price: p.displayPrice });
      setLoading((s) => ({ ...s, [p.id]: false }));
      setAdded((s) => ({ ...s, [p.id]: true }));
      setOpen((s) => ({ ...s, [p.id]: false }));
      if (navigator.vibrate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) navigator.vibrate(12);
    }, 350);
  };

  const addAll = () => {
    if (complete) return;
    onEngage();
    setMsg("");
    const pending = sellable.filter((p) => !added[p.id]);
    const ready = pending.filter((p) => !opts(p).length || touched[p.id]);
    const waiting = pending.filter((p) => opts(p).length && !touched[p.id]);
    ready.forEach((p) => cart.add(p.id, opts(p).length ? choice[p.id] : null));
    if (ready.length) {
      setAdded((s) => ({ ...s, ...Object.fromEntries(ready.map((p) => [p.id, true])) }));
      toast(t(dict.store.product.added, { name: ready.map(name).join(", ") }));
    }
    if (waiting.length) {
      setOpen((s) => ({ ...s, ...Object.fromEntries(waiting.map((p) => [p.id, true])) }));
      setMsg(t(r.choose, { items: waiting.map(name).join(", ") }));
    }
  };

  return (
    <aside
      className={`rw__panel ${complete ? "is-complete" : ""}`}
      onPointerEnter={(e) => e.pointerType === "mouse" && onHover(true)}
      onPointerLeave={() => onHover(false)}
      onClickCapture={(e) => (e.target as Element).closest("button, a, input, label") && onEngage()}
    >
      <div className="rw__panel-inner">
        <div className="rw__panel-head">
          <h3 className="rw__panel-title">{r.inLook}</h3>
          <span className="rw__label">{t(r.pieces, { n: num(look.pieces.length, lang) })}</span>
        </div>
        <div className="rw__mhead">
          <span className="rw__mhead-title">{name(look.hero)}</span>
          <span className="rw__label">{t(r.pieces, { n: num(look.pieces.length, lang) })}</span>
        </div>
        <ul className="rw__items" role="list">
          {look.pieces.map((p, i) => {
            const o = opts(p);
            const isOpen = Boolean(open[p.id]);
            const out = stockStatus(p) === "out";
            const pickerId = `rw-picker-${lookIndex}-${i}`;
            const link = href(lang, `/p/${p.slug}`);
            return (
              <li key={p.id} className={`rw__item ${isOpen ? "is-picking" : ""} ${added[p.id] ? "is-added" : ""} ${loading[p.id] ? "is-loading" : ""}`} style={{ "--i": i + 1 } as CSSProperties}>
                <Link className="rw__media" href={link} tabIndex={-1} aria-hidden="true">
                  <ProductThumb p={p} className="h-full w-full !rounded-none" />
                  <span className="rw__num">{num(i + 1, lang)}</span>
                </Link>
                <div className="rw__info">
                  <span className="rw__type">{r.vendor}</span>
                  <Link className="rw__name" href={link}>
                    {name(p)}
                  </Link>
                  <span className="rw__price">
                    <span>{money(p.displayPrice, lang)}</span>
                    {p.displayPrice < p.price ? <s className="text-taupe">{money(p.price, lang)}</s> : null}
                  </span>
                </div>
                <button
                  type="button"
                  className="rw__add"
                  disabled={out || added[p.id]}
                  aria-expanded={o.length ? isOpen : undefined}
                  aria-controls={o.length ? pickerId : undefined}
                  aria-label={added[p.id] ? t(r.added, { name: name(p) }) : out ? dict.store.stock.out : t(r.addTo, { name: name(p) })}
                  onClick={() => (o.length ? setOpen((s) => ({ ...s, [p.id]: !isOpen })) : addOne(p))}
                >
                  <svg className="rw__add-plus" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M12 4v16M4 12h16" /></svg>
                  <svg className="rw__add-check" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4.5 12.5l5 5L19.5 7" /></svg>
                  <svg className="rw__add-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3a9 9 0 1 1-9 9" /></svg>
                </button>
                {o.length && isOpen ? (
                  <div className="rw__picker" id={pickerId}>
                    <fieldset className="rw__opt">
                      <legend className="rw__opt-name">{localized(p.optionsLabel, lang) || r.option}</legend>
                      <div className="rw__opt-values">
                        {o.map((v) => {
                          const vOut = stockStatus(p, v.id) === "out";
                          return (
                            <label key={v.id} className={`rw__pill ${vOut ? "is-unavailable" : ""}`}>
                              <input
                                type="radio"
                                name={pickerId}
                                checked={(choice[p.id] ?? o[0].id) === v.id}
                                disabled={vOut}
                                onChange={() => {
                                  setChoice((s) => ({ ...s, [p.id]: v.id }));
                                  setTouched((s) => ({ ...s, [p.id]: true }));
                                }}
                              />
                              <span className="rw__pill-label">{localized(v.name, lang)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                    <button
                      type="button"
                      className="rw__confirm"
                      onClick={() => {
                        setTouched((s) => ({ ...s, [p.id]: true }));
                        addOne(p);
                      }}
                    >
                      {r.add}
                      <span className="sr-only">{` — ${name(p)}`}</span>
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div className="rw__bundle">
          {msg ? (
            <p className="rw__msg" role="status" aria-live="polite">
              {msg}
            </p>
          ) : (
            <p className="sr-only" role="status" aria-live="polite" />
          )}
          <div className="rw__bundle-row">
            <div className="rw__bundle-copy">
              <span className="rw__bundle-title">{r.complete}</span>
              <span className="rw__bundle-note">{r.completeNote}</span>
            </div>
            <div className="rw__bundle-price">
              <strong>{money(total, lang)}</strong>
            </div>
          </div>
          <button type="button" className="rw__cta" onClick={addAll} aria-disabled={complete}>
            {complete ? (
              <span className="rw__cta-done">{r.done}</span>
            ) : (
              <>
                <span className="rw__cta-add">{r.addAll}</span>
                <span className="rw__cta-m">{t(r.addAllShort, { price: money(total, lang) })}</span>
                <svg className="rw__cta-arrow" width="22" height="12" viewBox="0 0 26 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={lang !== "en" ? { transform: "scaleX(-1)" } : undefined}>
                  <path d="M1 7h24M19 1l6 6-6 6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
