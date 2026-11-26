import type { ReactNode } from "react";

import Link from "next/link";
import { cookies } from "next/headers";
import { MobileDashboardSidebar } from "@/components/app/MobileDashboardSidebar";
import { BookOpen, CalendarDays, ChevronDown, ClipboardList, FolderOpen, HardDrive, Landmark, LayoutDashboard, LogOut, Settings, Settings2, Shapes, User2 } from "lucide-react";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
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
  href?: string;
  icon: ReactNode;
  children?: Array<{
    title: string;
    href: string;
    icon?: ReactNode;
  }>;
};

export type ShellNavGroup = {
  label: string;
  items: ShellNavItem[];
};

export const adminNavGroups: ShellNavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    ],
  },
  {
    label: "Curriculum",
    items: [
      { title: "Classes", href: "/admin/classes", icon: <BookOpen className="h-4 w-4" /> },
      { title: "Subjects", href: "/admin/subjects", icon: <BookOpen className="h-4 w-4" /> },
      { title: "Units", href: "/admin/units", icon: <Shapes className="h-4 w-4" /> },
      { title: "Lessons", href: "/admin/lessons", icon: <FolderOpen className="h-4 w-4" /> },
      { title: "Topics", href: "/admin/topics", icon: <FolderOpen className="h-4 w-4" /> },
    ],
  },
  {
    label: "Content & assessment",
    items: [
      { title: "Content", href: "/admin/content", icon: <FolderOpen className="h-4 w-4" /> },
      { title: "Block Manager", icon: <Shapes className="h-4 w-4" />, children: [
        { title: "Block Library", href: "/admin/block-manager/library" },
        { title: "Class Assignments", href: "/admin/block-manager/classes" },
        { title: "Subject Assignments", href: "/admin/block-manager/subjects" },
      ] },
      { title: "Model Question Import", href: "/admin/model-question-import", icon: <BookOpen className="h-4 w-4" /> },
      {
        title: "Board",
        icon: <Landmark className="h-4 w-4" />,
        children: [
          { title: "Board", href: "/admin/board", icon: <Landmark className="h-4 w-4" /> },
          { title: "Year", href: "/admin/board/year", icon: <CalendarDays className="h-4 w-4" /> },
        ],
      },
    ],
  },
  {
    label: "Storage",
    items: [
      {
        title: "Storage",
        icon: <HardDrive className="h-4 w-4" />,
        children: [
          { title: "Configuration", href: "/admin/settings/storage", icon: <Settings2 className="h-4 w-4" /> },
        ],
      },
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
      { title: "Chapter Preparation", href: "/user/chapter-preparation", icon: <FolderOpen className="h-4 w-4" /> },
      { title: "Model Questions", href: "/user/model-questions", icon: <ClipboardList className="h-4 w-4" /> },
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

export async function AppDashboardShell({
  workspaceLabel,
  title,
  roleLabel,
  userName,
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

  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={sidebarOpen} className="admin-workspace">
      <MobileDashboardSidebar title={title} workspaceLabel={workspaceLabel} groups={groups} desktop footer={
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
                <DropdownMenuItem render={<Link href={resolvedProfileHref} />}>
                    <User2 className="h-4 w-4" />
                    Profile
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <form action={logoutAction} className="w-full p-1">
                    <button type="submit" className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-destructive hover:bg-destructive/10">
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </form>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      } />

      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 border-b bg-background/95 px-3 backdrop-blur-md sm:px-6">
          <div className="flex h-16 w-full min-w-0 items-center gap-3">
            <SidebarTrigger className="size-10 max-md:size-11" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-semibold">{title}</div>
            </div>
            {action}
          </div>
        </header>
        <div className="min-w-0 flex-1 bg-muted/20 p-4 md:p-6">
          <div className="mx-auto w-full min-w-0 max-w-[1920px]">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
