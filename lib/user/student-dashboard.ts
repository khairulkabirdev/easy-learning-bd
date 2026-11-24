import "server-only";

import { prisma } from "@/lib/db";
import type { StudentDashboardData } from "@/components/app/StudentDashboardHome";
import { isEnglishFirstPaperSubject, isEnglishSecondPaperSubject } from "@/app/admin/content/navigation-helpers";
import { isEnglishSecondPaperKind } from "@/app/admin/content/english-second-paper-blocks/types";

type Student = { id: string; name: string; organizationId: string; classId: string | null };
type Practice = StudentDashboardData["practices"][number];

async function publishedSubjects(user: Student) {
  if (!user.classId) return [];
  return prisma.subject.findMany({
    where: { organizationId: user.organizationId, classId: user.classId, status: "published", class: { status: "published", organizationId: user.organizationId } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, code: true },
  });
}

// One bounded, class-scoped source for dashboard recommendations and search.
async function getPracticeCatalog(user: Student, subjects: Awaited<ReturnType<typeof publishedSubjects>>, query = "") {
  if (!user.classId || !subjects.length) return { practices: [], count: 0 };
  const firstIds = subjects.filter(isEnglishFirstPaperSubject).map(s => s.id);
  const secondIds = subjects.filter(isEnglishSecondPaperSubject).map(s => s.id);
  const scope = { organizationId: user.organizationId, classId: user.classId };
  const first = { ...scope, subjectId: { in: firstIds } };
  const second = { ...scope, subjectId: { in: secondIds } };
  const title = query ? { title: { contains: query } } : {};
  const question = query ? { OR: [{ title: { contains: query } }, { instruction: { contains: query } }, { details: { contains: query } }] } : {};
  const blockSearch = query ? { OR: [
    { title: { contains: query } }, { shortDescription: { contains: query } },
    { paragraph: { body: { contains: query } } }, { seenPassageOne: { body: { contains: query } } }, { seenPassageTwo: { body: { contains: query } } },
    { questionAnswerExercise: { question: { contains: query } } }, { gapFillExercise: { question: { contains: query } } },
    { gapFillFirstPaper: { question: { contains: query } } }, { gapFillSecondPaper: { question: { contains: query } } },
    { mcqSection: { title: { contains: query } } }, { mcqSection: { description: { contains: query } } },
  ] } : {};
  const list = { take: query ? 5 : 4, orderBy: [{ createdAt: "desc" as const }, { id: "asc" as const }], select: { id: true, title: true, subjectId: true, createdAt: true } };
  const seenScope = { ...first, unit: { status: "published" as const, ...scope }, lesson: { status: "published" as const, organizationId: user.organizationId }, OR: [{ topicId: null }, { topic: { status: "published" as const, organizationId: user.organizationId } }], blocks: { some: { kind: { in: ["seen-passage-one", "seen-passage-two"] } } } };
  const [seen, unseen, matching, rearrange, poem, story, grammar, papers, lessons] = await Promise.all([
    prisma.content.findMany({ where: { ...seenScope, ...(query ? { AND: [{ OR: [{ title: { contains: query } }, { lesson: { title: { contains: query } } }, { blocks: { some: blockSearch } }] }] } : {}) }, ...list, select: { ...list.select, unitId: true, lessonId: true, lesson: { select: { title: true } }, blocks: { where: { kind: { in: ["seen-passage-one", "seen-passage-two"] } }, select: { kind: true }, take: 1 } } }),
    prisma.unseenComposition.findMany({ where: { ...first, ...title }, ...list }),
    prisma.subjectMatchingSentencesBlock.findMany({ where: { ...first, ...question }, ...list }),
    prisma.subjectRearrangeSentenceBlock.findMany({ where: { ...first, ...question }, ...list }),
    prisma.subjectQuestionFromPoemsBlock.findMany({ where: { ...first, ...question }, ...list }),
    prisma.subjectQuestionFromStoryBlock.findMany({ where: { ...first, ...question }, ...list }),
    prisma.subjectEnglishSecondPaperBlock.findMany({ where: { ...second, ...question }, ...list, select: { ...list.select, kind: true } }),
    prisma.modelQuestionSet.findMany({ where: { ...scope, subjectId: { in: subjects.map(s => s.id) }, publishedAt: { not: null }, ...(query ? { name: { contains: query } } : {}) }, ...list, select: { id: true, name: true, subjectId: true, createdAt: true } }),
    prisma.lesson.findMany({ where: { organizationId: user.organizationId, status: "published", unit: { ...scope, status: "published", subjectId: { in: subjects.filter(s => !isEnglishSecondPaperSubject(s)).map(s => s.id) } }, ...(query ? { OR: [{ title: { contains: query } }, { shortDescription: { contains: query } }, { contents: { some: { ...scope, AND: [{ OR: [{ topicId: null }, { topic: { status: "published" as const, organizationId: user.organizationId } }] }, { OR: [{ title: { contains: query } }, { blocks: { some: blockSearch } }] }] } } }] } : {}) }, take: query ? 8 : 4, orderBy: [{ createdAt: "desc" }, { id: "asc" }], select: { id: true, title: true, unitId: true, createdAt: true, unit: { select: { subjectId: true } } } }),
  ]);
  const names = new Map(subjects.map(s => [s.id, s.name]));
  const path = (id: string) => `/user/chapter-preparation/subjects/${id}`;
  type Row = { id: string; title: string; subjectId: string; createdAt: Date };
  function make(row: Row, kind: string, href?: string): Practice & { createdAt: Date } {
    return { id: row.id, subjectId: row.subjectId, createdAt: row.createdAt, title: row.title || kind.replaceAll("-", " "), kind, subjectName: names.get(row.subjectId) ?? "Subject", href: href ?? `${path(row.subjectId)}/${kind}?recordId=${encodeURIComponent(row.id)}&page=1` };
  }
  const groups = [
    seen.flatMap(r => r.blocks[0] ? [make({ ...r, title: r.title || r.lesson.title }, "seen-composition", `${path(r.subjectId)}/seen-composition?${new URLSearchParams({ passage: r.blocks[0].kind === "seen-passage-one" ? "1" : "2", unitId: r.unitId, lessonId: r.lessonId, contentId: r.id })}`)] : []),
    unseen.map(r => make(r, "unseen-composition")), matching.map(r => make(r, "matching-sentences")),
    rearrange.map(r => make(r, "rearrange-sentence")), poem.map(r => make(r, "question-from-poems")), story.map(r => make(r, "question-from-story")),
    grammar.filter(r => isEnglishSecondPaperKind(r.kind)).map(r => make(r, r.kind)),
    papers.map(r => make({ ...r, title: r.name }, "model-question", `/user/model-questions/${r.subjectId}/${r.id}`)),
    lessons.map(r => make({ ...r, subjectId: r.unit.subjectId }, "lesson", `${path(r.unit.subjectId)}/units/${r.unitId}/lessons/${r.id}`)),
  ];
  // Round-robin across categories so a large grammar bank cannot dominate.
  groups.sort((a,b) => (b[0]?.createdAt.getTime() ?? 0) - (a[0]?.createdAt.getTime() ?? 0));
  const practices: Practice[] = [];
  for (let index = 0; index < 8; index++) for (const group of groups) {
    const item = group[index];
    if (item) { const { createdAt, ...practice } = item; practices.push(practice); }
  }
  return { practices, count: practices.length };
}

export async function searchStudentCatalog(user: Student, query: string) {
  const subjects = await publishedSubjects(user);
  const { practices } = await getPracticeCatalog(user, subjects, query);
  return practices.slice(0, 12).map(p => ({ label: `${p.title} · ${p.subjectName}`, href: p.href, type: p.kind === "lesson" ? "Lesson" : p.kind === "model-question" ? "Model paper" : "Practice" }));
}

export async function getStudentDashboardData(user: Student): Promise<StudentDashboardData> {
  const base: StudentDashboardData = { userId: user.id, userName: user.name, classId: user.classId, className: null, subjects: [], lessonCount: 0, exerciseCount: 0, practices: [] };
  if (!user.classId) return base;
  const [classItem, subjects] = await Promise.all([
    prisma.class.findFirst({ where: { id: user.classId, organizationId: user.organizationId }, select: { name: true } }),
    publishedSubjects(user),
  ]);
  base.className = classItem?.name ?? null;
  base.subjects = subjects.map(({id,name}) => ({id,name}));
  if (!subjects.length) return base;
  const scope = { organizationId: user.organizationId, classId: user.classId, subjectId: { in: subjects.map(s => s.id) } };
  const [lessons, seen, unseen, matching, rearrange, poem, story, secondPaper, catalog] = await Promise.all([
    prisma.lesson.count({ where: { organizationId: user.organizationId, status: "published", unit: { ...scope, status: "published" } } }),
    prisma.content.count({ where: { ...scope, unit: { status: "published" }, lesson: { status: "published" }, OR: [{ topicId: null }, { topic: { status: "published" } }] } }),
    prisma.unseenComposition.count({ where: scope }), prisma.subjectMatchingSentencesBlock.count({ where: scope }),
    prisma.subjectRearrangeSentenceBlock.count({ where: scope }), prisma.subjectQuestionFromPoemsBlock.count({ where: scope }),
    prisma.subjectQuestionFromStoryBlock.count({ where: scope }), prisma.subjectEnglishSecondPaperBlock.count({ where: scope }), getPracticeCatalog(user, subjects),
  ]);
  return { ...base, lessonCount: lessons, exerciseCount: seen + unseen + matching + rearrange + poem + story + secondPaper, practices: catalog.practices.slice(0, 6) };
}
