import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyRunnerSignature } from "@/lib/runner";

export async function POST(request: Request) {
  const signature = request.headers.get("x-olynero-signature");
  const timestamp = request.headers.get("x-olynero-timestamp");

  const formData = await request.formData();
  const buildId = formData.get("buildId");
  const projectId = formData.get("projectId");
  const artifact = formData.get("artifact");

  if (typeof buildId !== "string" || typeof projectId !== "string") {
    return NextResponse.json({ message: "Missing build metadata" }, { status: 400 });
  }

  const payload = { buildId, projectId };
  if (!verifyRunnerSignature(signature, timestamp, payload)) {
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  }

  if (!(artifact instanceof File)) {
    return NextResponse.json({ message: "Missing artifact file" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: build, error: buildError } = await supabase
    .from("builds")
    .select("project_id")
    .eq("id", buildId)
    .single();

  if (buildError || !build) {
    return NextResponse.json({ message: "Build not found" }, { status: 404 });
  }

  if (build.project_id !== projectId) {
    return NextResponse.json({ message: "Project mismatch" }, { status: 400 });
  }

  const artifactPath = `${projectId}/${buildId}/artifact.zip`;
  const buffer = Buffer.from(await artifact.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("artifacts")
    .upload(artifactPath, buffer, {
      contentType: "application/zip",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ message: uploadError.message }, { status: 500 });
  }

  await supabase
    .from("builds")
    .update({ artifact_path: artifactPath })
    .eq("id", buildId);

  return NextResponse.json({ ok: true, artifactPath });
}
