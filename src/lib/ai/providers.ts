import "server-only";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV3 } from "@ai-sdk/provider";

export type AiProviderKey = "openai" | "deepseek";

const apiKeyByProvider: Record<AiProviderKey, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  deepseek: process.env.DEEPSEEK_API_KEY,
};

export function getProviderApiKey(providerKey: AiProviderKey) {
  const value = apiKeyByProvider[providerKey];
  if (!value || value.trim() === "") return null;
  return value.trim();
}

export function createLanguageModel(
  providerKey: AiProviderKey,
  modelId: string,
  baseURL?: string | null,
): LanguageModelV3 {
  const apiKey = getProviderApiKey(providerKey);
  if (!apiKey) {
    throw new Error(
      `AI провайдер ${providerKey} не настроен: отсутствует ключ API`,
    );
  }

  const provider = createOpenAI({
    apiKey,
    baseURL: baseURL ?? undefined,
    name: providerKey === "openai" ? undefined : providerKey,
  });

  return provider(modelId);
}
