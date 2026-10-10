import { AdminBoardYearManager } from "@/components/admin/AdminBoardYearManager";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function AdminBoardPage() {
  const user = await requireAdmin();
  const records = await prisma.board.findMany({
    where: { organizationId: user.organizationId },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <AdminBoardYearManager
      kind="board"
      records={records.map((record) => ({
        id: record.id,
        label: record.name,
        isActive: record.isActive,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      }))}
    />
  );
}
