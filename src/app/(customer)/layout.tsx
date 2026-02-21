import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { getSessionUser } from "@/lib/auth";
import type { DB } from "@/lib/db/schema";
import type { Selectable } from "kysely";

export default async function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) return null;
  const sessions: Selectable<DB["ui_session"]>[] = [];

  return (
    <>
      <AppSidebar sessions={sessions} />
      <SidebarInset className="h-screen">
        <div className="w-full flex-1 overflow-hidden">
          <div className="size-full overflow-hidden p-4">{children}</div>
        </div>
      </SidebarInset>
    </>
  );
}
