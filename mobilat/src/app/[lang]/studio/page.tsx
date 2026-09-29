import { notFound } from "next/navigation";
import { Studio } from "@/components/Studio";
import { isLocale } from "@/lib/config";

export default async function StudioPage({ params }: PageProps<"/[lang]/studio">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <Studio lang={lang} />;
}
