type OptionalEnv = string | undefined;

function requireEnv(name: string, value: OptionalEnv) {
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        "Set it in your deployment or local environment.",
    );
  }
  return value;
}

export function getPublicSupabaseUrl() {
  return requireEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export function getPublicSupabaseAnonKey() {
  return requireEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabaseServiceRoleKey() {
  return requireEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getRunnerSecret() {
  return requireEnv("RUNNER_SECRET", process.env.RUNNER_SECRET);
}

export function getAppAdminEmail() {
  return process.env.APP_ADMIN_EMAIL;
}

export function getAppAdminPassword() {
  return process.env.APP_ADMIN_PASSWORD;
}

export function validateServerEnv() {
  getPublicSupabaseUrl();
  getPublicSupabaseAnonKey();
  getSupabaseServiceRoleKey();
  getRunnerSecret();
}
