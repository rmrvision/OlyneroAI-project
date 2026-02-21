"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBrowserClient } from "@supabase/ssr";
import {
  Send,
  Loader2,
  RefreshCw,
  ExternalLink,
  Download,
  MonitorSmartphone,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type BuildStatus = "queued" | "running" | "success" | "error";

type Build = {
  id: string;
  status: BuildStatus;
  preview_url: string | null;
  artifact_path: string | null;
  created_at: string;
  logs?: string | null;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "loading" | "done" | "error";
  buildId?: string;
};

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export function ProjectWorkspace({
  projectId,
  projectName,
  initialBuilds,
}: {
  projectId: string;
  projectName: string;
  initialBuilds: Build[];
}) {
  const router = useRouter();
  const [builds, setBuilds] = useState<Build[]>(initialBuilds);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Проект «${projectName}» создан. Приложение собирается в фоне. Вы можете описать изменения прямо сейчас — они применятся после готовности сборки.`,
      status: "done",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [previewTab, setPreviewTab] = useState<"preview" | "logs">("preview");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const latestBuild = builds[0] ?? null;
  const isBuilding = latestBuild?.status === "queued" || latestBuild?.status === "running";
  const previewUrl = latestBuild?.status === "success" ? latestBuild.preview_url : null;

  // Scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Subscribe to build status changes via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`builds:project_id=eq.${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "builds",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const updatedBuild = payload.new as Build;
          setBuilds((prev) => {
            const exists = prev.find((b) => b.id === updatedBuild.id);
            if (exists) {
              return prev.map((b) => (b.id === updatedBuild.id ? updatedBuild : b));
            }
            return [updatedBuild, ...prev];
          });

          // Show toast on build completion
          if (updatedBuild.status === "success") {
            toast.success("Сборка завершена! Превью готово.");
            setMessages((prev) =>
              prev.map((m) =>
                m.buildId === updatedBuild.id && m.role === "assistant"
                  ? {
                      ...m,
                      status: "done",
                      content:
                        m.content +
                        "\n\n✅ Сборка завершена. Превью доступно справа.",
                    }
                  : m,
              ),
            );
          } else if (updatedBuild.status === "error") {
            toast.error("Ошибка сборки. Проверьте логи.");
            setMessages((prev) =>
              prev.map((m) =>
                m.buildId === updatedBuild.id && m.role === "assistant"
                  ? { ...m, status: "error", content: m.content + "\n\n❌ Ошибка сборки." }
                  : m,
              ),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || isSending) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "Генерирую изменения...",
      status: "loading",
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setDraft("");
    setIsSending(true);

    try {
      const response = await fetch(
        `/api/v1/projects/${projectId}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text }),
        },
      );

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Ошибка");
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? {
                ...m,
                content: `${payload.description}\n\nСборка запущена (${payload.changedFiles} файлов изменено). Жду завершения...`,
                status: "loading",
                buildId: payload.buildId,
              }
            : m,
        ),
      );
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Неизвестная ошибка";
      toast.error(errorMsg);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: errorMsg, status: "error" }
            : m,
        ),
      );
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  }, [draft, isSending, projectId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Left panel: Chat */}
      <div className="flex w-[380px] flex-shrink-0 flex-col border-r border-border/60">
        {/* Project header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{projectName}</h2>
            <BuildStatusBadge status={latestBuild?.status} isBuilding={isBuilding} />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => router.refresh()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border/60 p-4">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Опишите изменения... (Ctrl+Enter для отправки)"
            rows={3}
            className="resize-none text-sm"
            disabled={isSending}
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Ctrl+Enter</p>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!draft.trim() || isSending}
            >
              {isSending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-3.5 w-3.5" />
              )}
              Отправить
            </Button>
          </div>
        </div>
      </div>

      {/* Right panel: Preview */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Preview toolbar */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPreviewTab("preview")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                previewTab === "preview"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <MonitorSmartphone className="h-3.5 w-3.5" />
              Превью
            </button>
            <button
              onClick={() => setPreviewTab("logs")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                previewTab === "logs"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Terminal className="h-3.5 w-3.5" />
              Логи
            </button>
          </div>

          <div className="flex items-center gap-2">
            {previewUrl && (
              <>
                <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                  <a href={previewUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1 h-3 w-3" />
                    Открыть
                  </a>
                </Button>
              </>
            )}
            {latestBuild?.artifact_path && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                <a href={`/api/v1/builds/${latestBuild.id}/artifact`}>
                  <Download className="mr-1 h-3 w-3" />
                  Скачать
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Preview content */}
        <div className="flex-1 overflow-hidden">
          {previewTab === "preview" ? (
            <PreviewPanel
              previewUrl={previewUrl}
              isBuilding={isBuilding}
              buildStatus={latestBuild?.status}
            />
          ) : (
            <LogsPanel builds={builds} />
          )}
        </div>
      </div>
    </div>
  );
}

function BuildStatusBadge({
  status,
  isBuilding,
}: {
  status?: BuildStatus;
  isBuilding: boolean;
}) {
  if (!status) {
    return <p className="text-xs text-muted-foreground">нет сборок</p>;
  }

  const configs = {
    queued: { label: "в очереди", className: "text-sky-500", icon: Clock },
    running: { label: "собирается", className: "text-amber-500", icon: Loader2 },
    success: { label: "готово", className: "text-emerald-500", icon: CheckCircle2 },
    error: { label: "ошибка", className: "text-rose-500", icon: AlertCircle },
  };

  const cfg = configs[status];
  const Icon = cfg.icon;

  return (
    <div className={cn("flex items-center gap-1 text-xs", cfg.className)}>
      <Icon className={cn("h-3 w-3", isBuilding && "animate-spin")} />
      <span>{cfg.label}</span>
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted/60 text-foreground",
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.status === "loading" && (
          <div className="mt-1.5 flex items-center gap-1 text-xs opacity-60">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>генерирую...</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewPanel({
  previewUrl,
  isBuilding,
  buildStatus,
}: {
  previewUrl: string | null;
  isBuilding: boolean;
  buildStatus?: BuildStatus;
}) {
  if (previewUrl) {
    return (
      <iframe
        src={previewUrl}
        className="h-full w-full border-0"
        title="Preview"
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      {isBuilding ? (
        <>
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-border/30" />
            <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-primary" />
          </div>
          <div>
            <p className="text-base font-medium text-foreground">
              Собираем приложение...
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Это займёт 1–3 минуты. Переключитесь на Логи чтобы видеть прогресс.
            </p>
          </div>
        </>
      ) : buildStatus === "error" ? (
        <>
          <AlertCircle className="h-12 w-12 text-rose-400" />
          <div>
            <p className="text-base font-medium text-foreground">Ошибка сборки</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Проверьте логи и попробуйте переформулировать запрос.
            </p>
          </div>
        </>
      ) : (
        <>
          <MonitorSmartphone className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="text-base font-medium text-foreground">
              Превью появится здесь
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              После успешной сборки приложение откроется автоматически.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function LogsPanel({ builds }: { builds: Build[] }) {
  const latestBuild = builds[0];
  const [logs, setLogs] = useState<string>("");

  useEffect(() => {
    if (!latestBuild) return;

    // Subscribe to build log updates
    const channel = supabase
      .channel(`build-logs-${latestBuild.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "builds",
          filter: `id=eq.${latestBuild.id}`,
        },
        (payload) => {
          const build = payload.new as { logs?: string };
          if (build.logs) {
            try {
              const parsed = JSON.parse(build.logs);
              const logLines = parsed?.logs ?? [];
              setLogs(Array.isArray(logLines) ? logLines.join("") : String(logLines));
            } catch {
              // ignore
            }
          }
        },
      )
      .subscribe();

    // Load initial logs
    if (latestBuild.logs) {
      // logs stored in DB are the raw log string or JSON
    }

    return () => { supabase.removeChannel(channel); };
  }, [latestBuild?.id]);

  return (
    <div className="h-full overflow-auto bg-zinc-950 p-4">
      <pre className="font-mono text-xs text-zinc-300 whitespace-pre-wrap">
        {logs || "Ожидаем логи..."}
      </pre>
    </div>
  );
}
