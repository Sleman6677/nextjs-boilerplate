import { LashEye } from "@/components/art";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <section className="relative flex min-h-[90svh] items-center overflow-hidden bg-ink pt-32 pb-20 text-ivory">
      <div className="glow pointer-events-none absolute top-1/4 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 opacity-50" aria-hidden="true" />
      <div className="relative mx-auto max-w-2xl px-5 text-center">
        <div className="mx-auto w-56 text-gold-soft">
          <LashEye style="classic" map="doll" draw baseDelay={200} />
        </div>
        <p className="font-display lining mt-8 text-7xl text-gold-grad" dir="ltr">
          404
        </p>
        <h1 className="font-display mt-4 text-4xl leading-snug sm:text-5xl">يبدو أن هذه الصفحة أغمضت عينيها</h1>
        <p className="mt-5 text-lg text-ivory/70">الرابط غير موجود أو تغيّر. دعينا نعيدكِ إلى ما يستحق النظر.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/">العودة للرئيسية</ButtonLink>
          <ButtonLink href="/booking" variant="ghost-light" arrow={false}>
            احجزي موعدك
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
