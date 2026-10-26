import { MediaLibraryClient } from "@/components/admin/settings/MediaLibraryClient";
import { requireAdmin } from "@/lib/app-auth";
import { listMediaLibraryItems } from "@/lib/storage/media-library";

export const dynamic = "force-dynamic";

export default async function AdminMediaLibraryPage() {
  const user = await requireAdmin();
  const initial = await listMediaLibraryItems({
    organizationId: user.organizationId,
    userId: user.id,
    category: "all",
    search: "",
    skip: 0,
    take: 48,
  });

  return <MediaLibraryClient initial={initial} />;
}
