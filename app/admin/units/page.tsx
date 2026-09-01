import AdminUnitsClient from "@/app/admin/units/AdminUnitsClient";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function AdminUnitsPage() {
  const user = await requireAdmin();
  const [classes, subjects, units] = await Promise.all([
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
        iconType: true,
        iconLibrary: true,
        iconName: true,
        iconColor: true,
        imagePath: true,
      },
    }),
    prisma.unit.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [
        { class: { sortOrder: "asc" } },
        { subject: { sortOrder: "asc" } },
        { sortOrder: "asc" },
        { title: "asc" },
      ],
      select: {
        id: true,
        classId: true,
        subjectId: true,
        title: true,
        slug: true,
        unitNumber: true,
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
        subject: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            lessons: true,
          },
        },
      },
    }),
  ]);

  return (
    <AdminUnitsClient
      classes={classes}
      subjects={subjects}
      units={units.map((item) => ({
        id: item.id,
        classId: item.classId,
        className: item.class.name,
        subjectId: item.subjectId,
        subjectName: item.subject.name,
        title: item.title,
        slug: item.slug,
        unitNumber: item.unitNumber,
        description: item.description,
        sortOrder: item.sortOrder,
        iconType: item.iconType,
        iconLibrary: item.iconLibrary,
        iconName: item.iconName,
        iconColor: item.iconColor,
        imagePath: item.imagePath,
        lessonsCount: item._count.lessons,
      }))}
    />
  );
}
