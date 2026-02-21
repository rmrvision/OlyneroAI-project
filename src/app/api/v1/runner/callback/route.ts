import { NextResponse } from "next/server";
import { verifyRunnerSignature } from "@/lib/runner";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const payload = await request.json();
  const signature = request.headers.get("x-olynero-signature");
  const timestamp = request.headers.get("x-olynero-timestamp");

  if (!verifyRunnerSignature(signature, timestamp, payload)) {
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  }

  const { buildId, status, logs, previewUrl, artifactPath } = payload ?? {};
  if (!buildId) {
    return NextResponse.json({ message: "Missing buildId" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: existing } = await supabase
    .from("builds")
    .select("logs")
    .eq("id", buildId)
    .single();

  let existingLogs: string[] = [];
  let existingSpec: unknown = null;

  if (existing?.logs) {
    try {
      const parsed = JSON.parse(existing.logs as string);
      existingLogs = parsed?.logs ?? [];
      existingSpec = parsed?.spec ?? null;
    } catch {
      existingLogs = [String(existing.logs)];
    }
  }

  const nextLogs = [...existingLogs, ...(logs ?? [])];

  await supabase
    .from("builds")
    .update({
      status: status ?? "running",
      logs: JSON.stringify({ spec: existingSpec, logs: nextLogs }),
      preview_url: previewUrl ?? undefined,
      artifact_path: artifactPath ?? undefined,
    })
    .eq("id", buildId);

  return NextResponse.json({ ok: true });
}
