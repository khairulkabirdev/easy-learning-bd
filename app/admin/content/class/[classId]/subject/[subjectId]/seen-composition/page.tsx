import { notFound } from "next/navigation";

import { isEnglishFirstPaperSubject } from "@/app/admin/content/navigation-helpers";
import { AdminCurriculumContentManager } from "@/components/admin/AdminCurriculumContentManager";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function SeenCompositionPage({
  params,
}: {
  params: Promise<{ classId: string; subjectId: string }>;
}) {
  const user = await requireAdmin();
  const { classId, subjectId } = await params;

  const subject = await prisma.subject.findFirst({
    where: {
      id: subjectId,
      classId,
      organizationId: user.organizationId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      class: { select: { id: true, name: true } },
    },
  });

  if (!subject || !isEnglishFirstPaperSubject(subject)) notFound();

  const [units, lessons, topics, contents] = await Promise.all([
    prisma.unit.findMany({
      where: { organizationId: user.organizationId, classId, subjectId },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, title: true },
    }),
    prisma.lesson.findMany({
      where: { organizationId: user.organizationId, unit: { classId, subjectId } },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, unitId: true, title: true },
    }),
    prisma.topic.findMany({
      where: { organizationId: user.organizationId, lesson: { unit: { classId, subjectId } } },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, lessonId: true, title: true },
    }),
    prisma.content.findMany({
      where: { organizationId: user.organizationId, classId, subjectId },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        createdAt: true,
        unit: { select: { id: true, title: true } },
        lesson: { select: { id: true, title: true } },
        topic: { select: { id: true, title: true } },
        _count: { select: { blocks: true } },
      },
    }),
  ]);

  return (
    <AdminCurriculumContentManager
      classItem={subject.class}
      subject={{ id: subject.id, name: subject.name }}
      heading="Seen Composition"
      description="Select unit, lesson, and optional topic. Class, subject, and Seen Composition are already fixed."
      editorMode="seen-composition"
      units={units}
      lessons={lessons}
      topics={topics}
      contents={contents.map((item) => ({
        id: item.id,
        createdAt: item.createdAt.toISOString(),
        unit: item.unit,
        lesson: item.lesson,
        topic: item.topic,
        blocksCount: item._count.blocks,
      }))}
    />
  );
}
