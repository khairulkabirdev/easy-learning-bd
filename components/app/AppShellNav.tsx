import type { ReactNode } from "react";

import { BookOpen, FolderOpen, LayoutDashboard, LogOut, Shapes, User2 } from "lucide-react";

import { SidebarNavLinks } from "@/components/app/SidebarNavLinks";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logoutAction } from "@/app/actions/session";

export type ShellNavItem = {
  title: string;
  href: string;
  icon: ReactNode;
};

export type ShellNavGroup = {
  label: string;
  items: ShellNavItem[];
};

export const adminNavGroups: ShellNavGroup[] = [
  {
    label: "Platform",
    items: [
      { title: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { title: "Classes", href: "/admin/classes", icon: <BookOpen className="h-4 w-4" /> },
      { title: "Subjects", href: "/admin/subjects", icon: <BookOpen className="h-4 w-4" /> },
      { title: "Units", href: "/admin/units", icon: <Shapes className="h-4 w-4" /> },
      { title: "Lessons", href: "/admin/lessons", icon: <FolderOpen className="h-4 w-4" /> },
      { title: "Topics", href: "/admin/topics", icon: <FolderOpen className="h-4 w-4" /> },
      { title: "Content", href: "/admin/content", icon: <FolderOpen className="h-4 w-4" /> },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "Audit Logs", href: "/admin/audit-logs", icon: <BookOpen className="h-4 w-4" /> },
      { title: "Profile", href: "/admin/profile", icon: <User2 className="h-4 w-4" /> },
    ],
  },
];

export const userNavGroups: ShellNavGroup[] = [
  {
    label: "Learning",
    items: [
      { title: "Dashboard", href: "/user/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    ],
  },
];

type AppDashboardShellProps = {
  workspaceLabel: string;
  title: string;
  subtitle: string;
  roleLabel: string;
  userName: string;
  userEmail: string;
  groups: ShellNavGroup[];
  action?: ReactNode;
  children: ReactNode;
};

export function AppDashboardShell({
  workspaceLabel,
  title,
  subtitle,
  roleLabel,
  userName,
  userEmail,
  groups,
  action,
  children,
}: AppDashboardShellProps) {
  return (
    <SidebarProvider>
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 border-r bg-background md:flex md:flex-col">
        <div className="flex h-16 items-center gap-3 border-b px-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold">{title}</div>
            <div className="truncate text-xs text-muted-foreground">{workspaceLabel}</div>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <SidebarNavLinks groups={groups} />
        </ScrollArea>
        <div className="border-t px-3 py-4">
          <div className="mb-3 rounded-lg border px-3 py-2">
            <div className="truncate text-sm font-medium">{userName}</div>
            <div className="truncate text-xs text-muted-foreground">{userEmail}</div>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" className="w-full justify-start gap-2">
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </form>
        </div>
      </aside>

      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/75 px-4 backdrop-blur-md">
          <SidebarTrigger className="md:hidden" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold">{title}</h1>
              <Badge variant="outline">{roleLabel}</Badge>
            </div>
            <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {action}
        </header>
        <main className="flex-1 bg-muted/20 p-4 md:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
