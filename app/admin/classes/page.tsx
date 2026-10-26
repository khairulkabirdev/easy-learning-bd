import AdminClassesClient from "@/app/admin/classes/AdminClassesClient";
import { getAdminPagedRecords } from "@/lib/admin/paged-records";
import { requireAdmin } from "@/lib/app-auth";

export default async function AdminClassesPage() {
  const user = await requireAdmin();
  const result = await getAdminPagedRecords(user.organizationId, {
    resource: "classes",
    page: 1,
    pageSize: 12,
  });

  return <AdminClassesClient classes={result.rows} total={result.total} />;
}
