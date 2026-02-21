import { notFound } from "next/navigation";
import { ProjectWorkspace } from "@/components/project-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("id,name,description,status,created_at")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    notFound();
  }

  const { data: builds } = await supabase
    .from("builds")
    .select("id,status,created_at,preview_url,artifact_path,logs")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="h-full">
      <ProjectWorkspace
        projectId={project.id}
        projectName={project.name}
        initialBuilds={(builds ?? []) as any}
      />
    </div>
  );
}
