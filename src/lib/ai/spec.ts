import "server-only";
import { generateObject } from "ai";
import { projectSpecSchema, type ProjectSpec } from "@/lib/spec";
import { createLanguageModel } from "@/lib/ai/providers";
import { getActiveAiModel } from "@/lib/ai/settings";
import { snakeCase } from "change-case";

const systemPrompt = `Ты — генератор спецификаций OlyneroAI.
Возвращай только JSON объект строго по схеме.
Поддерживаемые типы: landing и crud.
Если пользователь просит CRUD, используй type=\"crud\" и заполни entity.
Если запрос про лендинг/маркетинг/презентацию, используй type=\"landing\".
Правила:
- projectName: короткое, читаемое название проекта (если задано, используй его).
- Для crud: entity.name и fields[].name должны быть в snake_case латиницей (a-z, 0-9, _).
- fields[].type только из: text, email, phone, number.
- Для landing: sections минимум 3, максимум 6.
- Тексты headline/subheadline/cta/sections должны быть на русском.
`;

function normalizeCrudSpec(spec: ProjectSpec): ProjectSpec {
  if (spec.type !== "crud") return spec;
  const entityName = snakeCase(spec.entity.name);
  const fields = spec.entity.fields.map((field) => {
    const normalizedName = snakeCase(field.name);
    return {
      ...field,
      name: normalizedName,
      label: field.label?.trim() || normalizedName,
    };
  });

  return {
    ...spec,
    entity: {
      ...spec.entity,
      name: entityName,
      fields,
    },
  };
}

export async function generateSpecFromPrompt(params: {
  prompt: string;
  projectName?: string | null;
}): Promise<ProjectSpec> {
  const active = await getActiveAiModel();
  const model = createLanguageModel(
    active.providerKey,
    active.modelId,
    active.baseUrl,
  );

  const trimmedPrompt = params.prompt.trim();
  const projectName = params.projectName?.trim();

  const userPrompt = projectName
    ? `Название проекта: ${projectName}\nЗапрос: ${trimmedPrompt}`
    : `Запрос: ${trimmedPrompt}`;

  const { object } = await generateObject({
    model,
    system: systemPrompt,
    schema: projectSpecSchema,
    messages: [{ role: "user", content: userPrompt }],
    maxRetries: 1,
  });

  const parsed = projectSpecSchema.parse(object);
  const normalized = normalizeCrudSpec(parsed);

  return {
    ...normalized,
    projectName: projectName && projectName.length > 0
      ? projectName
      : normalized.projectName,
  };
}
