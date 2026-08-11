import AdminTopicsClient from "@/app/admin/topics/AdminTopicsClient";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function AdminTopicsPage() {
  const user = await requireAdmin();
  const [classes, subjects, units, lessons, topics] = await Promise.all([
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
        unitId: true,
        title: true,
      },
    }),
    prisma.topic.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [
        { lesson: { unit: { class: { sortOrder: "asc" } } } },
        { lesson: { unit: { subject: { sortOrder: "asc" } } } },
        { lesson: { unit: { sortOrder: "asc" } } },
        { lesson: { sortOrder: "asc" } },
        { sortOrder: "asc" },
        { title: "asc" },
      ],
      select: {
        id: true,
        title: true,
        slug: true,
        topicNumber: true,
        shortDescription: true,
        sortOrder: true,
        lessonId: true,
        lesson: {
          select: {
            title: true,
            unitId: true,
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
          },
        },
        _count: {
          select: {
            contents: true,
          },
        },
      },
    }),
  ]);

  return (
    <AdminTopicsClient
      classes={classes}
      subjects={subjects}
      units={units}
      lessons={lessons}
      topics={topics.map((item) => ({
        id: item.id,
        classId: item.lesson.unit.classId,
        className: item.lesson.unit.class.name,
        subjectId: item.lesson.unit.subjectId,
        subjectName: item.lesson.unit.subject.name,
        unitId: item.lesson.unitId,
        unitTitle: item.lesson.unit.title,
        lessonId: item.lessonId,
        lessonTitle: item.lesson.title,
        title: item.title,
        slug: item.slug,
        topicNumber: item.topicNumber,
        shortDescription: item.shortDescription,
        sortOrder: item.sortOrder,
        contentsCount: item._count.contents,
      }))}
    />
  );
}
