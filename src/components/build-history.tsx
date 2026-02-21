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

  const fetchBuilds = async () => {
    const response = await fetch(`/api/v1/projects/${projectId}/builds`);
    if (!response.ok) return;
    const payload = await response.json();
    setBuilds(payload.builds ?? []);

    const hasRunning = (payload.builds ?? []).some(
      (build: BuildItem) => build.status === "running" || build.status === "queued",
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
          <CardTitle className="text-base">Build history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {builds.length === 0 ? (
            <p className="text-muted-foreground">No builds yet.</p>
          ) : (
            builds.map((build) => (
              <div
                key={build.id}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
              >
                <div>
                  <p className="text-foreground">
                    {new Date(build.created_at).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">{build.id}</p>
                </div>
                <Badge variant="secondary">{build.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {latestLogs.length === 0 ? (
            <p className="text-muted-foreground">Logs will appear here.</p>
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
