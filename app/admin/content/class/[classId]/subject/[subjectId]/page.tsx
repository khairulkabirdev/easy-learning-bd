import { notFound } from "next/navigation";

import { EnglishFirstPaperTypeGrid } from "@/components/app/EnglishFirstPaperTypeGrid";
import { AdminCurriculumContentManager } from "@/components/admin/AdminCurriculumContentManager";
import { isEnglishFirstPaperSubject } from "@/app/admin/content/navigation-helpers";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function AdminContentSubjectPage({
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

  if (!subject) notFound();

  if (isEnglishFirstPaperSubject(subject)) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{subject.name}</h1>
          <p className="text-sm text-muted-foreground">Choose the English 1st Paper content type.</p>
        </div>

        <EnglishFirstPaperTypeGrid classId={classId} subjectId={subjectId} />
      </div>
    );
  }

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
