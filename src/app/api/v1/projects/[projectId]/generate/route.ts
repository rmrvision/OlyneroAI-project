import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { runLocalBuild, generateProjectFromSpec } from "@/lib/generator";
import { parsePromptToSpec } from "@/lib/spec";
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
  const supabase = await createSupabaseServerClient();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,name,owner_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  const { prompt } = requestSchema.parse(await request.json());
  const spec = parsePromptToSpec(prompt, project.name);

  const { data: build, error: buildError } = await supabase
    .from("builds")
    .insert({
      project_id: project.id,
      status: "planned",
      logs: JSON.stringify({ spec, logs: [] }),
    })
    .select("id,status,created_at")
    .single();

  if (buildError || !build) {
    return NextResponse.json({ message: "Failed to create build" }, { status: 500 });
  }

  await supabase
    .from("builds")
    .update({ status: "running" })
    .eq("id", build.id);

  let status: "success" | "error" = "success";
  let logs: string[] = [];

  try {
    const workspaceDir = await generateProjectFromSpec(spec, {
      projectId: project.id,
      buildId: build.id,
    });

    const buildResult = await runLocalBuild(workspaceDir);
    logs = buildResult.logs;
    status = buildResult.ok ? "success" : "error";
  } catch (error) {
    status = "error";
    logs = [error instanceof Error ? error.message : String(error)];
  }

  await supabase
    .from("builds")
    .update({
      status,
      logs: JSON.stringify({ spec, logs }),
    })
    .eq("id", build.id);

  return NextResponse.json({
    buildId: build.id,
    status,
    spec,
  });
}
