import { NextResponse } from "next/server";
import { LanguageSchema } from "@/lib/types/assessment-response";
import { loadUiStrings } from "@/lib/content";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const langParam = url.searchParams.get("lang");
  const parsed = LanguageSchema.safeParse(langParam);
  const language = parsed.success ? parsed.data : "en";
  const strings = await loadUiStrings(language);
  return NextResponse.json({ language, strings });
}
