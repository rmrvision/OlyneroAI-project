import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
    .select("id,artifact_path")
    .eq("id", buildId)
    .single();

  if (error || !build) {
    return NextResponse.json({ message: "Build not found" }, { status: 404 });
  }

  if (!build.artifact_path) {
    return NextResponse.json(
      { message: "Artifact not ready" },
      { status: 404 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: file, error: downloadError } = await admin.storage
    .from("artifacts")
    .download(build.artifact_path);

  if (downloadError || !file) {
    return NextResponse.json({ message: "Artifact missing" }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="artifact-${buildId}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
