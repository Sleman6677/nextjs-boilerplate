"use client";

import { useState } from "react";
import { useI18n } from "../i18n-provider";
import { HeroBox } from "../lash-box";

/** Hero box you can tap to close and re-open (replays the unboxing animation). */
export function HeroBoxPlayer({ price }: { price: string }) {
  const { dict } = useI18n();
  const [round, setRound] = useState(0);
  return (
    <button type="button" onClick={() => setRound((r) => r + 1)} aria-label={dict.shop.replay} className="block w-full touch-manipulation rounded-[2rem] [-webkit-tap-highlight-color:transparent]">
      <HeroBox key={round} label={dict.shop.heroBox} tag={dict.shop.tag} price={price} />
    </button>
  );
}
