import { notFound } from "next/navigation";

/** Any unknown path under a language renders that language's 404 page. */
export default function CatchAll() {
  notFound();
}
