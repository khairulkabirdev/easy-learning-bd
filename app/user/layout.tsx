import { AppDashboardShell, userNavGroups } from "@/components/app/AppShellNav";
import { ShellActions } from "@/components/app/ShellActions";
import { requireStudent } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStudent();
  const classItem = user.classId
    ? await prisma.class.findFirst({
        where: { id: user.classId, organizationId: user.organizationId },
        select: { name: true },
      })
    : null;

  return (
    <AppDashboardShell
      workspaceLabel="Student workspace"
      title="Learning Panel"
      subtitle="Open your learning dashboard and continue through the published curriculum."
      roleLabel="Student"
      userName={user.name}
      userEmail={user.email}
      userMeta={classItem?.name ? `Student · ${classItem.name}` : "Student"}
      profileHref="/user/profile"
      groups={userNavGroups}
      action={<ShellActions />}
    >
      {children}
    </AppDashboardShell>
  );
}
