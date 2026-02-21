"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BuildItem = {
  id: string;
  status: string;
  created_at: string;
  preview_url: string | null;
  artifact_path: string | null;
  logs: string | null;
};

export function BuildHistory({ projectId }: { projectId: string }) {
  const [builds, setBuilds] = useState<BuildItem[]>([]);
  const [polling, setPolling] = useState(false);
  const statusLabels: Record<string, string> = {
    queued: "в очереди",
    running: "сборка",
    success: "готово",
    error: "ошибка",
  };

  const fetchBuilds = async () => {
    const response = await fetch(`/api/v1/projects/${projectId}/builds`);
    if (!response.ok) return;
    const payload = await response.json();
    setBuilds(payload.builds ?? []);

    const hasRunning = (payload.builds ?? []).some(
      (build: BuildItem) =>
        build.status === "running" || build.status === "queued",
    );
    setPolling(hasRunning);
  };

  useEffect(() => {
    fetchBuilds();
  }, [projectId]);

  useEffect(() => {
    if (!polling) return;
    const timer = setInterval(fetchBuilds, 2000);
    return () => clearInterval(timer);
  }, [polling]);

  const latest = builds[0];
  let latestLogs: string[] = [];
  if (latest?.logs) {
    try {
      const parsed = JSON.parse(latest.logs);
      latestLogs = parsed?.logs ?? [];
    } catch {
      latestLogs = [latest.logs];
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Сборки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {builds.length === 0 ? (
            <p className="text-muted-foreground">Сборок пока нет.</p>
          ) : (
            builds.map((build) => (
              <div
                key={build.id}
                className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/50 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-foreground">
                      {new Date(build.created_at).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{build.id}</p>
                  </div>
                  <Badge variant="secondary">
                    {statusLabels[build.status] ?? build.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {build.preview_url ? (
                    <a
                      className="underline"
                      href={build.preview_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Превью
                    </a>
                  ) : null}
                  {build.artifact_path ? (
                    <a
                      className="underline"
                      href={`/api/v1/builds/${build.id}/artifact`}
                    >
                      Скачать zip
                    </a>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Логи последней сборки</CardTitle>
        </CardHeader>
        <CardContent>
          {latestLogs.length === 0 ? (
            <p className="text-muted-foreground">Логи появятся здесь.</p>
          ) : (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-xs text-foreground">
              {latestLogs.join("")}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
