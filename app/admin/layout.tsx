import { AppDashboardShell, adminNavGroups } from "@/components/app/AppShellNav";
import { ShellActions } from "@/components/app/ShellActions";
import { requireAdmin } from "@/lib/app-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <AppDashboardShell
      workspaceLabel="Admin workspace"
      title="Admin Panel"
      subtitle="Manage curriculum, content, media, and audit visibility through direct server-first workflows."
      roleLabel="Admin"
      userName={user.name}
      userEmail={user.email}
      userMeta="Admin"
      profileHref="/admin/profile"
      groups={adminNavGroups}
      action={<ShellActions />}
    >
      {children}
    </AppDashboardShell>
  );
}
