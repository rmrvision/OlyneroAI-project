import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getAppOrigin, getRunnerUrl, signRunnerPayload } from "@/lib/runner";
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
      status: "queued",
      logs: JSON.stringify({ spec, logs: [] }),
    })
    .select("id,status,created_at")
    .single();

  if (buildError || !build) {
    return NextResponse.json({ message: "Failed to create build" }, { status: 500 });
  }

  const runnerUrl = await getRunnerUrl();
  const callbackUrl = `${await getAppOrigin()}/api/v1/runner/callback`;
  const payload = {
    buildId: build.id,
    projectId: project.id,
    projectName: project.name,
    spec,
    callbackUrl,
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
    await supabase
      .from("builds")
      .update({ status: "error" })
      .eq("id", build.id);
    return NextResponse.json({ message: errorText }, { status: 500 });
  }

  await supabase.from("builds").update({ status: "running" }).eq("id", build.id);

  return NextResponse.json({
    buildId: build.id,
    status: "running",
    spec,
  });
}
