import Link from "next/link";
import { getDataProvider } from "@/services/dashboard/providers/postgres-provider";
import DomainsSettings from "@/components/admin/DomainsSettings";
import { listDomains } from "@/lib/auth/domains";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const provider = getDataProvider();
  const [domains, calibration] = await Promise.all([
    listDomains(),
    provider.getCurrentCalibration(),
  ]);

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <nav className="flex gap-3 text-sm">
            <Link href="/dashboard" className="text-zinc-700 underline-offset-4 hover:underline">
              Dashboard
            </Link>
            <Link href="/ops" className="text-zinc-700 underline-offset-4 hover:underline">
              Operations
            </Link>
          </nav>
        </header>

        <DomainsSettings
          initialDomains={domains.map((d) => ({
            domain: d.domain,
            added_by: d.addedBy,
            added_at: d.addedAt.toISOString(),
          }))}
        />

        <section className="rounded border border-zinc-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold">Calibration</h2>
          {calibration ? (
            <p className="text-sm text-zinc-700">
              Current calibration: n={calibration.sampleSize}, generated{" "}
              {new Date(calibration.generatedAt).toLocaleString()}. Composite mean{" "}
              <span className="font-mono">{calibration.params.composite.mean.toFixed(1)}</span>, std
              dev <span className="font-mono">{calibration.params.composite.std_dev.toFixed(1)}</span>.
            </p>
          ) : (
            <p className="text-sm text-zinc-500">No calibration snapshot yet (need ≥10 profiles).</p>
          )}
        </section>
      </div>
    </main>
  );
}
