import { notifyGiftCards, notifyOrderReceived } from "@/lib/notify";
import { markPaid } from "@/lib/orders";
import { verifyPayplusSignature } from "@/lib/payplus";

type Callback = {
  transaction?: { status_code?: string; more_info?: string; uid?: string };
  invoice?: { docu_number?: string; original_url?: string; status?: string };
};

/** PayPlus server-to-server notification after a transaction (refURL_callback). */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyPayplusSignature(raw, request.headers.get("hash"))) {
    return Response.json({ ok: false }, { status: 401 });
  }
  let body: Callback = {};
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const tx = body.transaction;
  const orderId = tx?.more_info ?? "";
  if (tx?.status_code === "000" && /^[0-9a-f-]{36}$/i.test(orderId)) {
    const invoice = body.invoice ? { number: body.invoice.docu_number ?? null, url: body.invoice.original_url ?? null } : undefined;
    const result = await markPaid(orderId, tx.uid ?? null, invoice);
    if (result?.wasAwaiting) await notifyOrderReceived(orderId);
    if (result?.giftCards.length) await notifyGiftCards(orderId, result.giftCards);
  }
  return Response.json({ ok: true });
}
