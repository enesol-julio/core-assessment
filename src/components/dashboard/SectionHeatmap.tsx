import Link from "next/link";
import type { HeatmapMatrix } from "@/services/dashboard/transforms/heatmap";

export default function SectionHeatmap({ matrix }: { matrix: HeatmapMatrix }) {
  const cellByKey = new Map(
    matrix.cells.map((c) => [`${c.responseId}:${c.sectionId}`, c]),
  );
  if (matrix.individuals.length === 0) {
    return (
      <section className="rounded border border-zinc-200 p-6 text-sm text-zinc-500">
        Heatmap will populate once profiles exist.
      </section>
    );
  }
  return (
    <section className="overflow-x-auto rounded border border-zinc-200">
      <table className="min-w-full divide-y divide-zinc-200 text-xs">
        <thead className="bg-zinc-50">
          <tr>
            <th className="sticky left-0 z-10 bg-zinc-50 px-3 py-2 text-left">Name</th>
            {matrix.sections.map((s) => (
              <th key={s.sectionId} className="px-3 py-2 text-left">
                {s.sectionName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {matrix.individuals.map((ind) => (
            <tr key={ind.responseId}>
              <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-2 font-medium">
                <Link href={`/dashboard/${ind.responseId}`} className="hover:underline">
                  {ind.name}
                </Link>
                <span className="ml-2 font-mono text-zinc-500">{ind.compositeScore.toFixed(0)}</span>
              </td>
              {matrix.sections.map((s) => {
                const cell = cellByKey.get(`${ind.responseId}:${s.sectionId}`);
                return (
                  <td
                    key={s.sectionId}
                    className="px-2 py-2"
                    style={{
                      backgroundColor: cell?.color ?? "#f4f4f5",
                      color: cell ? "#fff" : "#71717a",
                    }}
                  >
                    <div className="font-mono text-xs">{cell ? cell.rawScore.toFixed(0) : "—"}</div>
                    <div className="text-[10px] opacity-90">{cell?.band ?? ""}</div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
