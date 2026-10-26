import { AdminBoardYearManager } from "@/components/admin/AdminBoardYearManager";
import { getAdminPagedRecords } from "@/lib/admin/paged-records";
import { requireAdmin } from "@/lib/app-auth";

export default async function AdminAcademicYearPage() {
  const user = await requireAdmin();
  const result = await getAdminPagedRecords(user.organizationId, {
    resource: "year",
    page: 1,
    pageSize: 10,
    sort: "label",
    direction: "desc",
  });
  return <AdminBoardYearManager kind="year" records={result.rows} total={result.total} />;
}
