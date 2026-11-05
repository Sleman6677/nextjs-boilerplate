/**
 * Procedural closed-eye lash illustrations.
 * Pure + deterministic (seeded PRNG) so server and client render identical SVG.
 */

export type LashStyle = "natural" | "classic" | "hybrid" | "volume" | "mega" | "wet" | "lift";
export type LashMap = "natural" | "cat" | "doll" | "squirrel";

export const VIEWBOX = { w: 240, h: 150 } as const;

type Pt = { x: number; y: number };

// Lid: quadratic bezier P0 -> P1 (control) -> P2, bowing downward (closed eye).
const P0: Pt = { x: 26, y: 50 };
const P1: Pt = { x: 120, y: 122 };
const P2: Pt = { x: 214, y: 50 };

function lidAt(t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * P0.x + 2 * u * t * P1.x + t * t * P2.x,
    y: u * u * P0.y + 2 * u * t * P1.y + t * t * P2.y,
  };
}

function lidTangent(t: number): Pt {
  const dx = 2 * (1 - t) * (P1.x - P0.x) + 2 * t * (P2.x - P1.x);
  const dy = 2 * (1 - t) * (P1.y - P0.y) + 2 * t * (P2.y - P1.y);
  const len = Math.hypot(dx, dy);
  return { x: dx / len, y: dy / len };
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Relative length profile (0..1) along the lid for each lash map. t=0 inner corner, t=1 outer corner. */
function mapProfile(map: LashMap, t: number): number {
  const innerTaper = 0.35 + 0.65 * smooth(0, 0.28, t);
  const outerTaper = 1 - 0.35 * smooth(0.9, 1, t);
  let p: number;
  switch (map) {
    case "cat":
      p = 0.35 + 0.65 * Math.pow(t, 1.35);
      break;
    case "doll":
      p = 0.4 + 0.6 * Math.pow(Math.sin(Math.PI * t), 1.4);
      break;
    case "squirrel":
      p = 0.38 + 0.62 * Math.exp(-Math.pow((t - 0.7) / 0.26, 2));
      break;
    default:
      p = 0.45 + 0.4 * Math.sin(Math.PI * Math.pow(t, 0.8)) + 0.15 * t;
  }
  return p * innerTaper * outerTaper;
}

type StyleSpec = {
  count: number;
  fan: (i: number) => number;
  spread: number; // radians between fan strands
  width: number;
  minLen: number;
  maxLen: number;
  curl: number;
  jitter: number;
  sparse?: number; // probability of skipping a lash (natural/before look)
};

const STYLES: Record<LashStyle, StyleSpec> = {
  natural: { count: 30, fan: () => 1, spread: 0, width: 1.15, minLen: 8, maxLen: 27, curl: 0.16, jitter: 0.32, sparse: 0.2 },
  classic: { count: 32, fan: () => 1, spread: 0, width: 1.55, minLen: 12, maxLen: 42, curl: 0.24, jitter: 0.13 },
  hybrid: { count: 32, fan: (i) => (i % 2 === 0 ? 3 : 1), spread: 0.085, width: 1.05, minLen: 12, maxLen: 44, curl: 0.25, jitter: 0.1 },
  volume: { count: 32, fan: () => 4, spread: 0.075, width: 0.8, minLen: 12, maxLen: 44, curl: 0.27, jitter: 0.08 },
  mega: { count: 36, fan: () => 6, spread: 0.07, width: 0.62, minLen: 13, maxLen: 47, curl: 0.27, jitter: 0.07 },
  wet: { count: 20, fan: () => 5, spread: 0.009, width: 0.85, minLen: 12, maxLen: 44, curl: 0.22, jitter: 0.24 },
  lift: { count: 26, fan: () => 1, spread: 0, width: 1.35, minLen: 9, maxLen: 30, curl: 0.5, jitter: 0.15 },
};

export type LashPath = { d: string; w: number };
export type LashArt = { lid: string; crease: string; lashes: LashPath[] };

const f = (n: number) => n.toFixed(1);

export function buildLashes(style: LashStyle, map: LashMap = "natural", seed = 7): LashArt {
  const spec = STYLES[style];
  const rand = mulberry32(seed * 977 + style.length * 131 + map.length * 17);
  const lashes: LashPath[] = [];

  for (let i = 0; i < spec.count; i++) {
    const t = 0.035 + (0.93 * i) / (spec.count - 1);
    if (spec.sparse && rand() < spec.sparse) continue;

    const p = lidAt(t);
    const tan = lidTangent(t);
    // Outward normal (pointing down/away from the lid curve).
    const n = { x: -tan.y, y: tan.x };
    const lean = 0.22 + 0.38 * t; // sweep toward the outer corner
    let dir = { x: n.x + tan.x * lean, y: n.y + tan.y * lean };
    const dl = Math.hypot(dir.x, dir.y);
    dir = { x: dir.x / dl, y: dir.y / dl };

    const prof = mapProfile(map, t);
    const baseLen = spec.minLen + (spec.maxLen - spec.minLen) * prof;
    const strands = spec.fan(i);

    for (let s = 0; s < strands; s++) {
      const offset = (s - (strands - 1) / 2) * spec.spread + (rand() - 0.5) * spec.jitter * 0.25;
      const cos = Math.cos(offset);
      const sin = Math.sin(offset);
      const d = { x: dir.x * cos - dir.y * sin, y: dir.x * sin + dir.y * cos };
      const perp = { x: d.y, y: -d.x }; // curls toward outer corner / upward
      const len = baseLen * (1 + (rand() - 0.5) * spec.jitter) * (strands > 1 ? 0.96 + 0.08 * rand() : 1);

      const c = {
        x: p.x + d.x * len * 0.55 + perp.x * len * spec.curl,
        y: p.y + d.y * len * 0.55 + perp.y * len * spec.curl,
      };
      const e = {
        x: p.x + d.x * len + perp.x * len * spec.curl * 0.55,
        y: p.y + d.y * len + perp.y * len * spec.curl * 0.55,
      };
      lashes.push({
        d: `M${f(p.x)} ${f(p.y)}Q${f(c.x)} ${f(c.y)} ${f(e.x)} ${f(e.y)}`,
        w: spec.width * (0.85 + 0.3 * rand()),
      });
    }
  }

  return {
    lid: `M${P0.x} ${P0.y}Q${P1.x} ${P1.y} ${P2.x} ${P2.y}`,
    crease: `M${P0.x + 18} ${P0.y - 14}Q${P1.x} ${P1.y - 52} ${P2.x - 14} ${P2.y - 16}`,
    lashes,
  };
}
