/**
 * Setup AI model configuration in Supabase.
 * Run: node scripts/setup-ai-model.js
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log("🔧 Setting up AI model configuration...\n");

  // 1. Ensure openai provider exists
  const { error: providerErr } = await supabase
    .from("ai_providers")
    .upsert({ key: "openai", name: "OpenAI", base_url: "https://api.openai.com/v1", is_enabled: true }, { onConflict: "key" });

  if (providerErr) {
    console.error("❌ Failed to upsert provider:", providerErr.message);
    process.exit(1);
  }
  console.log("✅ OpenAI provider ready");

  // 2. Ensure gpt-4o model exists
  const { error: modelErr } = await supabase
    .from("ai_models")
    .upsert(
      { provider_key: "openai", model_id: "gpt-4o", display_name: "GPT-4o", context_window: 128000, is_enabled: true },
      { onConflict: "provider_key,model_id" }
    );

  if (modelErr) {
    console.error("❌ Failed to upsert model:", modelErr.message);
    process.exit(1);
  }
  console.log("✅ GPT-4o model ready");

  // 3. Get the model id
  const { data: model } = await supabase
    .from("ai_models")
    .select("id")
    .eq("provider_key", "openai")
    .eq("model_id", "gpt-4o")
    .single();

  if (!model) {
    console.error("❌ Could not find GPT-4o model after insert");
    process.exit(1);
  }

  // 4. Check if ai_settings exists
  const { data: existing } = await supabase
    .from("ai_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Update
    const { error: updateErr } = await supabase
      .from("ai_settings")
      .update({ active_provider_key: "openai", active_model_id: model.id })
      .eq("id", existing.id);

    if (updateErr) {
      console.error("❌ Failed to update settings:", updateErr.message);
      process.exit(1);
    }
    console.log("✅ ai_settings updated → GPT-4o active");
  } else {
    // Insert
    const { error: insertErr } = await supabase
      .from("ai_settings")
      .insert({ active_provider_key: "openai", active_model_id: model.id });

    if (insertErr) {
      console.error("❌ Failed to insert settings:", insertErr.message);
      process.exit(1);
    }
    console.log("✅ ai_settings created → GPT-4o active");
  }

  console.log("\n🎉 AI model configured! GPT-4o is now active for code generation.");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
