import { redirect } from "next/navigation";
import { headers } from "next/headers";
import LoginClient from "@/components/assessment/LoginClient";
import { loadAssessmentMeta, loadUiStrings } from "@/lib/content";
import { loadSession } from "@/lib/auth/session";
import type { Language } from "@/lib/types/assessment-response";

type SearchParams = {
  forbidden?: string;
  from?: string;
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await loadSession();
  if (session) redirect(session.role === "admin" ? "/dashboard" : "/assess");

  const sp = await searchParams;
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "";
  const meta = await loadAssessmentMeta("en");
  const defaults = meta.global_settings.domain_language_defaults;
  const initialLanguage: Language = (defaults[host] ?? meta.global_settings.default_language) as Language;

  const [initialStrings, fallbackStrings] = await Promise.all([
    loadUiStrings(initialLanguage),
    loadUiStrings("en"),
  ]);

  const seedDomains = (process.env.SEED_DOMAINS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return (
    <main className="min-h-screen bg-zinc-50">
      {sp.forbidden ? (
        <div className="mx-auto mt-10 max-w-md rounded bg-amber-50 p-4 text-sm text-amber-800">
          Admin access required.
        </div>
      ) : null}
      <LoginClient
        initialLanguage={initialLanguage}
        initialStrings={initialStrings}
        fallbackStrings={fallbackStrings}
        seedDomains={seedDomains}
      />
    </main>
  );
}
