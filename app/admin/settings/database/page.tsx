import { requireAdmin } from "@/lib/app-auth";
import { CLEANUP_CONFIRMATION, getDatabaseCleanupPreview } from "@/lib/admin/database-cleanup";
import { StorageWorkspaceNav } from "@/components/admin/settings/StorageWorkspaceNav";
import { DatabaseCleanupForm } from "@/components/admin/settings/DatabaseCleanupForm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DatabaseSettingsPage() {
  const user = await requireAdmin();
  const preview = await getDatabaseCleanupPreview(user.organizationId);
  return (
    <div className="min-w-0 space-y-6">
      <StorageWorkspaceNav />
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Database management</h1>
        <p className="text-sm text-muted-foreground">Review database tables and safely clear educational content without removing the curriculum.</p>
      </header>
      <DatabaseCleanupForm preview={preview} confirmationPhrase={CLEANUP_CONFIRMATION} />
    </div>
  );
}
