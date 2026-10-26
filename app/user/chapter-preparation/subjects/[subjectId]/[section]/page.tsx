import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { isEnglishFirstPaperSubject } from "@/app/admin/content/navigation-helpers";
import {
  getPublishedSubjectMeta,
  getSeenCompositionLessons,
  getSeenCompositionPage,
  getSeenCompositionUnits,
  getSubjectPracticePage,
  getSubjectPracticeRecord,
  isFirstPaperSectionSlug,
  seenPassageKindFromParam,
  seenPassageParamFromKind,
  type FirstPaperSectionSlug,
} from "@/app/user/chapter-preparation/first-paper-data";
import { getPublishedContentByBlockKind } from "@/app/user/lessons/data";
import { StudentContentViewer } from "@/app/user/lessons/student-content";
import { UserFirstPaperPracticeViewer } from "@/components/app/UserFirstPaperPracticeViewer";
import { UserFirstPaperSectionList } from "@/components/app/UserFirstPaperSectionList";
import {
  SeenLessonGrid,
  SeenPassageTypeGrid,
  SeenUnitGrid,
} from "@/components/app/UserSeenCompositionNavigator";
import { Badge } from "@/components/ui/badge";
import { requireStudent } from "@/lib/app-auth";

const META: Record<FirstPaperSectionSlug, { title: string; description: string }> = {
  "seen-composition": {
    title: "Seen Composition",
    description: "Choose Passage 1 or Passage 2, then open a Unit, Lesson, and its matching content."
  },
  "unseen-composition": {
    title: "Unseen Composition",
    description: "Practice standalone unseen passages and their question sets.",
  },
  "matching-sentences": {
    title: "Matching Sentences",
    description: "Practice matching sentence parts and review the correct combinations.",
  },
  "rearrange-sentence": {
    title: "Rearrange Sentence",
    description: "Put the sentence parts in the correct order to form the complete story.",
  },
  "question-from-poems": {
    title: "Question from Poems",
    description: "Practice questions based on the poems in English 1st Paper.",
  },
  "question-from-story": {
    title: "Question from Story",
    description: "Practice questions based on the stories in English 1st Paper.",
  },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function positiveInt(value: string | string[] | undefined, fallback = 1) {
  const parsed = Number.parseInt(one(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function stripSeenPassagePrefix(title: string | null | undefined) {
  const value = title?.trim() || "";
  return value.replace(/^Seen\s+Passage\s+[12]\s*[—–-]\s*/i, "").trim();
}


export default async function UserEnglishFirstPaperSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ subjectId: string; section: string }>;
  searchParams: SearchParams;
}) {
  const user = await requireStudent();
  const { subjectId, section } = await params;
  const queryParams = await searchParams;

  if (!user.classId || !isFirstPaperSectionSlug(section)) notFound();

  const subject = await getPublishedSubjectMeta(user.organizationId, user.classId, subjectId);
  if (!subject || !isEnglishFirstPaperSubject(subject)) notFound();

  const meta = META[section];
  const basePath = `/user/chapter-preparation/subjects/${subjectId}/${section}`;
  const subjectPath = `/user/chapter-preparation/subjects/${subjectId}`;
  const q = one(queryParams.q).trim();
  const page = positiveInt(queryParams.page, 1);

  let body: ReactNode;
  let pageTitle = meta.title;
  let pageDescription = meta.description;
  let pageBadges: ReactNode = null;

  if (section === "seen-composition") {
    const passageKind = seenPassageKindFromParam(one(queryParams.passage));
    const contentId = one(queryParams.contentId);

    if (!passageKind) {
      pageTitle = "Seen Composition";
      pageDescription = "Choose Passage 1 or Passage 2 to continue.";
      body = <SeenPassageTypeGrid basePath={basePath} />;
    } else {
      const passage = seenPassageParamFromKind(passageKind);
      const passageLabel = passage === "1" ? "Passage 1" : "Passage 2";
      const units = await getSeenCompositionUnits(
        user.organizationId,
        user.classId,
        subjectId,
        passageKind,
      );
      const requestedUnitId = one(queryParams.unitId);
      const unitId = units.some((unit) => unit.id === requestedUnitId) ? requestedUnitId : "";
      const selectedUnit = units.find((unit) => unit.id === unitId);
      const lessons = unitId
        ? await getSeenCompositionLessons(
            user.organizationId,
            user.classId,
            subjectId,
            unitId,
            passageKind,
          )
        : [];
      const requestedLessonId = one(queryParams.lessonId);
      const lessonId = lessons.some((lesson) => lesson.id === requestedLessonId) ? requestedLessonId : "";
      const selectedLesson = lessons.find((lesson) => lesson.id === lessonId);

      if (contentId) {
        if (!unitId || !lessonId) notFound();

        const content = await getPublishedContentByBlockKind(
          user.organizationId,
          user.classId,
          contentId,
          passageKind,
        );

        if (
          !content ||
          content.subjectId !== subjectId ||
          content.unit.id !== unitId ||
          content.lesson.id !== lessonId
        ) {
          notFound();
        }

        pageTitle = stripSeenPassagePrefix(content.title) || passageLabel;
        pageDescription = "Read the passage and complete the available exercises.";
        pageBadges = (
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary">{passageLabel}</Badge>
            <Badge variant="secondary">{content.unit.title}</Badge>
            <Badge variant="outline">{content.lesson.title}</Badge>
            {content.topic ? <Badge variant="outline">{content.topic.title}</Badge> : null}
          </div>
        );
        body = (
          <StudentContentViewer
            content={content}
            title={`${passageLabel} practice`}
            description="Read the passage and complete the available exercises."
          />
        );
      } else if (!unitId) {
        pageTitle = `${passageLabel} · Choose Unit`;
        pageDescription = `Only Units containing ${passageLabel} content are shown.`;
        body = units.length > 0 ? (
          <SeenUnitGrid basePath={basePath} passage={passage} units={units} />
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No published Units contain {passageLabel} content yet.
          </div>
        );
      } else if (!lessonId) {
        pageTitle = `${selectedUnit?.title || "Unit"} · Choose Lesson`;
        pageDescription = `Choose a Lesson containing ${passageLabel} content.`;
        pageBadges = (
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary">{passageLabel}</Badge>
            {selectedUnit ? <Badge variant="outline">{selectedUnit.title}</Badge> : null}
          </div>
        );
        body = lessons.length > 0 ? (
          <SeenLessonGrid basePath={basePath} passage={passage} unitId={unitId} lessons={lessons} />
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No published Lessons contain {passageLabel} content in this Unit.
          </div>
        );
      } else {
        const result = await getSeenCompositionPage({
          organizationId: user.organizationId,
          classId: user.classId,
          subjectId,
          unitId,
          lessonId,
          passageKind,
          query: q,
          page,
          pageSize: 10,
        });

        pageTitle = `${selectedLesson?.title || "Lesson"} · Content`;
        pageDescription = `Choose a ${passageLabel} content record to study.`;
        pageBadges = (
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary">{passageLabel}</Badge>
            {selectedUnit ? <Badge variant="outline">{selectedUnit.title}</Badge> : null}
            {selectedLesson ? <Badge variant="outline">{selectedLesson.title}</Badge> : null}
          </div>
        );
        body = (
          <UserFirstPaperSectionList
              basePath={basePath}
              rows={result.rows.map((row) => ({
                id: row.id,
                title: stripSeenPassagePrefix(row.title) || `Untitled ${passageLabel}`,
                meta: `${row.unit.title} · ${row.lesson.title}`,
                secondaryMeta: row.topic?.title || passageLabel,
                count: row.blocksCount,
              }))}
              total={result.total}
              page={result.page}
              totalPages={result.totalPages}
              query={q}
              emptyMessage={`No ${passageLabel} records found for this Lesson.`}
              recordParam="contentId"
              preserve={{ passage, unitId, lessonId }}
            />
        );
      }
    }
  } else {
    const recordId = one(queryParams.recordId);

    if (recordId) {
      const record = await getSubjectPracticeRecord(
        section,
        user.organizationId,
        user.classId,
        subjectId,
        recordId,
      );
      if (!record) notFound();

      pageTitle = record.title?.trim() || meta.title;
      pageDescription = meta.description;
      pageBadges = <Badge variant="outline">{meta.title}</Badge>;
      body = <UserFirstPaperPracticeViewer kind={section} record={record} />;
    } else {
      const result = await getSubjectPracticePage({
        kind: section,
        organizationId: user.organizationId,
        classId: user.classId,
        subjectId,
        query: q,
        page,
        pageSize: 10,
      });

      body = (
        <UserFirstPaperSectionList
          basePath={basePath}
          rows={result.rows.map((row) => ({
            id: row.id,
            title: row.title?.trim() || meta.title,
            meta: `Practice set ${row.sortOrder + 1}`,
          }))}
          total={result.total}
          page={result.page}
          totalPages={result.totalPages}
          query={q}
          emptyMessage={`No ${meta.title} records found.`}
        />
      );
    }
  }

  return (
    <div className="space-y-6 pt-2 sm:pt-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{pageTitle}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{pageDescription}</p>
        {pageBadges}
      </div>

      {body}
    </div>
  );
}