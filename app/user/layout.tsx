import { AppDashboardShell, userNavGroups } from "@/components/app/AppShellNav";
import { ShellActions } from "@/components/app/ShellActions";
import { requireUser } from "@/lib/app-auth";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <AppDashboardShell
      workspaceLabel="Student workspace"
      title="Learning Panel"
      subtitle="Open your learning dashboard and continue through the published curriculum."
      roleLabel="Student"
      userName={user.name}
      userEmail={user.email}
      groups={userNavGroups}
      action={<ShellActions />}
    >
      {children}
    </AppDashboardShell>
  );
}
