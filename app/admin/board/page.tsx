import { AdminBoardYearManager } from "@/components/admin/AdminBoardYearManager";
import { getAdminPagedRecords } from "@/lib/admin/paged-records";
import { requireAdmin } from "@/lib/app-auth";

export default async function AdminBoardPage() {
  const user = await requireAdmin();
  const result = await getAdminPagedRecords(user.organizationId, {
    resource: "board",
    page: 1,
    pageSize: 10,
    sort: "label",
    direction: "asc",
  });
  return <AdminBoardYearManager kind="board" records={result.rows} total={result.total} />;
}
