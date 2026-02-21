"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const projectSchema = z.object({
  name: z.string().min(2, "Project name is too short").max(80),
  description: z.string().max(500).optional(),
});

export async function createProject(formData: FormData) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const parsed = projectSchema.parse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? "").trim() || undefined,
  });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: parsed.name,
      description: parsed.description ?? null,
      owner_id: user.id,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create project");
  }

  redirect(`/p/${data.id}`);
}
