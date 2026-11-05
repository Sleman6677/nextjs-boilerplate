"use client";

import { useState } from "react";
import { payOrder } from "@/app/actions/shop";
import { useI18n } from "../i18n-provider";
import { CardIcon } from "../icons";

export function PayButton({ number }: { number: number }) {
  const { lang, dict } = useI18n();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setFailed(false);
          const res = await payOrder(number, lang);
          if (res.ok) window.location.assign(res.payUrl);
          else {
            setBusy(false);
            setFailed(true);
          }
        }}
        className="btn btn-gold disabled:opacity-70"
      >
        <CardIcon className="h-5 w-5" /> {busy ? dict.checkout.opening : dict.account.payOnline}
      </button>
      {failed ? <p role="alert" className="mt-2 text-sm text-rosewood">{dict.checkout.errGeneric}</p> : null}
    </div>
  );
}
