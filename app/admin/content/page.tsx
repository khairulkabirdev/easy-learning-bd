import AdminContentListClient from "@/app/admin/content/AdminContentListClient";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function AdminContentPage() {
  const user = await requireAdmin();

  const [classes, subjects, units, lessons, topics, contents] = await Promise.all([
    prisma.class.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.subject.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, classId: true, name: true },
    }),
    prisma.unit.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, classId: true, subjectId: true, title: true },
    }),
    prisma.lesson.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, unitId: true, title: true },
    }),
    prisma.topic.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, lessonId: true, title: true },
    }),
    prisma.content.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        createdAt: true,
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        unit: { select: { id: true, title: true } },
        lesson: { select: { id: true, title: true } },
        topic: { select: { id: true, title: true } },
        _count: { select: { blocks: true } },
      },
    }),
  ]);

  return (
    <AdminContentListClient
      classes={classes}
      subjects={subjects}
      units={units}
      lessons={lessons}
      topics={topics}
      contents={contents.map((item) => ({
        id: item.id,
        createdAt: item.createdAt.toISOString(),
        class: item.class,
        subject: item.subject,
        unit: item.unit,
        lesson: item.lesson,
        topic: item.topic,
        blocksCount: item._count.blocks,
      }))}
    />
  );
}
