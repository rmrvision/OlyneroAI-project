"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUp, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const PROMPT_EXAMPLES = [
  "Лендинг для IT-стартапа с секциями: герой, преимущества, тарифы и форма обратной связи",
  "Корпоративный сайт юридической фирмы с командой и практиками",
  "Портфолио разработчика с проектами и контактной формой",
  "SaaS лендинг для B2B-сервиса автоматизации маркетинга",
  "Каталог товаров с карточками, фильтрами и корзиной",
];

export default function AppPromptPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (text?: string) => {
    const finalPrompt = (text ?? prompt).trim();
    if (!finalPrompt || isGenerating) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/v1/quick-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Ошибка генерации");
      }
      toast.success("Генерация запущена! Открываю проект...");
      router.push(`/p/${payload.projectId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось запустить генерацию",
      );
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      {/* Header */}
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Что будем создавать?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Опишите приложение и AI сгенерирует полноценный React-проект
        </p>
      </div>

      {/* Prompt box */}
      <div className="w-full max-w-2xl">
        <div className="relative rounded-2xl border border-border/60 bg-card shadow-lg">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Опишите что хотите создать... Например: лендинг для IT-стартапа с тёмной темой и секциями о продукте, команде и ценах"
            rows={4}
            className="w-full resize-none rounded-2xl bg-transparent px-5 pt-5 pb-14 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            disabled={isGenerating}
          />
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Enter для отправки</span>
            <Button
              size="icon"
              className="h-8 w-8 rounded-xl"
              onClick={() => handleGenerate()}
              disabled={!prompt.trim() || isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Example prompts */}
        <div className="mt-4">
          <p className="mb-3 text-xs text-muted-foreground">Примеры:</p>
          <div className="flex flex-col gap-2">
            {PROMPT_EXAMPLES.map((example) => (
              <button
                key={example}
                onClick={() => {
                  setPrompt(example);
                  handleGenerate(example);
                }}
                disabled={isGenerating}
                className="rounded-xl border border-border/40 bg-card/50 px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-border hover:bg-card hover:text-foreground disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
