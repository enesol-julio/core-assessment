export type SummaryCardData = {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "good" | "warn" | "bad" | "neutral";
};

const toneClasses: Record<NonNullable<SummaryCardData["tone"]>, string> = {
  good: "text-green-700 bg-green-50 border-green-200",
  warn: "text-amber-700 bg-amber-50 border-amber-200",
  bad: "text-red-700 bg-red-50 border-red-200",
  neutral: "text-zinc-700 bg-zinc-50 border-zinc-200",
};

export default function SummaryCards({ cards }: { cards: SummaryCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded border p-4 ${toneClasses[c.tone ?? "neutral"]}`}
        >
          <div className="text-xs uppercase tracking-wide text-current/70">{c.label}</div>
          <div className="mt-1 text-2xl font-semibold">{c.value}</div>
          {c.sublabel ? <div className="mt-1 text-xs text-current/70">{c.sublabel}</div> : null}
        </div>
      ))}
    </div>
  );
}
