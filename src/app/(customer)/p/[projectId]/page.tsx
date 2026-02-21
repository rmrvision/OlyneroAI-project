import { notFound } from "next/navigation";
import { ProjectChat } from "@/components/project-chat";
import { BuildHistory } from "@/components/build-history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProjectSpec } from "@/lib/spec";

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
    .select("id,status,created_at,preview_url,artifact_path,logs")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(5);

  let latestSpec: ProjectSpec | null = null;
  if (builds && builds.length > 0) {
    if (builds[0].logs) {
      try {
        const parsed = JSON.parse(builds[0].logs as string);
        latestSpec = parsed?.spec ?? null;
      } catch {
        latestSpec = null;
      }
    }
  }

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
        <ProjectChat projectId={project.id} projectName={project.name} />
      </Card>
      <div className="flex h-full flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spec</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {latestSpec ? (
              <pre className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-xs text-foreground">
                {JSON.stringify(latestSpec, null, 2)}
              </pre>
            ) : (
              <p>Generate a spec from chat to see structured requirements here.</p>
            )}
          </CardContent>
        </Card>
        <BuildHistory projectId={project.id} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview links</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="space-y-2">
              {builds && builds[0]?.preview_url ? (
                <a
                  className="underline"
                  href={builds[0].preview_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open preview
                </a>
              ) : (
                <p>Preview URLs will appear after the first successful build.</p>
              )}
              {builds && builds[0]?.artifact_path ? (
                <a
                  className="underline"
                  href={`/api/v1/builds/${builds[0].id}/artifact`}
                >
                  Download zip
                </a>
              ) : (
                <p>Zip artifacts appear after the build finishes.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
