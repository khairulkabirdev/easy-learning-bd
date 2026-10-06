import type { ReactNode } from "react";

import Link from "next/link";
import { BookOpen, ChevronDown, FolderOpen, LayoutDashboard, LogOut, Settings, Shapes, User2 } from "lucide-react";

import { SidebarNavLinks } from "@/components/app/SidebarNavLinks";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      { title: "Settings", href: "/admin/settings", icon: <Settings className="h-4 w-4" /> },
      { title: "Profile", href: "/admin/profile", icon: <User2 className="h-4 w-4" /> },
    ],
  },
];

export const userNavGroups: ShellNavGroup[] = [
  {
    label: "Learning",
    items: [
      { title: "Dashboard", href: "/user/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { title: "অধ্যায়ভিত্তিক প্রস্তুতি", href: "/user/chapter-preparation", icon: <FolderOpen className="h-4 w-4" /> },
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
  userMeta?: string;
  profileHref?: string;
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
  userMeta,
  profileHref,
  groups,
  action,
  children,
}: AppDashboardShellProps) {
  const resolvedProfileHref =
    profileHref ??
    (roleLabel.toLowerCase() === "teacher"
      ? "/teacher/profile"
      : roleLabel.toLowerCase() === "student"
        ? "/user/profile"
        : "/admin/profile");

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
          <DropdownMenu>
            <DropdownMenuTrigger className="mb-3 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{userName}</div>
                {userMeta ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {userMeta.split(" · ").map((item) => (
                      <Badge key={item} variant="secondary" className="h-5 px-1.5 text-[11px]">
                        {item}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuItem>
                  <Link href={resolvedProfileHref} className="flex w-full items-center gap-2">
                    <User2 className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <form action={logoutAction} className="w-full">
                    <button type="submit" className="flex w-full items-center gap-2 text-left">
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <SidebarInset>
        <header className="sticky top-0 z-20 border-b bg-background/75 px-4 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center">
            <div className="mx-auto flex w-full max-w-7xl items-center gap-3">
              <SidebarTrigger className="md:hidden" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-lg font-semibold">{title}</h1>
                  <Badge variant="outline">{roleLabel}</Badge>
                </div>
                <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
              </div>
              {action}
            </div>
          </div>
        </header>
        <main className="flex-1 bg-muted/20 p-4 md:p-6">
          <div className="mx-auto w-full max-w-screen-2xl">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
