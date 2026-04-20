import Link from "next/link";
import { getDataProvider } from "@/services/dashboard/providers/postgres-provider";
import { computeRanking } from "@/services/dashboard/transforms/ranking";
import {
  computeClassificationDistribution,
  computeFitnessDistribution,
  computeScoreHistogram,
} from "@/services/dashboard/transforms/distributions";
import { computeSectionHeatmap } from "@/services/dashboard/transforms/heatmap";
import SummaryCards, { type SummaryCardData } from "@/components/dashboard/SummaryCards";
import DistributionBar from "@/components/dashboard/DistributionBar";
import RankingTable from "@/components/dashboard/RankingTable";
import SectionHeatmap from "@/components/dashboard/SectionHeatmap";

export const dynamic = "force-dynamic";

type Filters = {
  organization?: string;
  after?: string;
  before?: string;
  classification?: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const filters = await searchParams;
  const provider = getDataProvider();
  const summaries = await provider.listProfiles(filters);
  const ranking = computeRanking(summaries);
  const fitness = computeFitnessDistribution(summaries);
  const classification = computeClassificationDistribution(summaries);
  const histogram = computeScoreHistogram(summaries, 5);
  const heatmap = computeSectionHeatmap(summaries);

  const total = summaries.length;
  const avgComposite =
    total === 0 ? 0 : summaries.reduce((acc, s) => acc + s.compositeScore, 0) / total;
  const proficientPlus = summaries.filter(
    (s) => s.classification === "Proficient" || s.classification === "Exceptional",
  ).length;
  const goodFitPlus = summaries.filter(
    (s) => s.fitnessRating === "Strong Fit" || s.fitnessRating === "Good Fit",
  ).length;

  const cards: SummaryCardData[] = [
    { label: "Total assessed", value: String(total), tone: "neutral" },
    {
      label: "Average composite",
      value: avgComposite.toFixed(1),
      tone: avgComposite >= 70 ? "good" : avgComposite >= 55 ? "warn" : "bad",
    },
    {
      label: "Proficient +",
      value: total === 0 ? "—" : `${((proficientPlus / total) * 100).toFixed(0)}%`,
      sublabel: `${proficientPlus}/${total}`,
      tone: "good",
    },
    {
      label: "Good fit +",
      value: total === 0 ? "—" : `${((goodFitPlus / total) * 100).toFixed(0)}%`,
      sublabel: `${goodFitPlus}/${total}`,
      tone: "good",
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">CORE · Manager Dashboard</h1>
            <p className="text-sm text-zinc-500">
              {total} assessed · ranked by fitness tier, then composite score
            </p>
          </div>
          <nav className="flex gap-3 text-sm">
            <Link href="/ops" className="text-zinc-700 underline-offset-4 hover:underline">
              Operations
            </Link>
            <Link href="/settings" className="text-zinc-700 underline-offset-4 hover:underline">
              Settings
            </Link>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="text-zinc-700 underline-offset-4 hover:underline">
                Sign out
              </button>
            </form>
          </nav>
        </header>

        <SummaryCards cards={cards} />

        <section className="rounded border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">Composite distribution</h2>
          <div className="flex items-end gap-1">
            {histogram.map((b) => {
              const pct = total === 0 ? 0 : (b.count / total) * 100;
              return (
                <div key={b.label} className="flex flex-1 flex-col items-center">
                  <div
                    className="w-full rounded bg-zinc-900"
                    style={{ height: `${Math.max(2, pct * 2)}px`, opacity: 0.85 }}
                    title={`${b.label}: ${b.count}`}
                  />
                  <div className="mt-1 font-mono text-[10px] text-zinc-500">{b.label}</div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DistributionBar title="Fitness rating" buckets={fitness} />
          <DistributionBar title="Classification" buckets={classification} />
        </div>

        <section>
          <h2 className="mb-3 text-sm font-semibold">Ranking</h2>
          <RankingTable rows={ranking} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold">Section heatmap</h2>
          <SectionHeatmap matrix={heatmap} />
        </section>
      </div>
    </main>
  );
}
