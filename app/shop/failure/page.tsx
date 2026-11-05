import type { Metadata } from "next";
import { OrderResult } from "@/components/order-result";

export const metadata: Metadata = {
  title: "لم يكتمل الدفع",
  robots: { index: false },
};

export default function Page() {
  return (
    <section className="relative isolate flex min-h-[90svh] items-center overflow-clip bg-gradient-to-b from-plum via-berry-deep to-berry px-5 pt-36 pb-24">
      <div className="glow-pink drift pointer-events-none absolute -top-32 right-[-10%] -z-10 h-[30rem] w-[30rem] opacity-60" aria-hidden="true" />
      <OrderResult kind="failure" />
    </section>
  );
}
