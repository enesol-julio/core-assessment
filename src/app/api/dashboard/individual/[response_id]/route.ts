import { NextResponse } from "next/server";
import { isErrorResponse, requireAdmin } from "@/lib/auth/middleware";
import { getDataProvider } from "@/services/dashboard/providers/postgres-provider";
import { shapeIndividualDrillDown } from "@/services/dashboard/transforms/individual";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ response_id: string }> },
) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;
  const { response_id } = await params;
  const provider = getDataProvider();
  const [profile, calibration] = await Promise.all([
    provider.getProfile(response_id),
    provider.getCurrentCalibration(),
  ]);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(shapeIndividualDrillDown(profile, calibration?.params ?? null));
}
