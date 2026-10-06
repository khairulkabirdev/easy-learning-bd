import { LayoutDashboard } from "lucide-react";
import { PageNavigation } from "@/components/app/PageNavigation";

import { AppDashboardShell, type ShellNavGroup } from "@/components/app/AppShellNav";
import { ShellActions } from "@/components/app/ShellActions";
import { requireTeacher } from "@/lib/app-auth";

const teacherNavGroups: ShellNavGroup[] = [
  {
    label: "Teaching",
    items: [{ title: "Dashboard", href: "/teacher/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> }],
  },
];

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireTeacher();

  return (
    <AppDashboardShell
      workspaceLabel="Teacher workspace"
      title="Teacher Panel"
      subtitle="Your teacher account is ready. Teaching tools can be added here next."
      roleLabel="Teacher"
      userName={user.name}
      userEmail={user.email}
      userMeta="Teacher"
      profileHref="/teacher/profile"
      groups={teacherNavGroups}
      action={<ShellActions />}
    >
      <div className="space-y-6">
        <PageNavigation />
        <div>{children}</div>
      </div>
    </AppDashboardShell>
  );
}
