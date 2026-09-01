import AdminLessonsClient from "@/app/admin/lessons/AdminLessonsClient";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function AdminLessonsPage() {
  const user = await requireAdmin();
  const [classes, subjects, units, lessons] = await Promise.all([
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
        iconType: true,
        iconLibrary: true,
        iconName: true,
        iconColor: true,
        imagePath: true,
      },
    }),
    prisma.lesson.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [
        { unit: { class: { sortOrder: "asc" } } },
        { unit: { subject: { sortOrder: "asc" } } },
        { unit: { sortOrder: "asc" } },
        { sortOrder: "asc" },
        { title: "asc" },
      ],
      select: {
        id: true,
        title: true,
        slug: true,
        lessonNumber: true,
        shortDescription: true,
        sortOrder: true,
        unitId: true,
        iconType: true,
        iconLibrary: true,
        iconName: true,
        iconColor: true,
        imagePath: true,
        unit: {
          select: {
            title: true,
            classId: true,
            subjectId: true,
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
          },
        },
        _count: {
          select: {
            topics: true,
          },
        },
      },
    }),
  ]);

  return (
    <AdminLessonsClient
      classes={classes}
      subjects={subjects}
      units={units}
      lessons={lessons.map((item) => ({
        id: item.id,
        classId: item.unit.classId,
        className: item.unit.class.name,
        subjectId: item.unit.subjectId,
        subjectName: item.unit.subject.name,
        unitId: item.unitId,
        unitTitle: item.unit.title,
        title: item.title,
        slug: item.slug,
        lessonNumber: item.lessonNumber,
        shortDescription: item.shortDescription,
        sortOrder: item.sortOrder,
        iconType: item.iconType,
        iconLibrary: item.iconLibrary,
        iconName: item.iconName,
        iconColor: item.iconColor,
        imagePath: item.imagePath,
        topicsCount: item._count.topics,
      }))}
    />
  );
}
