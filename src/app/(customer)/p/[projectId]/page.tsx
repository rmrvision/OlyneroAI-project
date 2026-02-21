import { notFound } from "next/navigation";
import { ProjectChat } from "@/components/project-chat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProjectChatPage({
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
    .select("id,status,created_at,preview_url,artifact_path")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="flex h-full flex-col overflow-hidden">
        <CardHeader className="border-b border-border/60">
          <CardTitle className="flex items-center justify-between">
            <span className="text-lg">{project.name}</span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {project.status}
            </span>
          </CardTitle>
        </CardHeader>
        <ProjectChat projectName={project.name} />
      </Card>
      <div className="flex h-full flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spec</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Generate a spec from chat to see structured requirements here.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Build history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {builds && builds.length > 0 ? (
              builds.map((build) => (
                <div
                  key={build.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
                >
                  <div>
                    <p className="text-foreground">{build.status}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(build.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">Build</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No builds yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview links</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Preview URLs will appear after the first successful build.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
