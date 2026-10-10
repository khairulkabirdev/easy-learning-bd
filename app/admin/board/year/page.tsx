import { AdminBoardYearManager } from "@/components/admin/AdminBoardYearManager";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function AdminAcademicYearPage() {
  const user = await requireAdmin();
  const records = await prisma.academicYear.findMany({
    where: { organizationId: user.organizationId },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      year: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <AdminBoardYearManager
      kind="year"
      records={records.map((record) => ({
        id: record.id,
        label: String(record.year),
        numericValue: record.year,
        isActive: record.isActive,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      }))}
    />
  );
}
