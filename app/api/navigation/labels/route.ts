import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

function looksLikeId(segment: string) {
  return segment.length >= 18 && /^[a-z0-9_]+$/i.test(segment);
}

function unique(values: string[]) {
  return Array.from(new Set(values)).slice(0, 40);
}

const CONTENT_EDITOR_MODES = {
  "seen-composition": { label: "Seen Composition", slug: "seen-composition" },
  "matching-sentences": { label: "Matching Sentences", slug: "matching-sentences" },
  "rearrange-sentence": { label: "Rearrange Sentence", slug: "rearrange-sentence" },
  "question-from-poems": { label: "Question from Poems", slug: "question-from-poems" },
  "question-from-story": { label: "Question from Story", slug: "question-from-story" },
} as const;

type ContentEditorMode = keyof typeof CONTENT_EDITOR_MODES;

function classifyIds(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const classIds: string[] = [];
  const subjectIds: string[] = [];
  const unitIds: string[] = [];
  const lessonIds: string[] = [];
  const topicIds: string[] = [];
  const unseenIds: string[] = [];
  const matchingIds: string[] = [];
  const rearrangeIds: string[] = [];
  const poemIds: string[] = [];
  const storyIds: string[] = [];
  const contentIds: string[] = [];

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (!looksLikeId(segment)) continue;

    const previous = segments[index - 1] || "";

    if (previous === "class" || previous === "classes") classIds.push(segment);
    else if (previous === "subject" || previous === "subjects") subjectIds.push(segment);
    else if (previous === "units") unitIds.push(segment);
    else if (previous === "lessons") lessonIds.push(segment);
    else if (previous === "topics") topicIds.push(segment);
    else if (
      previous === "unseen-composition" ||
      previous === "unseen-compositon" ||
      previous === "unseen-compostion"
    ) unseenIds.push(segment);
    else if (previous === "matching-sentences") matchingIds.push(segment);
    else if (previous === "rearrange-sentence") rearrangeIds.push(segment);
    else if (previous === "question-from-poems") poemIds.push(segment);
    else if (previous === "question-from-story") storyIds.push(segment);
    else if (previous === "content" || previous === "chapter") contentIds.push(segment);
  }

  return {
    classIds: unique(classIds),
    subjectIds: unique(subjectIds),
    unitIds: unique(unitIds),
    lessonIds: unique(lessonIds),
    topicIds: unique(topicIds),
    unseenIds: unique(unseenIds),
    matchingIds: unique(matchingIds),
    rearrangeIds: unique(rearrangeIds),
    poemIds: unique(poemIds),
    storyIds: unique(storyIds),
    contentIds: unique(contentIds),
  };
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ labels: {} }, { status: 401 });
  }

  const pathname = request.nextUrl.searchParams.get("path") || "";
  if (!pathname.startsWith("/") || pathname.length > 2048) {
    return NextResponse.json({ labels: {} });
  }

  const organizationId = user.organizationId;
  const editorMode = request.nextUrl.searchParams.get("editorMode") || "";
  const editorSection = CONTENT_EDITOR_MODES[editorMode as ContentEditorMode];
  const contentEditorMatch = pathname.match(/^\/admin\/content\/([^/]+)$/);

  if (editorSection && contentEditorMatch && looksLikeId(contentEditorMatch[1])) {
    const contentId = contentEditorMatch[1];
    const content = await prisma.content.findFirst({
      where: { id: contentId, organizationId },
      select: {
        id: true,
        classId: true,
        subjectId: true,
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    if (content) {
      const subjectHref = `/admin/content/class/${content.classId}/subject/${content.subjectId}`;
      const sectionHref = `${subjectHref}/${editorSection.slug}`;

      return NextResponse.json({
        labels: { [content.id]: "Content Blocks" },
        items: [
          { label: "Content", href: "/admin/content" },
          { label: content.class.name, href: `/admin/content/class/${content.classId}` },
          { label: content.subject.name, href: subjectHref },
          { label: editorSection.label, href: sectionHref },
          { label: "Content Blocks" },
        ],
        backHref: sectionHref,
      });
    }
  }

  const ids = classifyIds(pathname);
  const hasAnyIds = Object.values(ids).some((values) => values.length > 0);
  if (!hasAnyIds) {
    return NextResponse.json({ labels: {} });
  }

  const [classes, subjects, units, lessons, topics, unseen, matching, rearrange, poems, stories, contents] =
    await Promise.all([
      ids.classIds.length
        ? prisma.class.findMany({
            where: { id: { in: ids.classIds }, organizationId },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      ids.subjectIds.length
        ? prisma.subject.findMany({
            where: { id: { in: ids.subjectIds }, organizationId },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      ids.unitIds.length
        ? prisma.unit.findMany({
            where: { id: { in: ids.unitIds }, organizationId },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
      ids.lessonIds.length
        ? prisma.lesson.findMany({
            where: { id: { in: ids.lessonIds }, organizationId },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
      ids.topicIds.length
        ? prisma.topic.findMany({
            where: { id: { in: ids.topicIds }, organizationId },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
      ids.unseenIds.length
        ? prisma.unseenComposition.findMany({
            where: { id: { in: ids.unseenIds }, organizationId },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
      ids.matchingIds.length
        ? prisma.subjectMatchingSentencesBlock.findMany({
            where: { id: { in: ids.matchingIds }, organizationId },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
      ids.rearrangeIds.length
        ? prisma.subjectRearrangeSentenceBlock.findMany({
            where: { id: { in: ids.rearrangeIds }, organizationId },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
      ids.poemIds.length
        ? prisma.subjectQuestionFromPoemsBlock.findMany({
            where: { id: { in: ids.poemIds }, organizationId },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
      ids.storyIds.length
        ? prisma.subjectQuestionFromStoryBlock.findMany({
            where: { id: { in: ids.storyIds }, organizationId },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
      ids.contentIds.length
        ? prisma.content.findMany({
            where: { id: { in: ids.contentIds }, organizationId },
            select: {
              id: true,
              lesson: { select: { title: true } },
              topic: { select: { title: true } },
            },
          })
        : Promise.resolve([]),
    ]);

  const labels: Record<string, string> = {};

  for (const item of classes) labels[item.id] = item.name;
  for (const item of subjects) labels[item.id] = item.name;
  for (const item of units) labels[item.id] = item.title;
  for (const item of lessons) labels[item.id] = item.title;
  for (const item of topics) labels[item.id] = item.title;
  for (const item of unseen) labels[item.id] = item.title || "Unseen Composition";
  for (const item of matching) labels[item.id] = item.title || "Matching Sentences";
  for (const item of rearrange) labels[item.id] = item.title || "Rearrange Sentence";
  for (const item of poems) labels[item.id] = item.title || "Question from Poems";
  for (const item of stories) labels[item.id] = item.title || "Question from Story";
  for (const item of contents) labels[item.id] = item.topic?.title || item.lesson.title || "Content";

  return NextResponse.json({ labels });
}
