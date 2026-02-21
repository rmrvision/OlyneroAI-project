import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("builds")
    .select("id,status,created_at,preview_url,artifact_path,logs")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ builds: data ?? [] });
}
