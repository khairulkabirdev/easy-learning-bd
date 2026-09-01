import { ProfileForm } from "@/components/app/ProfileForm";
import { requireAdmin } from "@/lib/app-auth";

export default async function AdminProfilePage() {
  const user = await requireAdmin();

  return <ProfileForm role="admin" user={user} />;
}
