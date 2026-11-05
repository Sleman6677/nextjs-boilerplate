import { buildOrder, createPaymentLink, OrderError, payplusConfigured } from "@/lib/payplus";

/** Creates a PayPlus payment page for the posted cart and returns its URL. */
export async function POST(request: Request) {
  if (!payplusConfigured()) {
    return Response.json({ error: "الدفع الإلكتروني غير مفعّل حاليًا" }, { status: 503 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  let order;
  try {
    order = buildOrder(input);
  } catch (e) {
    const message = e instanceof OrderError ? e.message : "طلب غير صالح";
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const origin = new URL(request.url).origin;
    const url = await createPaymentLink(order, origin);
    return Response.json({ url, ref: order.ref, total: order.total });
  } catch {
    return Response.json({ error: "تعذّر فتح صفحة الدفع الآن، حاولي مجددًا أو ادفعي عبر Bit" }, { status: 502 });
  }
}
