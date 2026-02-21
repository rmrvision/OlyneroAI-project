import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProjectSummary } from "@/lib/types";

export default async function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("projects")
    .select("id,name,description,status,created_at")
    .order("created_at", { ascending: false });

  const projects = (data ?? []) as ProjectSummary[];

  return (
    <>
      <AppSidebar projects={projects} />
      <SidebarInset className="h-screen overflow-hidden">
        <div className="size-full overflow-hidden">{children}</div>
      </SidebarInset>
    </>
  );
}
