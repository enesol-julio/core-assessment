import { desc, eq } from "drizzle-orm";
import { loadSession } from "@/lib/auth/session";
import { loadUiStrings, uiString } from "@/lib/content";
import { redirect } from "next/navigation";
import { db } from "@/db/index";
import { responses } from "@/db/schema";
import PilotFeedbackForm from "@/components/assessment/PilotFeedbackForm";

export const dynamic = "force-dynamic";

export default async function CompletePage() {
  const session = await loadSession();
  if (!session) redirect("/");

  const [strings, fallback, latestResponse] = await Promise.all([
    loadUiStrings(session.language),
    loadUiStrings("en"),
    db
      .select({ id: responses.id })
      .from(responses)
      .where(eq(responses.userId, session.user_id))
      .orderBy(desc(responses.completedAt))
      .limit(1),
  ]);
  const title = uiString(strings, "completion.submitted_title", fallback);
  const message = uiString(strings, "completion.submitted_message", fallback);
  const noScores = uiString(strings, "completion.no_scores_note", fallback);
  const thankYou = uiString(strings, "completion.thank_you", fallback);
  const responseId = latestResponse[0]?.id ?? null;

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-2xl p-10 space-y-6">
        <section>
          <h1 className="mb-4 text-2xl font-semibold">{title}</h1>
          <p className="mb-3 text-zinc-700">{message}</p>
          <p className="mb-3 text-zinc-700">{noScores}</p>
          <p className="text-zinc-700">{thankYou}</p>
        </section>
        <section className="rounded border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">Pilot feedback</h2>
          <PilotFeedbackForm responseId={responseId} />
        </section>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="rounded border px-4 py-2">
            {uiString(strings, "auth.logout_button", fallback)}
          </button>
        </form>
      </div>
    </main>
  );
}
