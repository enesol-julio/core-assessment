import Link from "next/link";
import { notFound } from "next/navigation";
import IndividualDrillDown from "@/components/dashboard/IndividualDrillDown";
import { getDataProvider } from "@/services/dashboard/providers/postgres-provider";
import { shapeIndividualDrillDown } from "@/services/dashboard/transforms/individual";

export const dynamic = "force-dynamic";

export default async function DrillDownPage({
  params,
}: {
  params: Promise<{ response_id: string }>;
}) {
  const { response_id } = await params;
  const provider = getDataProvider();
  const [profile, calibration] = await Promise.all([
    provider.getProfile(response_id),
    provider.getCurrentCalibration(),
  ]);
  if (!profile) notFound();
  const shaped = shapeIndividualDrillDown(profile, calibration?.params ?? null);
  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <Link href="/dashboard" className="text-sm text-zinc-500 underline-offset-4 hover:underline">
          ← back to ranking
        </Link>
        <IndividualDrillDown data={shaped} />
      </div>
    </main>
  );
}
