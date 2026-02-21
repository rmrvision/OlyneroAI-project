import "server-only";
import { generateText } from "ai";
import { createLanguageModel } from "@/lib/ai/providers";
import { getActiveAiModel } from "@/lib/ai/settings";

export type GeneratedFile = {
  path: string;
  content: string;
};

export type CodegenResult = {
  projectName: string;
  files: GeneratedFile[];
  description: string;
};

const CODEGEN_SYSTEM_PROMPT = `Ты — OlyneroAI, AI-генератор веб-приложений. Ты создаёшь полноценные React-приложения на основе описания пользователя.

СТЕК (обязателен, не менять):
- React 18 + TypeScript
- Vite (сборщик)
- Tailwind CSS (стили)
- lucide-react (иконки)

ПРАВИЛА:
1. Генерируй красивый, современный UI с продуманным дизайном
2. Используй Tailwind CSS для всех стилей — никаких inline styles
3. Весь текст на русском языке (если пользователь не попросил другое)
4. Код должен быть рабочим, без ошибок TypeScript
5. Компоненты разбивай по файлам логически
6. Не импортируй ничего кроме react, lucide-react, tailwind классов
7. В App.tsx всегда должен быть default export

СТРУКТУРА ОТВЕТА:
Ответь ТОЛЬКО валидным JSON объектом следующей структуры:
{
  "projectName": "Название проекта",
  "description": "Краткое описание что сделано",
  "files": [
    {
      "path": "src/App.tsx",
      "content": "// код файла"
    },
    {
      "path": "src/components/Hero.tsx",
      "content": "// код компонента"
    }
  ]
}

ВАЖНО:
- path всегда начинается с "src/"
- App.tsx всегда включается в список файлов
- Не включай файлы конфигурации (vite.config.ts, package.json и т.д.) — только src/ файлы
- JSON должен быть валидным, строки в content экранируй правильно
- Никаких markdown блоков \`\`\`, только чистый JSON`;

const CHAT_SYSTEM_PROMPT = `Ты — OlyneroAI, AI-ассистент для редактирования веб-приложений.
Пользователь описывает изменения в своём приложении, а ты генерируешь обновлённые файлы.

СТЕК (не менять):
- React 18 + TypeScript + Vite + Tailwind CSS + lucide-react

ПРАВИЛА:
1. Возвращай ТОЛЬКО те файлы, которые нужно изменить или добавить
2. Если файл нужно удалить — не включай его в ответ
3. Сохраняй стиль и структуру существующего кода
4. Весь новый текст на русском языке

СТРУКТУРА ОТВЕТА (только JSON):
{
  "description": "Что изменено",
  "files": [
    {
      "path": "src/App.tsx",
      "content": "// обновлённый код"
    }
  ]
}`;

function extractJson(text: string): string {
  // Try to find JSON block in markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  return text.trim();
}

export async function generateProjectFiles(params: {
  prompt: string;
  projectName?: string | null;
}): Promise<CodegenResult> {
  const active = await getActiveAiModel();
  const model = createLanguageModel(
    active.providerKey,
    active.modelId,
    active.baseUrl,
  );

  const projectNameHint = params.projectName
    ? `\nНазвание проекта: ${params.projectName}`
    : "";

  const userPrompt = `Создай веб-приложение по следующему описанию:${projectNameHint}\n\n${params.prompt.trim()}`;

  const { text } = await generateText({
    model,
    system: CODEGEN_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
    maxOutputTokens: 8000,
  });

  const jsonStr = extractJson(text);
  let parsed: { projectName: string; description: string; files: Array<{ path: string; content: string }> };

  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(
      "AI не вернул валидный JSON. Попробуй ещё раз или перефразируй запрос.",
    );
  }

  if (!parsed.files || !Array.isArray(parsed.files) || parsed.files.length === 0) {
    throw new Error("AI не сгенерировал файлы. Попробуй ещё раз.");
  }

  // Ensure App.tsx is present
  const hasApp = parsed.files.some((f) => f.path === "src/App.tsx");
  if (!hasApp) {
    throw new Error("AI не сгенерировал App.tsx. Попробуй ещё раз.");
  }

  const projectName = params.projectName?.trim() || parsed.projectName || "Мой проект";

  return {
    projectName,
    description: parsed.description || "",
    files: parsed.files.map((f) => ({
      path: f.path,
      content: f.content,
    })),
  };
}

export async function iterateProjectFiles(params: {
  prompt: string;
  existingFiles: GeneratedFile[];
}): Promise<{ description: string; files: GeneratedFile[] }> {
  const active = await getActiveAiModel();
  const model = createLanguageModel(
    active.providerKey,
    active.modelId,
    active.baseUrl,
  );

  const existingCode = params.existingFiles
    .map((f) => `=== ${f.path} ===\n${f.content}`)
    .join("\n\n");

  const userPrompt = `Вот текущий код приложения:\n\n${existingCode}\n\nЗапрос на изменение:\n${params.prompt.trim()}`;

  const { text } = await generateText({
    model,
    system: CHAT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
    maxOutputTokens: 6000,
  });

  const jsonStr = extractJson(text);
  let parsed: { description: string; files: Array<{ path: string; content: string }> };

  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error("AI не вернул валидный JSON при редактировании.");
  }

  return {
    description: parsed.description || "Изменения применены",
    files: parsed.files || [],
  };
}
