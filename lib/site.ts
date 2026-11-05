/**
 * كل محتوى الموقع وبيانات النشاط في مكان واحد.
 * عدّلي القيم المعلَّمة بـ TODO قبل النشر (الرقم، الحسابات، الأسعار، المواعيد).
 */

import type { LashMap, LashStyle } from "./lash";

export const site = {
  name: "Serag Lashes",
  nameAr: "سراج لاشز",
  tagline: "رموشٌ تُضيء نظرتك",
  description:
    "استوديو سراج لاشز لتركيب الرموش الفاخر: كلاسيك، هايبرد، فوليوم ورفع الرموش، بتصميم يُرسم على مقاس عينيكِ.",

  // رقم واتساب بالصيغة الدولية، أرقام فقط بدون + أو مسافات (0537725568 ← 966537725568)
  whatsapp: "966537725568",
  // الرقم كما يظهر للزائرات
  phoneDisplay: "+966 53 772 5568",
  // TODO: أسماء الحسابات الحقيقية
  instagram: "seraglashes",
  tiktok: "seraglashes",

  location: "يُرسَل العنوان الكامل مع تأكيد الحجز",
  // TODO: أوقات العمل الحقيقية
  hours: [
    { days: "السبت – الخميس", time: "١٠ صباحًا – ٨ مساءً" },
    { days: "الجمعة", time: "بحجز مسبق فقط" },
  ],

  // TODO: العملة المعتمدة
  currency: "$",

  offer: {
    label: "عرض الزيارة الأولى",
    headline: "خصم ٢٠٪ على أول جلسة تركيب",
    short: "خصم ٢٠٪ لأول جلسة",
    note: "يُطبَّق عند ذكر الرمز أثناء الحجز",
    code: "SERAG20",
  },
} as const;

export const nav = [
  { href: "/", label: "الرئيسية" },
  { href: "/services", label: "الخدمات والأسعار" },
  { href: "/gallery", label: "المعرض" },
  { href: "/about", label: "قصتنا" },
] as const;

export type Service = {
  id: string;
  name: string;
  latin: string;
  style: LashStyle;
  map: LashMap;
  summary: string;
  details: string[];
  duration: string;
  /** TODO: الأسعار الحقيقية */
  price: number;
  featured?: boolean;
};

export const services: Service[] = [
  {
    id: "classic",
    name: "كلاسيك",
    latin: "Classic",
    style: "classic",
    map: "natural",
    summary: "رمشة واحدة فوق كل رمشة طبيعية. إطلالة ناعمة تُشبهكِ في يومكِ العادي.",
    details: ["مظهر طبيعي يشبه الماسكارا", "مناسب للرموش الكثيفة أصلًا", "الأخف وزنًا على الجفن"],
    duration: "٩٠ دقيقة",
    price: 40,
  },
  {
    id: "hybrid",
    name: "هايبرد",
    latin: "Hybrid",
    style: "hybrid",
    map: "squirrel",
    summary: "مزيج مدروس بين الكلاسيك والفوليوم: كثافة ملحوظة بملمس طبيعي.",
    details: ["يملأ الفراغات بلطف", "ملمس مُنسّق غير متكلّف", "الأكثر طلبًا للمرة الأولى"],
    duration: "١٢٠ دقيقة",
    price: 50,
    featured: true,
  },
  {
    id: "volume",
    name: "فوليوم",
    latin: "Volume",
    style: "volume",
    map: "cat",
    summary: "مراوح خفيفة من ٣ إلى ٦ شعيرات تُصنع يدويًا لكثافة مخملية.",
    details: ["كثافة ناعمة وممتلئة", "مناسب للرموش الخفيفة", "يدوم بمظهره بين التعبئات"],
    duration: "١٥٠ دقيقة",
    price: 60,
  },
  {
    id: "mega",
    name: "ميغا فوليوم",
    latin: "Mega Volume",
    style: "mega",
    map: "doll",
    summary: "حضور درامي كامل للمناسبات وجلسات التصوير ولمن تحب الجرأة.",
    details: ["أعلى درجات الكثافة", "خط رموش داكن وواضح", "إطلالة جاهزة بلا مكياج عين"],
    duration: "١٨٠ دقيقة",
    price: 75,
  },
  {
    id: "wet",
    name: "ويت لوك",
    latin: "Wet Look",
    style: "wet",
    map: "natural",
    summary: "رموش مدبّبة بلمعة رطبة، الصيحة الأحدث بمظهر عصري نظيف.",
    details: ["أطراف مدبّبة متفرّقة", "لمعة خفيفة", "مثالي للإطلالات الصيفية"],
    duration: "١٢٠ دقيقة",
    price: 55,
  },
  {
    id: "lift",
    name: "رفع وصبغ الرموش",
    latin: "Lash Lift & Tint",
    style: "lift",
    map: "natural",
    summary: "لرموشكِ الطبيعية: رفعٌ وانحناءة وصبغة داكنة تدوم أسابيع بلا تركيب.",
    details: ["بدون رموش صناعية", "يدوم ٦–٨ أسابيع", "لا يحتاج صيانة"],
    duration: "٦٠ دقيقة",
    price: 35,
  },
];

export const extras = [
  { name: "تعبئة خلال أسبوعين", note: "لملء ما تساقط طبيعيًا", price: 25 },
  { name: "تعبئة خلال ٣ أسابيع", note: "للحفاظ على الكثافة", price: 30 },
  { name: "إزالة آمنة", note: "بمحلول مخصص دون شدّ", price: 10 },
];

export const lashMaps: { id: LashMap; name: string; latin: string; text: string }[] = [
  { id: "natural", name: "طبيعي", latin: "Natural", text: "أطوال متدرّجة بهدوء تحترم شكل عينكِ كما هو." },
  { id: "cat", name: "عين القطة", latin: "Cat Eye", text: "تطول نحو الزاوية الخارجية فتسحب النظرة للأعلى." },
  { id: "doll", name: "عين الدمية", latin: "Doll Eye", text: "الأطول في المنتصف، تُظهر العين أوسع وأكثر استدارة." },
  { id: "squirrel", name: "السنجاب", latin: "Squirrel", text: "ذروة قبل الزاوية الخارجية، رفعة ناعمة متوازنة." },
];

export const pillars = [
  {
    title: "خريطة رموش على مقاس عينيكِ",
    text: "قبل أي رمشة، نقيس شكل العين والجفن ونرسم خريطة أطوال وانحناءات خاصة بكِ وحدكِ.",
  },
  {
    title: "مواد مختارة بعناية",
    text: "شعيرات خفيفة ناعمة الملمس، ولاصق مخصّص للعين، مع اختبار حساسية عند الحاجة.",
  },
  {
    title: "تعقيم لا تهاون فيه",
    text: "أدوات معقّمة لكل جلسة، وأغطية تُستخدم مرة واحدة، ومساحة هادئة نظيفة.",
  },
];

export const journey = [
  { title: "استشارة", text: "نتحدث عن نمط حياتكِ والإطلالة التي تحلمين بها." },
  { title: "رسم الخريطة", text: "نصمم الأطوال والانحناء والكثافة على شكل عينيكِ." },
  { title: "التركيب", text: "ساعة إلى ثلاث، مستلقية في هدوء تام. كثيرات يغفين." },
  { title: "العناية", text: "نرسل لكِ دليل العناية ونحدد موعد التعبئة المناسب." },
];

export const facts = [
  { value: 4, suffix: "", label: "أنماط أساسية تُفصَّل لكِ" },
  { value: 3, suffix: "", label: "أسابيع بين كل تعبئة" },
  { value: 100, suffix: "٪", label: "أدوات معقّمة لكل جلسة" },
  { value: 180, suffix: "", label: "دقيقة لأطول جلسة فاخرة" },
];

export const faqs = [
  {
    q: "هل يؤذي التركيب رموشي الطبيعية؟",
    a: "حين يُطبَّق بشكل صحيح لا. نختار الطول والوزن المناسبين لقوة رموشكِ، ونعزل كل رمشة على حدة كي تنمو وتتساقط بدورتها الطبيعية.",
  },
  {
    q: "كم تدوم الرموش؟",
    a: "تتبع دورة تساقط رموشكِ الطبيعية، لذلك ننصح بتعبئة كل أسبوعين إلى ثلاثة أسابيع للحفاظ على الكثافة.",
  },
  {
    q: "كيف أستعد لموعدي؟",
    a: "تعالي بعين نظيفة دون ماسكارا أو كحل، وتجنّبي الكافيين الزائد قبل الجلسة لتكوني مرتاحة خلال الاستلقاء.",
  },
  {
    q: "ماذا عن العناية بعد التركيب؟",
    a: "تجنّبي الماء والبخار أول ٢٤ ساعة، ونظّفي الرموش بالرغوة المخصصة، وسرّحيها بالفرشاة صباحًا، وابتعدي عن المنتجات الزيتية حول العين.",
  },
  {
    q: "لدي بشرة حساسة، هل يمكنني التركيب؟",
    a: "نعم في أغلب الحالات. يمكننا إجراء اختبار حساسية قبل الموعد بيوم أو يومين، ولدينا لاصق مخصص للعيون الحساسة.",
  },
];

export type GalleryItem = {
  id: string;
  style: LashStyle;
  map: LashMap;
  title: string;
  caption: string;
  tone: "ink" | "cream" | "blush" | "sand";
  /** ضعي مسار صورة حقيقية من أعمالك هنا (مثال: "/gallery/hybrid-01.jpg") لتظهر بدل الرسم */
  image?: string;
};

export const gallery: GalleryItem[] = [
  { id: "g1", style: "hybrid", map: "squirrel", title: "هايبرد ناعم", caption: "خريطة السنجاب · ١٠–١٢ ملم", tone: "ink" },
  { id: "g2", style: "classic", map: "natural", title: "كلاسيك يومي", caption: "خريطة طبيعية · ٩–١١ ملم", tone: "cream" },
  { id: "g3", style: "volume", map: "cat", title: "فوليوم عين القطة", caption: "مراوح ٤D · ٩–١٣ ملم", tone: "blush" },
  { id: "g4", style: "mega", map: "doll", title: "ميغا للمناسبات", caption: "عين الدمية · مراوح ٨D", tone: "sand" },
  { id: "g5", style: "wet", map: "natural", title: "ويت لوك", caption: "أطراف مدبّبة · لمعة رطبة", tone: "ink" },
  { id: "g6", style: "lift", map: "natural", title: "رفع وصبغ", caption: "رموشكِ الطبيعية · انحناءة L", tone: "cream" },
  { id: "g7", style: "volume", map: "doll", title: "فوليوم مستدير", caption: "عين الدمية · مراوح ٣D", tone: "sand" },
  { id: "g8", style: "hybrid", map: "cat", title: "هايبرد مسحوب", caption: "عين القطة · ١٠–١٣ ملم", tone: "blush" },
  { id: "g9", style: "classic", map: "squirrel", title: "كلاسيك برفعة", caption: "خريطة السنجاب · ٩–١٢ ملم", tone: "ink" },
];

export const styleLabel: Record<LashStyle, string> = {
  natural: "طبيعي",
  classic: "كلاسيك",
  hybrid: "هايبرد",
  volume: "فوليوم",
  mega: "ميغا فوليوم",
  wet: "ويت لوك",
  lift: "رفع الرموش",
};

/** تحويل الأرقام إلى أرقام عربية مشرقية بشكل ثابت بين الخادم والمتصفح */
export function arDigits(input: number | string): string {
  return String(input).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

export function whatsappLink(text?: string): string {
  const base = `https://wa.me/${site.whatsapp}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
