import "server-only";

import { prisma } from "@/lib/db";
import type { StudentDashboardData } from "@/components/app/StudentDashboardHome";

export async function getStudentDashboardData(user: {
  id: string;
  name: string;
  organizationId: string;
  classId: string | null;
}): Promise<StudentDashboardData> {
  const base: StudentDashboardData = {
    userId: user.id,
    userName: user.name,
    className: null,
    subjects: [],
    lessonCount: 0,
    exerciseCount: 0,
    practices: [],
  };
  const classId = user.classId;
  if (!classId) return base;

  const [classItem, subjects] = await Promise.all([
    prisma.class.findFirst({
      where: { id: classId, organizationId: user.organizationId },
      select: { name: true },
    }),
    prisma.subject.findMany({
      where: { organizationId: user.organizationId, classId, status: "published" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);
  base.className = classItem?.name ?? null;
  base.subjects = subjects;
  if (!subjects.length) return base;

  const subjectIds = subjects.map((subject) => subject.id);
  const scope = { organizationId: user.organizationId, classId, subjectId: { in: subjectIds } };
  const [lessons, seen, unseen, matching, rearrange, poem, story, secondPaper, latestPractice] = await Promise.all([
    prisma.lesson.count({
      where: {
        organizationId: user.organizationId,
        status: "published",
        unit: { organizationId: user.organizationId, status: "published", subjectId: { in: subjectIds } },
      },
    }),
    prisma.content.count({ where: scope }),
    prisma.unseenComposition.count({ where: scope }),
    prisma.subjectMatchingSentencesBlock.count({ where: scope }),
    prisma.subjectRearrangeSentenceBlock.count({ where: scope }),
    prisma.subjectQuestionFromPoemsBlock.count({ where: scope }),
    prisma.subjectQuestionFromStoryBlock.count({ where: scope }),
    prisma.subjectEnglishSecondPaperBlock.count({ where: scope }),
    prisma.subjectEnglishSecondPaperBlock.findMany({
      where: scope,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: 4,
      select: { id: true, title: true, kind: true, subjectId: true },
    }),
  ]);

  const subjectNames = new Map(subjects.map((subject) => [subject.id, subject.name]));
  return {
    ...base,
    lessonCount: lessons,
    exerciseCount: seen + unseen + matching + rearrange + poem + story + secondPaper,
    practices: latestPractice.map((practice) => ({
      ...practice,
      subjectName: subjectNames.get(practice.subjectId) || "English",
    })),
  };
}
