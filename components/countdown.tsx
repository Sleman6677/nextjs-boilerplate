"use client";

import { useSyncExternalStore } from "react";
import { num } from "@/lib/i18n/format";
import { useI18n } from "./i18n-provider";

function subscribe(onTick: () => void) {
  const id = window.setInterval(onTick, 1000);
  return () => window.clearInterval(id);
}

const nowSeconds = () => Math.floor(Date.now() / 1000);
const serverSnapshot = () => null;

/** Seconds remaining until the last moment of the current month (visitor's local time). */
function remaining(now: number) {
  const d = new Date(now * 1000);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
  return Math.max(0, Math.floor(end.getTime() / 1000) - now);
}

function parts(total: number) {
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}


/** Compact inline version for the announcement bar. */
export function CountdownInline() {
  const { lang, dict } = useI18n();
  const pad = (n: number) => num(String(n).padStart(2, "0"), lang);
  const c = dict.countdown;
  const now = useSyncExternalStore(subscribe, nowSeconds, serverSnapshot);
  if (now === null) return <span className="tabular-nums opacity-60">—</span>;
  const p = parts(remaining(now));
  return (
    <span className="tabular-nums" aria-live="off">
      {pad(p.days)}{c.d} : {pad(p.hours)}{c.h} : {pad(p.minutes)}{c.m} : {pad(p.seconds)}{c.s}
    </span>
  );
}

/** Large version for the offer section. */
export function CountdownBlocks() {
  const { lang, dict } = useI18n();
  const pad = (n: number) => num(String(n).padStart(2, "0"), lang);
  const now = useSyncExternalStore(subscribe, nowSeconds, serverSnapshot);
  const p = now === null ? null : parts(remaining(now));
  const cells: { label: string; value: number | undefined }[] = [
    { label: dict.countdown.days, value: p?.days },
    { label: dict.countdown.hours, value: p?.hours },
    { label: dict.countdown.minutes, value: p?.minutes },
    { label: dict.countdown.seconds, value: p?.seconds },
  ];
  return (
    <div className="flex gap-3 sm:gap-4" role="timer" aria-label={dict.countdown.timer}>
      {cells.map((c) => (
        <div
          key={c.label}
          className="flex w-[4.6rem] flex-col items-center rounded-2xl border border-gold/25 bg-ink-2/70 py-4 sm:w-24 sm:py-5"
        >
          <span className="font-display text-4xl leading-none text-gold-soft tabular-nums sm:text-5xl">
            {c.value === undefined ? "––" : pad(c.value)}
          </span>
          <span className="mt-2 text-xs text-ivory/70">{c.label}</span>
        </div>
      ))}
    </div>
  );
}
