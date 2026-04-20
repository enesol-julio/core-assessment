import { loadSession } from "@/lib/auth/session";
import { loadUiStrings, uiString } from "@/lib/content";
import { redirect } from "next/navigation";

export default async function CompletePage() {
  const session = await loadSession();
  if (!session) redirect("/");

  const strings = await loadUiStrings(session.language);
  const fallback = await loadUiStrings("en");
  const title = uiString(strings, "completion.submitted_title", fallback);
  const message = uiString(strings, "completion.submitted_message", fallback);
  const noScores = uiString(strings, "completion.no_scores_note", fallback);
  const thankYou = uiString(strings, "completion.thank_you", fallback);

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-2xl p-10">
        <h1 className="mb-4 text-2xl font-semibold">{title}</h1>
        <p className="mb-3 text-zinc-700">{message}</p>
        <p className="mb-3 text-zinc-700">{noScores}</p>
        <p className="text-zinc-700">{thankYou}</p>
        <form action="/api/auth/logout" method="post" className="mt-6">
          <button type="submit" className="rounded border px-4 py-2">
            {uiString(strings, "auth.logout_button", fallback)}
          </button>
        </form>
      </div>
    </main>
  );
}
