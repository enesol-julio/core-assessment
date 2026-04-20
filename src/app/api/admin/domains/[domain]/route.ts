import { NextResponse } from "next/server";
import { isErrorResponse, requireAdmin } from "@/lib/auth/middleware.ts";
import { removeDomain } from "@/lib/auth/domains.ts";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ domain: string }> },
) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;
  const { domain } = await params;
  const result = await removeDomain(decodeURIComponent(domain));
  if (!result.removed) {
    const status = result.reason?.includes("last") ? 409 : 400;
    return NextResponse.json({ error: result.reason ?? "Unable to remove domain" }, { status });
  }
  return NextResponse.json({ ok: true });
}
