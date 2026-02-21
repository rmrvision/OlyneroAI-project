"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowUpIcon,
  CircleUserRound,
  Code2,
  FileUp,
  ImageIcon,
  Layers,
  MonitorIcon,
  Palette,
  Paperclip,
  Rocket,
} from "lucide-react";

interface AutoResizeProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: AutoResizeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Infinity),
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight],
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

type RuixenMoonChatProps = {
  initialMessage?: string;
  onSend?: (message: string) => Promise<void> | void;
  isSending?: boolean;
};

export default function RuixenMoonChat({
  initialMessage = "",
  onSend,
  isSending = false,
}: RuixenMoonChatProps) {
  const [message, setMessage] = useState(initialMessage);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 64,
    maxHeight: 260,
  });

  useEffect(() => {
    setMessage(initialMessage);
    adjustHeight(true);
  }, [initialMessage, adjustHeight]);

  const canSend = message.trim().length > 0 && !isSending;

  const handleSend = async () => {
    if (!canSend || !onSend) return;
    await onSend(message.trim());
  };

  return (
    <div
      className="relative w-full h-full min-h-[calc(100vh-2rem)] overflow-hidden rounded-3xl border border-white/10 bg-[#07090d]"
      style={{
        backgroundImage:
          "linear-gradient(120deg, rgba(15,23,42,0.7), rgba(3,7,18,0.9)), url('https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=2400&q=80')",
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/80" />

      <div className="relative z-10 flex h-full flex-col items-center justify-between px-6 py-10">
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
            OlyneroAI Studio
          </div>
          <h1 className="mt-6 text-4xl font-semibold text-white drop-shadow-sm sm:text-5xl">
            Создавайте продукты быстрее
          </h1>
          <p className="mt-3 text-sm text-white/70 sm:text-base">
            Опишите идею — мы превратим её в рабочий проект, сборку и превью.
          </p>
        </div>

        <div className="w-full max-w-3xl pb-[10vh]">
          <div className="relative rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                adjustHeight();
              }}
              placeholder="Опишите запрос для OlyneroAI..."
              className={cn(
                "w-full resize-none border-none bg-transparent px-5 py-4 text-sm text-white",
                "focus-visible:ring-0 focus-visible:ring-offset-0",
                "placeholder:text-white/40 min-h-[64px]",
              )}
              style={{ overflowY: "auto" }}
            />

            <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
              <Button
                variant="ghost"
                size="icon"
                className="text-white/70 hover:bg-white/10 hover:text-white"
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSend}
                  disabled={!canSend}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium",
                    canSend
                      ? "bg-white text-black hover:bg-white/90"
                      : "cursor-not-allowed bg-white/10 text-white/40",
                  )}
                >
                  <ArrowUpIcon className="h-4 w-4" />
                  {isSending ? "Запускаем" : "Запустить"}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <QuickAction icon={<Code2 className="h-4 w-4" />} label="Сгенерировать код" />
            <QuickAction icon={<Rocket className="h-4 w-4" />} label="Запуск приложения" />
            <QuickAction icon={<Layers className="h-4 w-4" />} label="UI‑компоненты" />
            <QuickAction icon={<Palette className="h-4 w-4" />} label="Идеи для темы" />
            <QuickAction
              icon={<CircleUserRound className="h-4 w-4" />}
              label="Личный кабинет"
            />
            <QuickAction icon={<MonitorIcon className="h-4 w-4" />} label="Лендинг" />
            <QuickAction icon={<FileUp className="h-4 w-4" />} label="Загрузить документы" />
            <QuickAction icon={<ImageIcon className="h-4 w-4" />} label="Изображения" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
}

function QuickAction({ icon, label }: QuickActionProps) {
  return (
    <Button
      variant="outline"
      className="flex items-center gap-2 rounded-full border-white/10 bg-black/40 text-xs text-white/70 hover:bg-white/10 hover:text-white"
    >
      {icon}
      <span>{label}</span>
    </Button>
  );
}
