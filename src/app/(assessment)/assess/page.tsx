import { redirect } from "next/navigation";
import AssessmentRunner from "@/components/assessment/AssessmentRunner";
import { loadSession } from "@/lib/auth/session";
import { loadUiStrings } from "@/lib/content";

export default async function AssessPage() {
  const session = await loadSession();
  if (!session) redirect("/?from=assess");

  const [strings, fallback] = await Promise.all([
    loadUiStrings(session.language),
    loadUiStrings("en"),
  ]);

  return (
    <main className="min-h-screen bg-zinc-50">
      <AssessmentRunner strings={strings} fallbackStrings={fallback} language={session.language} />
    </main>
  );
}
