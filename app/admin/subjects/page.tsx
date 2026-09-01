import AdminSubjectsClient from "@/app/admin/subjects/AdminSubjectsClient";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function AdminSubjectsPage() {
  const user = await requireAdmin();
  const [classes, subjects] = await Promise.all([
    prisma.class.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        iconType: true,
        iconLibrary: true,
        iconName: true,
        iconColor: true,
        imagePath: true,
      },
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
        iconType: true,
        iconLibrary: true,
        iconName: true,
        iconColor: true,
        imagePath: true,
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
      classes={classes.map((item) => ({
        id: item.id,
        name: item.name,
        iconType: item.iconType,
        iconLibrary: item.iconLibrary,
        iconName: item.iconName,
        iconColor: item.iconColor,
        imagePath: item.imagePath,
      }))}
      subjects={subjects.map((item) => ({
        id: item.id,
        classId: item.classId,
        className: item.class.name,
        name: item.name,
        slug: item.slug,
        code: item.code,
        description: item.description,
        sortOrder: item.sortOrder,
        iconType: item.iconType,
        iconLibrary: item.iconLibrary,
        iconName: item.iconName,
        iconColor: item.iconColor,
        imagePath: item.imagePath,
        unitsCount: item._count.units,
      }))}
    />
  );
}
