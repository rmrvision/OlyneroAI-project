"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
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

async function pollBuildStatus(
  buildId: string,
  onUpdate: (data: { status: BuildStatus; logs: string; preview_url: string | null }) => void,
  signal: AbortSignal,
) {
  while (!signal.aborted) {
    try {
      const res = await fetch(`/api/v1/builds/${buildId}/logs`);
      if (res.ok) {
        const data = await res.json();
        onUpdate({
          status: data.status,
          logs: data.logs ?? "",
          preview_url: data.preview_url ?? null,
        });
        if (data.status === "success" || data.status === "error") break;
      }
    } catch { /* ignore */ }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

export function ProjectWorkspace({
  projectId,
  projectName,
  initialBuilds,
}: {
  projectId: string;
  projectName: string;
  initialBuilds: Build[];
}) {
  const [builds, setBuilds] = useState<Build[]>(initialBuilds);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Проект «${projectName}» создан. Приложение собирается. Можете уже описывать изменения — они применятся после завершения сборки.`,
      status: "done",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [previewTab, setPreviewTab] = useState<"preview" | "logs">("preview");
  const [liveLogs, setLiveLogs] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pollAbortRef = useRef<AbortController | null>(null);

  const latestBuild = builds[0] ?? null;
  const isBuilding = latestBuild?.status === "queued" || latestBuild?.status === "running";
  const previewUrl = latestBuild?.status === "success" ? latestBuild.preview_url : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveLogs]);

  // Poll build when running
  useEffect(() => {
    if (!latestBuild) return;
    if (latestBuild.status !== "queued" && latestBuild.status !== "running") return;

    pollAbortRef.current?.abort();
    const controller = new AbortController();
    pollAbortRef.current = controller;

    pollBuildStatus(
      latestBuild.id,
      ({ status, logs, preview_url }) => {
        setLiveLogs(logs);
        setBuilds((prev) =>
          prev.map((b) =>
            b.id === latestBuild.id
              ? { ...b, status, preview_url: preview_url ?? b.preview_url }
              : b,
          ),
        );
        if (status === "success") {
          toast.success("Сборка завершена! Превью готово.");
          setPreviewTab("preview");
          setMessages((prev) =>
            prev.map((m) =>
              m.buildId === latestBuild.id
                ? { ...m, status: "done", content: m.content.includes("✅") ? m.content : m.content + "\n\n✅ Готово. Превью открыто справа." }
                : m,
            ),
          );
        } else if (status === "error") {
          toast.error("Ошибка сборки. Проверьте логи.");
          setMessages((prev) =>
            prev.map((m) =>
              m.buildId === latestBuild.id
                ? { ...m, status: "error", content: m.content.includes("❌") ? m.content : m.content + "\n\n❌ Ошибка сборки." }
                : m,
            ),
          );
        }
      },
      controller.signal,
    );

    return () => controller.abort();
  }, [latestBuild?.id, latestBuild?.status]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || isSending) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const aId = crypto.randomUUID();
    const assistantMsg: Message = {
      id: aId,
      role: "assistant",
      content: "Генерирую изменения с помощью AI...",
      status: "loading",
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setDraft("");
    setIsSending(true);
    setLiveLogs("");
    setPreviewTab("logs");

    try {
      const res = await fetch(`/api/v1/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.message || "Ошибка");

      const newBuild: Build = {
        id: payload.buildId,
        status: "running",
        preview_url: null,
        artifact_path: null,
        created_at: new Date().toISOString(),
      };
      setBuilds((prev) => [newBuild, ...prev]);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aId
            ? {
                ...m,
                content: `${payload.description}\n\nСборка запущена (${payload.changedFiles} файлов). Слежу за прогрессом...`,
                status: "loading",
                buildId: payload.buildId,
              }
            : m,
        ),
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Неизвестная ошибка";
      toast.error(msg);
      setMessages((prev) =>
        prev.map((m) => (m.id === aId ? { ...m, content: msg, status: "error" } : m)),
      );
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  }, [draft, isSending, projectId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Chat */}
      <div className="flex w-[360px] flex-shrink-0 flex-col border-r border-border/50 bg-background">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{projectName}</h2>
            <BuildStatusBadge status={latestBuild?.status} isBuilding={isBuilding} />
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => window.location.reload()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border/50 p-3">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Опишите изменения... (Ctrl+Enter)"
            rows={3}
            className="resize-none text-sm"
            disabled={isSending}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Ctrl+Enter</span>
            <Button size="sm" onClick={handleSend} disabled={!draft.trim() || isSending} className="h-8 gap-1.5">
              {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Отправить
            </Button>
          </div>
        </div>
      </div>

      {/* Right: Preview + Logs */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/50 bg-muted/20 px-4 py-2">
          <div className="flex items-center gap-1 rounded-lg bg-muted/40 p-0.5">
            <TabBtn active={previewTab === "preview"} onClick={() => setPreviewTab("preview")} icon={<MonitorSmartphone className="h-3.5 w-3.5" />} label="Превью" />
            <TabBtn active={previewTab === "logs"} onClick={() => setPreviewTab("logs")} icon={<Terminal className="h-3.5 w-3.5" />} label="Логи" badge={isBuilding} />
          </div>
          <div className="flex items-center gap-1.5">
            {previewUrl && (
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" asChild>
                <a href={previewUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" />Открыть</a>
              </Button>
            )}
            {latestBuild?.artifact_path && (
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" asChild>
                <a href={`/api/v1/builds/${latestBuild.id}/artifact`}><Download className="h-3 w-3" />Zip</a>
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {previewTab === "preview" ? (
            <PreviewPanel previewUrl={previewUrl} isBuilding={isBuilding} buildStatus={latestBuild?.status} onShowLogs={() => setPreviewTab("logs")} />
          ) : (
            <LogsPanel logs={liveLogs} logsEndRef={logsEndRef} />
          )}
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: boolean }) {
  return (
    <button onClick={onClick} className={cn("relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all", active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
      {icon}{label}
      {badge && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />}
    </button>
  );
}

function BuildStatusBadge({ status, isBuilding }: { status?: BuildStatus; isBuilding: boolean }) {
  if (!status) return <p className="text-xs text-muted-foreground">нет сборок</p>;
  const cfg = {
    queued: { label: "в очереди", cls: "text-sky-500", Icon: Clock },
    running: { label: "собирается", cls: "text-amber-500", Icon: Loader2 },
    success: { label: "готово", cls: "text-emerald-500", Icon: CheckCircle2 },
    error: { label: "ошибка", cls: "text-rose-500", Icon: AlertCircle },
  }[status];
  return (
    <div className={cn("flex items-center gap-1 text-xs", cfg.cls)}>
      <cfg.Icon className={cn("h-3 w-3", isBuilding && "animate-spin")} />
      <span>{cfg.label}</span>
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed", isUser ? "bg-primary text-primary-foreground" : "bg-muted/70 text-foreground")}>
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.status === "loading" && (
          <div className="mt-1 flex items-center gap-1 text-[11px] opacity-60">
            <Loader2 className="h-3 w-3 animate-spin" />обрабатываю...
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewPanel({ previewUrl, isBuilding, buildStatus, onShowLogs }: { previewUrl: string | null; isBuilding: boolean; buildStatus?: BuildStatus; onShowLogs: () => void }) {
  if (previewUrl) {
    return <iframe src={previewUrl} className="h-full w-full border-0" title="App Preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />;
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-10 text-center">
      {isBuilding ? (
        <>
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-border/20" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
          </div>
          <div className="space-y-1.5">
            <p className="text-base font-medium">Собираем приложение...</p>
            <p className="text-sm text-muted-foreground">Займёт 1–3 минуты</p>
            <button onClick={onShowLogs} className="mt-2 text-xs text-primary underline underline-offset-2">Смотреть логи →</button>
          </div>
        </>
      ) : buildStatus === "error" ? (
        <>
          <AlertCircle className="h-12 w-12 text-rose-400" />
          <div className="space-y-1">
            <p className="font-medium">Ошибка сборки</p>
            <p className="text-sm text-muted-foreground">Проверьте логи и перефразируйте запрос</p>
            <button onClick={onShowLogs} className="mt-2 text-xs text-primary underline underline-offset-2">Открыть логи →</button>
          </div>
        </>
      ) : (
        <>
          <MonitorSmartphone className="h-12 w-12 text-muted-foreground/30" />
          <div className="space-y-1">
            <p className="font-medium">Превью появится здесь</p>
            <p className="text-sm text-muted-foreground">После успешной сборки приложение откроется автоматически</p>
          </div>
        </>
      )}
    </div>
  );
}

function LogsPanel({ logs, logsEndRef }: { logs: string; logsEndRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div className="h-full overflow-auto bg-zinc-950 p-4 font-mono">
      <pre className="text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap">
        {logs || <span className="text-zinc-600">{"Ожидаем логи сборки...\n(обновляется каждые 3 секунды)"}</span>}
      </pre>
      <div ref={logsEndRef} />
    </div>
  );
}
