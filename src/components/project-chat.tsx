"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type MessageStatus = "planned" | "running" | "success" | "error";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: MessageStatus;
};

const statusStyles: Record<MessageStatus, string> = {
  planned: "bg-sky-500/15 text-sky-200",
  running: "bg-amber-500/15 text-amber-200",
  success: "bg-emerald-500/15 text-emerald-200",
  error: "bg-rose-500/15 text-rose-200",
};

const statusLabels: Record<MessageStatus, string> = {
  planned: "план",
  running: "сборка",
  success: "готово",
  error: "ошибка",
};

export function ProjectChat({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Опишите, что нужно сделать для проекта «${projectName}».`,
      status: "planned",
    },
  ]);
  const [draft, setDraft] = useState("");

  const canSend = draft.trim().length > 0;

  const handleSend = () => {
    if (!canSend) return;
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: draft.trim(),
    };
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "Готовим спецификацию и запускаем пайплайн генерации…",
      status: "planned",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setDraft("");

    const runningId = assistantMessage.id;
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === runningId
            ? { ...message, status: "running" }
            : message,
        ),
      );
    }, 200);

    fetch(`/api/v1/projects/${projectId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: userMessage.content }),
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message || "Generation failed");
        }
        return payload;
      })
      .then((payload) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === runningId
              ? {
                  ...message,
                  status:
                    payload.status === "running"
                      ? "running"
                      : payload.status === "success"
                        ? "success"
                        : "error",
                  content:
                    payload.status === "running"
                      ? "Сборка запущена. Логи появляются в правой панели."
                      : payload.status === "success"
                        ? "Спецификация готова. Сборка завершена."
                        : "Сборка завершилась ошибкой. Проверьте логи.",
                }
              : message,
          ),
        );
        router.refresh();
      })
      .catch((error) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === runningId
              ? {
                  ...message,
                  status: "error",
                  content:
                    error instanceof Error ? error.message : String(error),
                }
              : message,
          ),
        );
      });
  };

  const messageItems = useMemo(
    () =>
      messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex flex-col gap-2 rounded-xl border border-border/60 bg-card/60 p-4",
            message.role === "user" ? "bg-card/80" : "bg-muted/30",
          )}
        >
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
            <span>{message.role === "user" ? "Вы" : "OlyneroAI"}</span>
            {message.status ? (
              <Badge className={cn("border-0", statusStyles[message.status])}>
                {statusLabels[message.status]}
              </Badge>
            ) : null}
          </div>
          <div className="text-sm leading-relaxed text-foreground">
            {message.content}
          </div>
        </div>
      )),
    [messages],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-6">{messageItems}</div>
      <div className="border-t border-border/60 p-4">
        <div className="space-y-3">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Напишите: landing или crud customers(name, phone)..."
            rows={3}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Статусы: план → сборка → готово/ошибка
            </p>
            <Button onClick={handleSend} disabled={!canSend}>
              Отправить
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
