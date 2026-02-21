import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ buildId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { buildId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: build, error } = await supabase
    .from("builds")
    .select("id,status,logs,preview_url,artifact_path,project_id")
    .eq("id", buildId)
    .single();

  if (error || !build) {
    return NextResponse.json({ message: "Build not found" }, { status: 404 });
  }

  let logLines: string[] = [];
  if (build.logs) {
    try {
      const parsed = JSON.parse(build.logs as string);
      logLines = parsed?.logs ?? [];
    } catch {
      logLines = [String(build.logs)];
    }
  }

  return NextResponse.json({
    buildId: build.id,
    status: build.status,
    preview_url: build.preview_url,
    artifact_path: build.artifact_path,
    logs: logLines.join(""),
  });
}
