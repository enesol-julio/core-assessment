"use client";
import { useMemo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { IndividualDrillDown } from "@/services/dashboard/transforms/individual";

export default function IndividualDrillDownView({ data }: { data: IndividualDrillDown }) {
  const radarData = useMemo(() => {
    return data.sections.map((s) => ({
      section: s.sectionName,
      Individual: Math.round(s.rawScore),
      Population: s.populationMean != null ? Math.round(s.populationMean) : null,
    }));
  }, [data.sections]);

  return (
    <div className="space-y-6">
      <header className="rounded border border-zinc-200 bg-white p-5">
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{data.identity.name}</h1>
            <p className="text-sm text-zinc-500">
              {data.identity.role || "—"} · {data.identity.organization} · {data.identity.email}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs">
              v{data.identity.profileVersion}
            </span>
            <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
              {data.identity.classification}
            </span>
            <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">
              {data.identity.fitnessRating}
            </span>
            <span className="font-mono text-lg">
              {data.identity.compositeScore.toFixed(1)}
            </span>
            {data.identity.percentileRank != null ? (
              <span className="text-xs text-zinc-500">
                p{data.identity.percentileRank} · {data.identity.relativeFitnessTier}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <section className="rounded border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold">Section performance</h2>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="section" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar
                name="Individual"
                dataKey="Individual"
                stroke="#2563eb"
                fill="#2563eb"
                fillOpacity={0.3}
              />
              {radarData.some((d) => d.Population != null) ? (
                <Radar
                  name="Population mean"
                  dataKey="Population"
                  stroke="#9ca3af"
                  fill="#9ca3af"
                  fillOpacity={0.1}
                />
              ) : null}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold">Cognitive profile</h2>
        <div className="mb-2 text-lg font-medium">{data.cognitiveProfile.style}</div>
        <p className="mb-3 text-sm text-zinc-700">{data.cognitiveProfile.description}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs uppercase text-zinc-500">Strengths</div>
            <ul className="list-disc pl-5 text-sm text-zinc-700">
              {data.cognitiveProfile.strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div>
            <div className="mb-1 text-xs uppercase text-zinc-500">Development areas</div>
            <ul className="list-disc pl-5 text-sm text-zinc-700">
              {data.cognitiveProfile.development_areas.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold">Vibe-coding fitness</h2>
        <div className="mb-2 flex items-center gap-2 text-sm">
          <span className="rounded bg-green-100 px-2 py-1 text-green-800">{data.fitness.rating}</span>
          <span className="rounded bg-zinc-100 px-2 py-1 text-zinc-700">confidence: {data.fitness.confidence}</span>
        </div>
        <p className="mb-3 text-sm text-zinc-700">{data.fitness.justification}</p>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="mb-1 text-xs uppercase text-zinc-500">Key strengths for AI work</div>
            <ul className="list-disc pl-5 text-sm text-zinc-700">
              {data.fitness.key_strengths_for_ai_work.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div>
            <div className="mb-1 text-xs uppercase text-zinc-500">Key risks for AI work</div>
            <ul className="list-disc pl-5 text-sm text-zinc-700">
              {data.fitness.key_risks_for_ai_work.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div>
            <div className="mb-1 text-xs uppercase text-zinc-500">Recommended role contexts</div>
            <ul className="list-disc pl-5 text-sm text-zinc-700">
              {data.fitness.recommended_role_contexts.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold">Development recommendations</h2>
        {data.developmentRecommendations.length === 0 ? (
          <p className="text-sm text-zinc-500">None listed.</p>
        ) : (
          <ul className="space-y-3">
            {data.developmentRecommendations.map((d, i) => (
              <li key={i} className="rounded border border-zinc-100 p-3">
                <div className="mb-1 flex items-center gap-2 text-sm">
                  <span className="font-medium">{d.area}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      d.priority === "high"
                        ? "bg-red-100 text-red-800"
                        : d.priority === "medium"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {d.priority}
                  </span>
                </div>
                <p className="text-sm text-zinc-700">{d.observation}</p>
                <p className="mt-1 text-sm font-medium text-zinc-900">{d.recommendation}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">Speed profile</h2>
          <p className="text-sm text-zinc-700">{data.speedProfile.overall_characterization}</p>
          <p className="mt-2 text-sm text-zinc-700">{data.speedProfile.speed_accuracy_insight}</p>
          <p className="mt-2 text-sm text-zinc-700">{data.speedProfile.anomaly_interpretation}</p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">Red flags</h2>
          {data.redFlags.length === 0 ? (
            <p className="text-sm text-zinc-500">None.</p>
          ) : (
            <ul className="space-y-2">
              {data.redFlags.map((f, i) => (
                <li key={i} className="rounded border border-zinc-100 p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{f.type}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        f.severity === "high"
                          ? "bg-red-100 text-red-800"
                          : f.severity === "medium"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {f.severity}
                    </span>
                  </div>
                  <p className="mt-1">{f.description}</p>
                  <p className="mt-1 text-zinc-600">{f.implication}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
