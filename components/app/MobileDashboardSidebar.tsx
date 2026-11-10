"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { BookOpen, X } from "lucide-react";

import type { ShellNavGroup } from "@/components/app/AppShellNav";
import { SidebarNavLinks } from "@/components/app/SidebarNavLinks";
import { Button } from "@/components/ui/button";
import { Sidebar, useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export function MobileDashboardSidebar({
  title,
  workspaceLabel,
  groups,
}: {
  title: string;
  workspaceLabel: string;
  groups: ShellNavGroup[];
}) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  if (!isMobile) return null;
  return (
    <Sidebar>
      <div className="flex h-16 items-center gap-3 border-b px-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><BookOpen className="size-5" /></div>
        <div className="min-w-0 flex-1"><div className="truncate font-semibold">{title}</div><div className="truncate text-xs text-muted-foreground">{workspaceLabel}</div></div>
        <Button type="button" variant="ghost" size="icon" onClick={() => setOpenMobile(false)} aria-label="Close menu"><X className="size-5" /></Button>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto pb-6" aria-label="Mobile dashboard menu"><SidebarNavLinks groups={groups} /></nav>
    </Sidebar>
  );
}
