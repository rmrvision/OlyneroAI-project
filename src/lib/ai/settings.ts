import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AiProviderKey } from "@/lib/ai/providers";

export type ActiveAiModel = {
  providerKey: AiProviderKey;
  providerName: string;
  baseUrl?: string | null;
  modelId: string;
  modelLabel: string;
};

function assertProviderKey(value: string): asserts value is AiProviderKey {
  if (value !== "openai" && value !== "deepseek") {
    throw new Error(`Неподдерживаемый AI провайдер: ${value}`);
  }
}

export async function getActiveAiModel(): Promise<ActiveAiModel> {
  const supabase = createSupabaseAdminClient();
  const { data: settings } = await supabase
    .from("ai_settings")
    .select("active_provider_key,active_model_id")
    .limit(1)
    .maybeSingle();

  if (!settings?.active_provider_key || !settings.active_model_id) {
    throw new Error("AI модель не настроена. Выберите модель в админке.");
  }

  const { data: model } = await supabase
    .from("ai_models")
    .select("id,provider_key,model_id,display_name,is_enabled")
    .eq("id", settings.active_model_id)
    .single();

  if (!model) {
    throw new Error("Активная модель не найдена.");
  }

  const { data: provider } = await supabase
    .from("ai_providers")
    .select("key,name,base_url,is_enabled")
    .eq("key", settings.active_provider_key)
    .single();

  if (!provider) {
    throw new Error("AI провайдер не найден.");
  }

  if (!provider.is_enabled) {
    throw new Error("AI провайдер отключён в настройках.");
  }

  if (!model.is_enabled) {
    throw new Error("AI модель отключена в настройках.");
  }

  if (provider.key !== model.provider_key) {
    throw new Error("Конфигурация AI повреждена: провайдер не совпадает.");
  }

  assertProviderKey(provider.key);

  return {
    providerKey: provider.key,
    providerName: provider.name,
    baseUrl: provider.base_url ?? undefined,
    modelId: model.model_id,
    modelLabel: model.display_name,
  } satisfies ActiveAiModel;
}
