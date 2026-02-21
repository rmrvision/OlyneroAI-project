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

  // Load existing build data
  const { data: existing } = await supabase
    .from("builds")
    .select("id,project_id,logs")
    .eq("id", buildId)
    .single();

  // Parse existing stored data — preserve files and description fields
  let existingLogs: string[] = [];
  let existingFiles: unknown = null;
  let existingDescription: string | null = null;

  if (existing?.logs) {
    try {
      const parsed = JSON.parse(existing.logs as string);
      existingLogs = parsed?.logs ?? [];
      existingFiles = parsed?.files ?? null;
      existingDescription = parsed?.description ?? null;
    } catch {
      existingLogs = [String(existing.logs)];
    }
  }

  const nextLogs = [...existingLogs, ...(logs ?? [])];

  // Save updated data preserving all fields
  await supabase
    .from("builds")
    .update({
      status: status ?? "running",
      logs: JSON.stringify({
        files: existingFiles,
        description: existingDescription,
        logs: nextLogs,
      }),
      ...(previewUrl ? { preview_url: previewUrl } : {}),
      ...(artifactPath ? { artifact_path: artifactPath } : {}),
    })
    .eq("id", buildId);

  // Update project status when build finishes
  if (existing?.project_id && (status === "success" || status === "error")) {
    await supabase
      .from("projects")
      .update({ status })
      .eq("id", existing.project_id);
  }

  return NextResponse.json({ ok: true });
}
