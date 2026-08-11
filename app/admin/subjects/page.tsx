import AdminSubjectsClient from "@/app/admin/subjects/AdminSubjectsClient";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function AdminSubjectsPage() {
  const user = await requireAdmin();
  const [classes, subjects] = await Promise.all([
    prisma.class.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.subject.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ class: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        classId: true,
        name: true,
        slug: true,
        code: true,
        description: true,
        sortOrder: true,
        class: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            units: true,
          },
        },
      },
    }),
  ]);

  return (
    <AdminSubjectsClient
      classes={classes}
      subjects={subjects.map((item) => ({
        id: item.id,
        classId: item.classId,
        className: item.class.name,
        name: item.name,
        slug: item.slug,
        code: item.code,
        description: item.description,
        sortOrder: item.sortOrder,
        unitsCount: item._count.units,
      }))}
    />
  );
}
