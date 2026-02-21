"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { useUser } from "@/components/session-context";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import type { Role } from "@/lib/role";
import type { ProjectSummary } from "@/lib/types";

export function AppSidebar({
  projects,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  projects: ProjectSummary[];
}) {
  const pathname = usePathname();
  const user = useUser();

  if (!user) return null;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="items-start">
        <Link href="/" aria-label="Home">
          <div className="text-lg font-semibold tracking-tight">OlyneroAI</div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={projects} />
        {(["admin"] as Role[]).includes(user.role) && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Settings</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={pathname === "/admin"} asChild>
                    <Link href="/admin">Admin</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
