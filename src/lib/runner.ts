import crypto from "node:crypto";
import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function getRunnerUrl() {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "runner_url")
    .single();

  if (data?.value) {
    if (typeof data.value === "string") {
      return data.value;
    }
    if (typeof data.value === "object" && data.value.url) {
      return data.value.url;
    }
  }

  return "http://localhost:4010";
}

export function signRunnerPayload(payload: unknown) {
  const secret = process.env.RUNNER_SECRET;
  if (!secret) {
    throw new Error("RUNNER_SECRET is not configured");
  }
  const timestamp = Date.now().toString();
  const body = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return { timestamp, signature, body };
}

export function verifyRunnerSignature(
  signature: string | null,
  timestamp: string | null,
  payload: unknown,
) {
  if (!signature || !timestamp) return false;
  const secret = process.env.RUNNER_SECRET;
  if (!secret) return false;

  const body = JSON.stringify(payload);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function getAppOrigin() {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
