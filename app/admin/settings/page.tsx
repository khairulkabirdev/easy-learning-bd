import { StorageSettingsClient } from "@/components/admin/settings/StorageSettingsClient";
import { StorageWorkspaceNav } from "@/components/admin/settings/StorageWorkspaceNav";
import { requireAdmin } from "@/lib/app-auth";
import { listStorageConfigurationViews } from "@/lib/storage/configurations";
import { hasValidStorageEncryptionKey } from "@/lib/storage/secrets";

export default async function AdminSettingsPage() {
  const user = await requireAdmin();
  const configurations = await listStorageConfigurationViews(user.organizationId, user.id);

  return (
    <div className="w-full min-w-0 space-y-4">
      <StorageWorkspaceNav />
      <StorageSettingsClient
        configurations={configurations}
        hasDedicatedEncryptionKey={hasValidStorageEncryptionKey()}
      />
    </div>
  );
}
