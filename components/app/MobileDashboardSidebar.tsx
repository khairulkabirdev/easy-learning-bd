"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BookOpen, X } from "lucide-react";

import type { ShellNavGroup } from "@/components/app/AppShellNav";
import { SidebarNavLinks } from "@/components/app/SidebarNavLinks";
import { Button } from "@/components/ui/button";
import { Sidebar, useSidebar } from "@/components/ui/sidebar";


export function MobileDashboardSidebar({
  title,
  workspaceLabel,
  groups,
  desktop = false,
  footer,
}: {
  title: string;
  workspaceLabel: string;
  groups: ShellNavGroup[];
  desktop?: boolean;
  footer?: ReactNode;
}) {
  const pathname = usePathname();
  const { setOpenMobile, isMobile, open } = useSidebar();

  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  if (!isMobile && !desktop) return null;
  return (
    <Sidebar>
      <div className="flex min-h-0 flex-1 flex-col" inert={!isMobile && !open}>
      <div className="flex h-16 shrink-0 items-center gap-3 border-b px-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><BookOpen className="size-5" /></div>
        <div className="min-w-0 flex-1"><div className="truncate font-semibold">{title}</div><div className="truncate text-xs text-muted-foreground">{workspaceLabel}</div></div>
        {isMobile && <Button type="button" variant="ghost" size="icon" onClick={() => setOpenMobile(false)} aria-label="Close menu"><X className="size-5" /></Button>}
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto pb-6" aria-label="Dashboard navigation"><SidebarNavLinks groups={groups} /></nav>
      {footer}
      </div>
    </Sidebar>
  );
}
