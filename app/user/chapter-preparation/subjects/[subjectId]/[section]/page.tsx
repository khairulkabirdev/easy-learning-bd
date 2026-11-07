import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { isEnglishFirstPaperSubject } from "@/app/admin/content/navigation-helpers";
import {
  getPublishedSubjectMeta,
  getMatchingSentencesNextStep,
  getRearrangeSentenceNextStep,
  getPoemQuestionsNextStep,
  getStoryQuestionsNextStep,
  getSeenCompositionLessons,
  getSeenCompositionNextStep,
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
import { UserSeenCompositionInfiniteList } from "@/components/app/UserSeenCompositionInfiniteList";
import {
  SeenLessonGrid,
  SeenPassageTypeGrid,
  SeenUnitGrid,
} from "@/components/app/UserSeenCompositionNavigator";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireStudent } from "@/lib/app-auth";
import { cn } from "@/lib/utils";

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

function seenHref(basePath: string, values: Record<string, string>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
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

        const nextStep = await getSeenCompositionNextStep({
          organizationId: user.organizationId,
          classId: user.classId,
          subjectId,
          unitId,
          lessonId,
          passageKind,
          currentContentId: content.id,
        });

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
          <div className="space-y-8">
            <StudentContentViewer
              content={content}
              showHeader={false}
              suppressRepeatedPassages
            />

            <div className="border-t border-border/70 pt-6">
              {nextStep.type === "content" ? (
                <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">Continue this lesson</p>
                    <p className="mt-1 text-sm text-muted-foreground">Open the next {passageLabel.toLowerCase()} content.</p>
                  </div>
                  <Link
                    href={seenHref(basePath, {
                      passage,
                      unitId,
                      lessonId,
                      contentId: nextStep.contentId,
                    })}
                    className={cn(buttonVariants({ size: "lg" }), "min-h-11 px-4 sm:min-w-28")}
                  >
                    Next <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : nextStep.type === "lesson" ? (
                <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">Lesson complete</p>
                    <p className="mt-1 text-sm text-muted-foreground">Next: {nextStep.lessonTitle}</p>
                  </div>
                  <Link
                    href={seenHref(basePath, {
                      passage,
                      unitId,
                      lessonId: nextStep.lessonId,
                    })}
                    className={cn(buttonVariants({ size: "lg" }), "min-h-11 px-4 sm:min-w-36")}
                  >
                    Next Lesson <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium text-foreground">Lesson complete</p>
                    <p className="mt-0.5 text-muted-foreground">You reached the end of the available {passageLabel.toLowerCase()} content.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
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
          page: 1,
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
          <UserSeenCompositionInfiniteList
            basePath={basePath}
            subjectId={subjectId}
            passage={passage}
            unitId={unitId}
            lessonId={lessonId}
            query={q}
            initialRows={result.rows}
            total={result.total}
            initialPage={result.page}
            totalPages={result.totalPages}
            emptyMessage={`No ${passageLabel} records found for this Lesson.`}
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
      pageDescription = section === "unseen-composition"
        ? "Read the passage and complete its exercises."
        : meta.description;
      pageBadges = <Badge variant="outline">{meta.title}</Badge>;

      if (section === "matching-sentences" || section === "rearrange-sentence" || section === "question-from-poems" || section === "question-from-story") {
        const nextStep = await (section === "matching-sentences"
          ? getMatchingSentencesNextStep({
              organizationId: user.organizationId,
              classId: user.classId,
              subjectId,
              currentRecordId: record.id,
              query: q,
              pageSize: 10,
            })
          : section === "rearrange-sentence"
          ? getRearrangeSentenceNextStep({
              organizationId: user.organizationId,
              classId: user.classId,
              subjectId,
              currentRecordId: record.id,
              query: q,
              pageSize: 10,
            })
          : section === "question-from-poems"
          ? getPoemQuestionsNextStep({
              organizationId: user.organizationId,
              classId: user.classId,
              subjectId,
              currentRecordId: record.id,
              query: q,
              pageSize: 10,
            })
          : getStoryQuestionsNextStep({
              organizationId: user.organizationId,
              classId: user.classId,
              subjectId,
              currentRecordId: record.id,
              query: q,
              pageSize: 10,
            }));

        body = (
          <div className="space-y-7">
            <UserFirstPaperPracticeViewer kind={section} record={record} />
            <div className="border-t border-border/70 pt-6">
              {nextStep.type === "record" ? (
                <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">Continue practicing</p>
                    <p className="mt-1 text-sm text-muted-foreground">Open the next {meta.title} exercise.</p>
                  </div>
                  <Link
                    href={seenHref(basePath, {
                      recordId: nextStep.recordId,
                      page: String(nextStep.page),
                      q,
                    })}
                    className={cn(buttonVariants({ size: "lg" }), "min-h-11 px-4 sm:min-w-28")}
                  >
                    Next <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium">Practice complete</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">You reached the end of the available {meta.title} exercises.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      } else {
        body = <UserFirstPaperPracticeViewer kind={section} record={record} />;
      }
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

  const isSeenContentDetail = section === "seen-composition" && Boolean(one(queryParams.contentId));
  const isUnseenContentDetail = section === "unseen-composition" && Boolean(one(queryParams.recordId));
  const isMatchingContentDetail = (section === "matching-sentences" || section === "rearrange-sentence" || section === "question-from-poems" || section === "question-from-story") && Boolean(one(queryParams.recordId));

  return (
    <div
      className={`mx-auto w-full ${isSeenContentDetail || isUnseenContentDetail || isMatchingContentDetail ? "max-w-2xl" : "max-w-6xl"} space-y-6 pb-10 pt-2 sm:space-y-8 sm:pb-14 sm:pt-4`}
    >
      <header className="space-y-3 border-b border-border/70 pb-5 sm:pb-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{pageTitle}</h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{pageDescription}</p>
        </div>
        {pageBadges}
      </header>

      <div className="min-w-0">{body}</div>
    </div>
  );
}