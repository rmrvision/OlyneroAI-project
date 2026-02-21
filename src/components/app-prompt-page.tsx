"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import RuixenMoonChat from "@/components/ui/ruixen-moon-chat";

const DEFAULT_PROMPT_URL = "/prompts/olynero-default.txt";
const FALLBACK_PROMPT =
  "Опишите задачу: landing или crud customers(name, phone).";

export default function AppPromptPage() {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);
  const [defaultPrompt, setDefaultPrompt] = useState("");

  useEffect(() => {
    let active = true;
    fetch(DEFAULT_PROMPT_URL)
      .then((response) => (response.ok ? response.text() : ""))
      .then((text) => {
        if (!active) return;
        setDefaultPrompt(text.trim());
      })
      .catch(() => {
        if (!active) return;
        setDefaultPrompt("");
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSend = async (message: string) => {
    setIsSending(true);
    try {
      const response = await fetch("/api/v1/quick-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: message }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Ошибка запуска генерации");
      }
      toast.success("Генерация запущена. Открываю проект...");
      router.push(`/p/${payload.projectId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось запустить генерацию",
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-full">
      <RuixenMoonChat
        initialMessage={defaultPrompt || FALLBACK_PROMPT}
        onSend={handleSend}
        isSending={isSending}
      />
    </div>
  );
}
