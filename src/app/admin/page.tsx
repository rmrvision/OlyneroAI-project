import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/admin";
import { getPublicSupabaseUrl } from "@/lib/env";
import { getAppOrigin, getRunnerUrl, signRunnerPayload } from "@/lib/runner";
import { type ProjectSpec, projectSpecSchema } from "@/lib/spec";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkEndpoint } from "@/lib/system-health";
import { getTemplateCatalog } from "@/lib/templates";

function parseBuildPayload(logs: string | null): {
  spec: ProjectSpec | null;
  logs: string[];
} {
  if (!logs) return { spec: null, logs: [] };
  try {
    const parsed = JSON.parse(logs);
    const specResult = projectSpecSchema.safeParse(parsed?.spec);
    return {
      spec: specResult.success ? specResult.data : null,
      logs: Array.isArray(parsed?.logs) ? parsed.logs : [],
    };
  } catch {
    return { spec: null, logs: [logs] };
  }
}

async function logAdminAction(
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown>,
  actorId: string,
) {
  const supabase = createSupabaseAdminClient();
  await supabase.from("audit_log").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}

async function updateUserRole(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (!admin) throw new Error("Unauthorized");

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "user");
  if (!userId || !["user", "admin"].includes(role)) return;

  const supabase = createSupabaseAdminClient();
  await supabase.from("profiles").update({ role }).eq("id", userId);
  await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { role },
  });

  await logAdminAction(
    "user.role.update",
    "profile",
    userId,
    { role },
    admin.userId,
  );

  revalidatePath("/admin");
}

async function toggleUserDisabled(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (!admin) throw new Error("Unauthorized");

  const userId = String(formData.get("userId") ?? "");
  const disabled = String(formData.get("disabled") ?? "false") === "true";
  if (!userId) return;

  const supabase = createSupabaseAdminClient();
  await supabase
    .from("profiles")
    .update({ is_disabled: disabled })
    .eq("id", userId);

  await logAdminAction(
    "user.disabled.update",
    "profile",
    userId,
    { disabled },
    admin.userId,
  );

  revalidatePath("/admin");
}

async function resetUserLimits(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (!admin) throw new Error("Unauthorized");

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  const supabase = createSupabaseAdminClient();
  await supabase.from("profiles").update({ limits: {} }).eq("id", userId);

  await logAdminAction(
    "user.limits.reset",
    "profile",
    userId,
    {},
    admin.userId,
  );

  revalidatePath("/admin");
}

async function transferProject(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (!admin) throw new Error("Unauthorized");

  const projectId = String(formData.get("projectId") ?? "");
  const newOwner = String(formData.get("newOwner") ?? "").trim();
  if (!projectId || !newOwner) return;

  const supabase = createSupabaseAdminClient();
  let ownerId = newOwner;
  if (newOwner.includes("@")) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", newOwner)
      .single();
    ownerId = data?.id ?? "";
  }

  if (!ownerId) {
    throw new Error("Owner not found");
  }

  await supabase
    .from("projects")
    .update({ owner_id: ownerId })
    .eq("id", projectId);

  await logAdminAction(
    "project.transfer",
    "project",
    projectId,
    { ownerId },
    admin.userId,
  );

  revalidatePath("/admin");
}

async function deleteProject(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (!admin) throw new Error("Unauthorized");

  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return;

  const supabase = createSupabaseAdminClient();
  await supabase.from("projects").delete().eq("id", projectId);

  await logAdminAction(
    "project.delete",
    "project",
    projectId,
    {},
    admin.userId,
  );

  revalidatePath("/admin");
}

async function restartBuild(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (!admin) throw new Error("Unauthorized");

  const buildId = String(formData.get("buildId") ?? "");
  if (!buildId) return;

  const supabase = createSupabaseAdminClient();
  const { data: build } = await supabase
    .from("builds")
    .select("id,project_id,logs,projects(name)")
    .eq("id", buildId)
    .single();

  const parsed = parseBuildPayload(build?.logs ?? null);
  if (!build || !parsed.spec) {
    throw new Error("Missing spec for restart");
  }

  const { data: newBuild, error: newBuildError } = await supabase
    .from("builds")
    .insert({
      project_id: build.project_id,
      status: "queued",
      logs: JSON.stringify({ spec: parsed.spec, logs: [] }),
    })
    .select("id")
    .single();

  if (newBuildError || !newBuild) {
    throw new Error("Failed to create build");
  }

  const runnerUrl = await getRunnerUrl();
  const callbackUrl = `${await getAppOrigin()}/api/v1/runner/callback`;
  const artifactUploadUrl = `${await getAppOrigin()}/api/v1/runner/artifact`;
  const payload = {
    buildId: newBuild.id,
    projectId: build.project_id,
    projectName:
      (build as { projects?: { name?: string } })?.projects?.name ?? "Project",
    spec: parsed.spec,
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
    await supabase
      .from("builds")
      .update({ status: "error" })
      .eq("id", newBuild.id);
    throw new Error("Runner request failed");
  }

  await supabase
    .from("builds")
    .update({ status: "running" })
    .eq("id", newBuild.id);

  await logAdminAction(
    "build.restart",
    "build",
    buildId,
    { newBuildId: newBuild.id },
    admin.userId,
  );

  revalidatePath("/admin");
}

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) {
    notFound();
  }

  const supabase = createSupabaseAdminClient();
  const [usersResult, projectsResult, buildsResult, auditResult, templates] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id,email,display_name,role,is_disabled,created_at,limits")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("projects")
        .select("id,name,owner_id,status,created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("builds")
        .select(
          "id,project_id,status,created_at,preview_url,artifact_path,logs",
        )
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("audit_log")
        .select("id,actor_id,action,entity_type,entity_id,metadata,created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      getTemplateCatalog(),
    ]);

  const users = usersResult.data ?? [];
  const projects = projectsResult.data ?? [];
  const builds = buildsResult.data ?? [];
  const audit = auditResult.data ?? [];

  const supabaseUrl = getPublicSupabaseUrl();
  const runnerUrl = await getRunnerUrl();
  const [supabaseHealth, runnerHealth] = await Promise.all([
    checkEndpoint(`${supabaseUrl}/auth/v1/health`),
    checkEndpoint(`${runnerUrl}/health`),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Full control over users, projects, builds, templates, and system
          health.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {users.length === 0 ? (
            <p className="text-muted-foreground">No users yet.</p>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="flex flex-col gap-3 rounded-lg border border-border/60 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-foreground">
                      {user.email}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user.id}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{user.role}</Badge>
                    {user.is_disabled ? (
                      <Badge variant="destructive">disabled</Badge>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <form
                    action={updateUserRole}
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="userId" value={user.id} />
                    <select
                      name="role"
                      defaultValue={user.role ?? "user"}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                    <Button type="submit" size="sm" variant="secondary">
                      Update role
                    </Button>
                  </form>
                  <form action={toggleUserDisabled}>
                    <input type="hidden" name="userId" value={user.id} />
                    <input
                      type="hidden"
                      name="disabled"
                      value={user.is_disabled ? "false" : "true"}
                    />
                    <Button type="submit" size="sm" variant="destructive">
                      {user.is_disabled ? "Enable" : "Disable"}
                    </Button>
                  </form>
                  <form action={resetUserLimits}>
                    <input type="hidden" name="userId" value={user.id} />
                    <Button type="submit" size="sm" variant="outline">
                      Reset limits
                    </Button>
                  </form>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {projects.length === 0 ? (
            <p className="text-muted-foreground">No projects yet.</p>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className="flex flex-col gap-3 rounded-lg border border-border/60 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-foreground">
                      {project.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {project.id}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Owner: {project.owner_id}
                    </div>
                  </div>
                  <Badge variant="secondary">{project.status}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <form
                    action={transferProject}
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="projectId" value={project.id} />
                    <Input
                      name="newOwner"
                      placeholder="New owner email or id"
                      className="w-56"
                    />
                    <Button type="submit" size="sm" variant="secondary">
                      Transfer
                    </Button>
                  </form>
                  <form action={deleteProject}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <Button type="submit" size="sm" variant="destructive">
                      Delete
                    </Button>
                  </form>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Builds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {builds.length === 0 ? (
            <p className="text-muted-foreground">No builds yet.</p>
          ) : (
            builds.map((build) => {
              const parsed = parseBuildPayload(build.logs ?? null);
              const logText = parsed.logs.slice(-20).join("");
              return (
                <div
                  key={build.id}
                  className="flex flex-col gap-3 rounded-lg border border-border/60 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-foreground">
                        {build.id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Project: {build.project_id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(build.created_at).toLocaleString()}
                      </div>
                    </div>
                    <Badge variant="secondary">{build.status}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {build.preview_url ? (
                      <a
                        className="text-xs underline"
                        href={build.preview_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Preview
                      </a>
                    ) : null}
                    {build.artifact_path ? (
                      <a
                        className="text-xs underline"
                        href={`/api/v1/builds/${build.id}/artifact`}
                      >
                        Download zip
                      </a>
                    ) : null}
                    <form action={restartBuild}>
                      <input type="hidden" name="buildId" value={build.id} />
                      <Button type="submit" size="sm" variant="outline">
                        Restart
                      </Button>
                    </form>
                  </div>
                  <details>
                    <summary className="cursor-pointer text-xs text-muted-foreground">
                      View logs
                    </summary>
                    <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-muted/40 p-3 text-xs text-foreground">
                      {logText || "No logs yet."}
                    </pre>
                  </details>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {templates.map((template) => (
            <div
              key={template.key}
              className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
            >
              <div>
                <div className="font-medium text-foreground">
                  {template.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {template.description}
                </div>
              </div>
              <Badge variant="secondary">v{template.version}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {audit.length === 0 ? (
            <p className="text-muted-foreground">No audit entries yet.</p>
          ) : (
            audit.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-border/60 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-foreground">
                    {entry.action}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {entry.entity_type} {entry.entity_id ?? ""}
                </div>
                <div className="text-xs text-muted-foreground">
                  Actor: {entry.actor_id ?? "system"}
                </div>
                {entry.metadata ? (
                  <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-muted/40 p-2 text-xs text-foreground">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-foreground">Supabase</div>
              <div className="text-xs text-muted-foreground">{supabaseUrl}</div>
            </div>
            <Badge variant={supabaseHealth.ok ? "secondary" : "destructive"}>
              {supabaseHealth.ok ? "ok" : "down"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-foreground">Runner</div>
              <div className="text-xs text-muted-foreground">{runnerUrl}</div>
            </div>
            <Badge variant={runnerHealth.ok ? "secondary" : "destructive"}>
              {runnerHealth.ok ? "ok" : "down"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
