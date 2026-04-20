import Link from "next/link";
import type { RankedProfile } from "@/services/dashboard/transforms/ranking";

const classificationTone: Record<string, string> = {
  Exceptional: "bg-green-100 text-green-800",
  Proficient: "bg-blue-100 text-blue-800",
  Developing: "bg-amber-100 text-amber-800",
  Foundational: "bg-orange-100 text-orange-800",
  "Needs Significant Development": "bg-red-100 text-red-800",
};

const fitnessTone: Record<string, string> = {
  "Strong Fit": "bg-green-100 text-green-800",
  "Good Fit": "bg-blue-100 text-blue-800",
  "Conditional Fit": "bg-amber-100 text-amber-800",
  "Developing Fit": "bg-orange-100 text-orange-800",
  "Not Yet Ready": "bg-red-100 text-red-800",
};

export default function RankingTable({ rows }: { rows: RankedProfile[] }) {
  return (
    <section className="overflow-x-auto rounded border border-zinc-200">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-left">Org</th>
            <th className="px-3 py-2 text-left">Role</th>
            <th className="px-3 py-2 text-left">Fitness</th>
            <th className="px-3 py-2 text-right">Composite</th>
            <th className="px-3 py-2 text-left">Classification</th>
            <th className="px-3 py-2 text-right">%ile</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-3 py-6 text-center text-zinc-500">
                No profiles yet. Submit an assessment and run the pipeline.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.responseId} className="hover:bg-zinc-50">
                <td className="px-3 py-2 font-mono text-xs text-zinc-500">{r.rank}</td>
                <td className="px-3 py-2">
                  <Link href={`/dashboard/${r.responseId}`} className="text-zinc-900 underline-offset-4 hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-zinc-700">{r.organization}</td>
                <td className="px-3 py-2 text-zinc-700">{r.role || "—"}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                      fitnessTone[r.fitnessRating] ?? "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {r.fitnessRating}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono">{r.compositeScore.toFixed(1)}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                      classificationTone[r.classification] ?? "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {r.classification}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono text-zinc-600">
                  {r.percentileRank == null ? "—" : r.percentileRank}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
