import { AppDashboardShell, adminNavGroups } from "@/components/app/AppShellNav";
import { PageNavigation } from "@/components/app/PageNavigation";
import { ShellActions } from "@/components/app/ShellActions";
import { requireAdmin } from "@/lib/app-auth";
import { APP_NAME } from "@/lib/app-branding";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <AppDashboardShell
      workspaceLabel="Admin workspace"
      title={`${APP_NAME} Admin`}
      subtitle="Manage curriculum, content, media, and audit visibility through direct server-first workflows."
      roleLabel="Admin"
      userName={user.name}
      userEmail={user.email}
      userMeta="Admin"
      profileHref="/admin/profile"
      groups={adminNavGroups}
      action={<ShellActions />}
    >
      <div className="space-y-6">
        <PageNavigation />
        <div>{children}</div>
      </div>
    </AppDashboardShell>
  );
}
