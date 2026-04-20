import type { DistributionBucket } from "@/services/dashboard/transforms/distributions";

export default function DistributionBar({
  title,
  buckets,
}: {
  title: string;
  buckets: DistributionBucket[];
}) {
  const total = buckets.reduce((acc, b) => acc + b.count, 0);
  return (
    <section className="rounded border border-zinc-200 p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {total === 0 ? (
        <p className="text-sm text-zinc-500">No data yet.</p>
      ) : (
        <ul className="space-y-2">
          {buckets.map((b) => (
            <li key={b.label} className="flex items-center gap-3">
              <span className="w-40 text-sm text-zinc-700">{b.label}</span>
              <div className="relative h-2 flex-1 rounded bg-zinc-100">
                <div
                  className="absolute left-0 top-0 h-2 rounded"
                  style={{
                    width: `${b.percentage}%`,
                    backgroundColor: b.color ?? "#52525b",
                  }}
                />
              </div>
              <span className="w-20 text-right font-mono text-xs text-zinc-600">
                {b.count} ({b.percentage.toFixed(0)}%)
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
