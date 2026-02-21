import { NextResponse } from "next/server";
import { z } from "zod";
import { generateSpecFromPrompt } from "@/lib/ai/spec";
import { getSessionUser } from "@/lib/auth";
import { getAppOrigin, getRunnerUrl, signRunnerPayload } from "@/lib/runner";
import type { ProjectSpec } from "@/lib/spec";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  prompt: z.string().min(3),
  projectName: z.string().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { prompt, projectName } = requestSchema.parse(await request.json());
  let spec: ProjectSpec;
  try {
    spec = await generateSpecFromPrompt({ prompt, projectName });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Не удалось создать спецификацию";
    return NextResponse.json({ message }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      name: spec.projectName,
      description: prompt,
      status: "draft",
    })
    .select("id,name,owner_id")
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { message: "Failed to create project" },
      { status: 500 },
    );
  }

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
    return NextResponse.json(
      { message: "Failed to create build" },
      { status: 500 },
    );
  }

  const runnerUrl = await getRunnerUrl();
  const callbackUrl = `${await getAppOrigin()}/api/v1/runner/callback`;
  const artifactUploadUrl = `${await getAppOrigin()}/api/v1/runner/artifact`;
  const payload = {
    buildId: build.id,
    projectId: project.id,
    projectName: project.name,
    spec,
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
    await supabase
      .from("builds")
      .update({ status: "error" })
      .eq("id", build.id);
    await supabase
      .from("projects")
      .update({ status: "error" })
      .eq("id", project.id);

    return NextResponse.json({ message: errorText }, { status: 500 });
  }

  await supabase
    .from("builds")
    .update({ status: "running" })
    .eq("id", build.id);
  await supabase
    .from("projects")
    .update({ status: "running" })
    .eq("id", project.id);

  return NextResponse.json({
    projectId: project.id,
    buildId: build.id,
    status: "running",
    spec,
  });
}
