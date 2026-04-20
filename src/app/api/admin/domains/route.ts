import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isErrorResponse } from "@/lib/auth/middleware.ts";
import {
  addDomain,
  DomainValidationError,
  listDomains,
  validateDomain,
} from "@/lib/auth/domains.ts";

export async function GET() {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;
  const rows = await listDomains();
  return NextResponse.json({
    domains: rows.map((r) => ({
      domain: r.domain,
      added_by: r.addedBy,
      added_at: r.addedAt.toISOString(),
    })),
  });
}

const PostBody = z.object({ domain: z.string().min(1) });

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = PostBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const check = validateDomain(parsed.data.domain);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  try {
    const row = await addDomain(check.domain, session.email);
    return NextResponse.json(
      {
        domain: row.domain,
        added_by: row.addedBy,
        added_at: row.addedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof DomainValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[admin/domains POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
