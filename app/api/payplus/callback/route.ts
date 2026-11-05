import { markPaid } from "@/lib/orders";
import { verifyPayplusSignature } from "@/lib/payplus";

/** PayPlus server-to-server notification after a transaction (refURL_callback). */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyPayplusSignature(raw, request.headers.get("hash"))) {
    return Response.json({ ok: false }, { status: 401 });
  }
  let body: { transaction?: { status_code?: string; more_info?: string; uid?: string } } = {};
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const tx = body.transaction;
  const orderId = tx?.more_info ?? "";
  if (tx?.status_code === "000" && /^[0-9a-f-]{36}$/i.test(orderId)) {
    await markPaid(orderId, tx.uid ?? null);
  }
  return Response.json({ ok: true });
}
