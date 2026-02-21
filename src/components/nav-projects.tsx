"use client";

import { Folder, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { ProjectSummary } from "@/lib/types";

export function NavProjects({ projects }: { projects: ProjectSummary[] }) {
  const pathname = usePathname();
  const [showAll, setShowAll] = useState(false);

  const activeProjectId = useMemo(() => {
    if (!pathname.startsWith("/p/")) return null;
    return pathname.split("/")[2] ?? null;
  }, [pathname]);

  const visibleProjects = useMemo(() => {
    if (showAll || projects.length <= 7) {
      return projects;
    }
    return projects.slice(0, 7);
  }, [projects, showAll]);

  const showToggle = projects.length > 7;

  const statusLabels: Record<string, string> = {
    draft: "черновик",
    queued: "в очереди",
    running: "в работе",
    success: "готово",
    error: "ошибка",
  };

  return (
    <>
      <SidebarGroup className="pb-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="font-medium">
              <Link href="/app">
                <Plus className="h-4 w-4" />
                <span>Создать проект</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>Проекты</SidebarGroupLabel>
        <SidebarMenu>
          {visibleProjects.length === 0 ? (
            <SidebarMenuItem>
              <SidebarMenuButton className="text-muted-foreground">
                Проектов пока нет
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
          {visibleProjects.map((project) => (
            <SidebarMenuItem key={project.id}>
              <SidebarMenuButton
                asChild
                isActive={activeProjectId === project.id}
              >
                <Link href={`/p/${project.id}`} className="gap-2">
                  <Folder className="h-4 w-4" />
                  <span className="truncate">{project.name}</span>
                  <Badge
                    variant="secondary"
                    className="ml-auto text-[10px] uppercase tracking-wide"
                  >
                    {statusLabels[project.status] ?? project.status}
                  </Badge>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {showToggle ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setShowAll((prev) => !prev)}
                className="text-muted-foreground"
              >
                <span>{showAll ? "Скрыть" : "Показать все"}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}
