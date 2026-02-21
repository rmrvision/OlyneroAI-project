import { NextResponse } from "next/server";
import { z } from "zod";
import { iterateProjectFiles, type GeneratedFile } from "@/lib/ai/codegen";
import { getSessionUser } from "@/lib/auth";
import { getAppOrigin, getRunnerUrl, signRunnerPayload } from "@/lib/runner";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  prompt: z.string().min(3),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const { prompt } = requestSchema.parse(await request.json());

  const supabase = await createSupabaseServerClient();

  // Get project and verify ownership
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,name,owner_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project || project.owner_id !== user.id) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  // Get latest build to extract existing files
  const { data: latestBuild } = await supabase
    .from("builds")
    .select("id,logs")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let existingFiles: GeneratedFile[] = [];
  if (latestBuild?.logs) {
    try {
      const parsed = JSON.parse(latestBuild.logs as string);
      existingFiles = parsed?.files ?? [];
    } catch {
      existingFiles = [];
    }
  }

  // Generate updated files with AI
  let iterResult: Awaited<ReturnType<typeof iterateProjectFiles>>;
  try {
    iterResult = await iterateProjectFiles({ prompt, existingFiles });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось обработать запрос";
    return NextResponse.json({ message }, { status: 400 });
  }

  // Merge updated files with existing files
  const updatedFilesMap = new Map<string, string>(
    existingFiles.map((f) => [f.path, f.content]),
  );
  for (const f of iterResult.files) {
    updatedFilesMap.set(f.path, f.content);
  }
  const mergedFiles: GeneratedFile[] = Array.from(updatedFilesMap.entries()).map(
    ([path, content]) => ({ path, content }),
  );

  // Create new build record
  const { data: build, error: buildError } = await supabase
    .from("builds")
    .insert({
      project_id: project.id,
      status: "queued",
      logs: JSON.stringify({
        files: mergedFiles,
        description: iterResult.description,
        logs: [],
      }),
    })
    .select("id,status")
    .single();

  if (buildError || !build) {
    return NextResponse.json(
      { message: "Failed to create build" },
      { status: 500 },
    );
  }

  // Send to runner
  const runnerUrl = await getRunnerUrl();
  const callbackUrl = `${await getAppOrigin()}/api/v1/runner/callback`;
  const artifactUploadUrl = `${await getAppOrigin()}/api/v1/runner/artifact`;

  const payload = {
    buildId: build.id,
    projectId: project.id,
    projectName: project.name,
    files: mergedFiles,
    callbackUrl,
    artifactUploadUrl,
  };

  const { signature, timestamp, body } = signRunnerPayload(payload);
  const runnerResponse = await fetch(`${runnerUrl}/runs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-olynero-signature": signature,
      "x-olynero-timestamp": timestamp,
    },
    body,
  });

  if (!runnerResponse.ok) {
    const errorText = await runnerResponse.text();
    await supabase.from("builds").update({ status: "error" }).eq("id", build.id);
    return NextResponse.json({ message: errorText }, { status: 500 });
  }

  await supabase.from("builds").update({ status: "running" }).eq("id", build.id);
  await supabase.from("projects").update({ status: "running" }).eq("id", project.id);

  return NextResponse.json({
    buildId: build.id,
    status: "running",
    description: iterResult.description,
    changedFiles: iterResult.files.length,
  });
}
