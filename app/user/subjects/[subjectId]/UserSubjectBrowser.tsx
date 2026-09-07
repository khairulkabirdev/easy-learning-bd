"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, Home, Layers3, Tag } from "lucide-react";

import { StudentContentViewer, type StudentContentRecord } from "@/app/user/lessons/student-content";
import { AnimatedTileGrid } from "@/components/app/AnimatedTileGrid";
import { EntityVisual } from "@/components/app/EntityVisual";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type SubjectRecord = {
  id: string;
  classId: string;
  name: string;
  iconType: string;
  iconLibrary: string;
  iconName: string;
  iconColor: string;
  imagePath: string;
  class: { id: string; name: string };
};

type UnitRecord = {
  id: string;
  classId: string;
  subjectId: string;
  title: string;
  unitNumber: string;
  iconType: string;
  iconLibrary: string;
  iconName: string;
  iconColor: string;
  imagePath: string;
};

type LessonRecord = {
  id: string;
  unitId: string;
  title: string;
  lessonNumber: string;
};

type TopicRecord = {
  id: string;
  lessonId: string;
  title: string;
  topicNumber: string;
  iconType: string;
  iconLibrary: string;
  iconName: string;
  iconColor: string;
  imagePath: string;
};

type BrowserStep = "units" | "topics" | "content" | "viewer";

function formatUnitLabel(unit: UnitRecord) {
  return unit.unitNumber ? `${unit.unitNumber} · ${unit.title}` : unit.title;
}

function formatLessonLabel(lesson?: LessonRecord) {
  if (!lesson) return "Lesson";
  return lesson.lessonNumber ? `${lesson.lessonNumber} · ${lesson.title}` : lesson.title;
}

function formatTopicLabel(topic: TopicRecord) {
  return topic.topicNumber ? `${topic.topicNumber} · ${topic.title}` : topic.title;
}

export default function UserSubjectBrowser({
  subject,
  units,
  lessons,
  topics,
  contents,
  backHref,
  backLabel = "All subjects",
}: {
  subject: SubjectRecord;
  units: UnitRecord[];
  lessons: LessonRecord[];
  topics: TopicRecord[];
  contents: StudentContentRecord[];
  backHref?: string;
  backLabel?: string;
}) {
  const [step, setStep] = useState<BrowserStep>("units");
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  const selectedUnit = useMemo(() => units.find((item) => item.id === selectedUnitId) ?? null, [selectedUnitId, units]);
  const selectedTopic = useMemo(() => topics.find((item) => item.id === selectedTopicId) ?? null, [selectedTopicId, topics]);
  const selectedContent = useMemo(() => contents.find((item) => item.id === selectedContentId) ?? null, [contents, selectedContentId]);

  const unitLessons = useMemo(() => lessons.filter((item) => item.unitId === selectedUnitId), [lessons, selectedUnitId]);
  const unitLessonIds = useMemo(() => new Set(unitLessons.map((item) => item.id)), [unitLessons]);
  const unitContents = useMemo(
    () => contents.filter((item) => item.unitId === selectedUnitId && unitLessonIds.has(item.lessonId)),
    [contents, selectedUnitId, unitLessonIds],
  );
  const directUnitContents = useMemo(() => unitContents.filter((item) => !item.topicId), [unitContents]);
  const visibleTopics = useMemo(() => {
    const topicIds = new Set(unitContents.map((item) => item.topicId).filter(Boolean));
    return topics.filter((item) => unitLessonIds.has(item.lessonId) && topicIds.has(item.id));
  }, [topics, unitContents, unitLessonIds]);
  const contentCandidates = useMemo(
    () => (selectedTopicId ? unitContents.filter((item) => item.topicId === selectedTopicId) : directUnitContents),
    [directUnitContents, selectedTopicId, unitContents],
  );

  const lessonById = useMemo(() => new Map(lessons.map((lesson) => [lesson.id, lesson] as const)), [lessons]);
  const unitSummaries = useMemo(() => {
    const counts = new Map<string, { lessons: number; topics: number; contents: number }>();
    for (const unit of units) {
      counts.set(unit.id, { lessons: 0, topics: 0, contents: 0 });
    }
    for (const lesson of lessons) {
      const current = counts.get(lesson.unitId);
      if (current) current.lessons += 1;
    }
    for (const topic of topics) {
      const lesson = lessonById.get(topic.lessonId);
      if (!lesson) continue;
      const current = counts.get(lesson.unitId);
      if (current) current.topics += 1;
    }
    for (const content of contents) {
      const current = counts.get(content.unitId);
      if (current) current.contents += 1;
    }
    return counts;
  }, [contents, lessonById, lessons, topics, units]);

  const sectionShell =
    "space-y-4 rounded-2xl border border-primary/10 bg-white p-4 shadow-sm shadow-primary/5 sm:p-6 dark:border-primary/20 dark:bg-background/70";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Home className="h-4 w-4" />
        <ChevronRight className="h-4 w-4" />
        <Link href={backHref || "/user/chapter-preparation"} className="font-medium text-foreground hover:text-primary">
          অধ্যায়ভিত্তিক প্রস্তুতি
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{subject.name}</span>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{subject.name}</h1>
        <p className="text-sm text-muted-foreground">ইউনিট, টপিক এবং কন্টেন্ট ধাপে ধাপে দেখুন।</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{subject.class.name}</Badge>
        <Badge variant="secondary">{subject.name}</Badge>
        {selectedUnit ? <Badge variant="secondary">{formatUnitLabel(selectedUnit)}</Badge> : null}
        {selectedTopic ? <Badge variant="secondary">{formatTopicLabel(selectedTopic)}</Badge> : null}
        {selectedContent ? <Badge variant="secondary">{selectedContent.topicId ? "Topic content" : "Direct content"}</Badge> : null}
      </div>

      <div className={sectionShell}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-lg font-semibold">
              {step === "units" ? "ইউনিট নির্বাচন করুন" : step === "topics" ? "টপিক নির্বাচন করুন" : step === "content" ? "কন্টেন্ট নির্বাচন করুন" : "কন্টেন্ট ভিউয়ার"}
            </div>
            <div className="text-sm text-muted-foreground">
              {step === "units"
                ? "এই বিষয়ের প্রকাশিত ইউনিটগুলো থেকে শুরু করুন।"
                : step === "topics"
                  ? "সিলেক্ট করা ইউনিটের টপিকগুলো দেখুন।"
                  : step === "content"
                    ? "টপিক বা সরাসরি কন্টেন্ট থেকে একটি বেছে নিন।"
                    : "কন্টেন্ট পড়ুন এবং উত্তর যাচাই বা রিভিউ ব্যবহার করুন।"}
            </div>
          </div>
          <Link href={backHref || "/user/chapter-preparation"} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Link>
        </div>
        <Separator />

        {step === "units" ? (
          <>
            {units.length > 0 ? (
              <AnimatedTileGrid
                items={units}
                getKey={(unit) => unit.id}
                onItemClick={(unit) => {
                  const nextUnitContents = contents.filter((item) => item.unitId === unit.id);
                  const hasTopicLevelContent = nextUnitContents.some((item) => Boolean(item.topicId));

                  setSelectedUnitId(unit.id);
                  setSelectedTopicId(null);
                  setSelectedContentId(null);
                  setStep(hasTopicLevelContent ? "topics" : "content");
                }}
                renderIcon={(unit) => (
                  <EntityVisual
                    title={unit.title}
                    iconType={unit.iconType}
                    iconName={unit.iconName}
                    iconColor={unit.iconColor}
                    imagePath={unit.imagePath}
                    className="h-12 w-12 rounded-2xl border border-primary/20 bg-primary/5 text-primary shadow-sm dark:border-primary/30 dark:bg-primary/10"
                  />
                )}
                renderTitle={(unit) => formatUnitLabel(unit)}
                renderMeta={(unit) => {
                  const summary = unitSummaries.get(unit.id);
                  return (
                    <>
                      <Badge variant="secondary">{summary?.lessons ?? 0} lessons</Badge>
                      <Badge variant="outline">{summary?.topics ?? 0} topics</Badge>
                      <Badge variant="outline">{summary?.contents ?? 0} contents</Badge>
                    </>
                  );
                }}
                renderRight={() => <ArrowRight className="h-4 w-4 text-primary/70 transition-transform group-hover:translate-x-0.5" />}
              />
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                No published units found for this subject.
              </div>
            )}
          </>
        ) : null}

        {step === "topics" ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="text-base font-semibold">টপিকসমূহ</div>
                <div className="text-sm text-muted-foreground">
                  {selectedUnit ? `${formatUnitLabel(selectedUnit)}-এর টপিকগুলো দেখুন।` : "নির্বাচিত ইউনিটের টপিকগুলো দেখুন।"}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer self-start"
                onClick={() => {
                  setSelectedUnitId(null);
                  setSelectedTopicId(null);
                  setSelectedContentId(null);
                  setStep("units");
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
            <Separator />
            <div className="space-y-4">
              {directUnitContents.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto w-full cursor-pointer justify-start rounded-2xl border-primary/15 bg-white px-4 py-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 dark:border-primary/20 dark:bg-background/70"
                  onClick={() => {
                    setSelectedTopicId(null);
                    setSelectedContentId(null);
                    setStep("content");
                  }}
                >
                  <div className="space-y-1">
                    <div className="font-medium">Direct content</div>
                    <div className="text-sm text-muted-foreground">
                      {directUnitContents.length} content record{directUnitContents.length > 1 ? "s" : ""} without topics
                    </div>
                  </div>
                </Button>
              ) : null}
              {visibleTopics.length > 0 ? (
                <AnimatedTileGrid
                  items={visibleTopics}
                  getKey={(topic) => topic.id}
                  onItemClick={(topic) => {
                    setSelectedTopicId(topic.id);
                    setSelectedContentId(null);
                    setStep("content");
                  }}
                  renderIcon={(topic) => (
                    <EntityVisual
                      title={topic.title}
                      iconType={topic.iconType}
                      iconName={topic.iconName}
                      iconColor={topic.iconColor}
                      imagePath={topic.imagePath}
                      className="h-12 w-12 rounded-2xl border border-primary/20 bg-primary/5 text-primary shadow-sm dark:border-primary/30 dark:bg-primary/10"
                    />
                  )}
                  renderTitle={(topic) => formatTopicLabel(topic)}
                  renderMeta={(topic) => (
                    <Badge variant="secondary" className="inline-flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      {formatLessonLabel(lessonById.get(topic.lessonId))}
                    </Badge>
                  )}
                  renderRight={() => <ArrowRight className="h-4 w-4 text-primary/70 transition-transform group-hover:translate-x-0.5" />}
                />
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  No topic-level content found for this unit.
                </div>
              )}
            </div>
          </div>
        ) : null}

        {step === "content" ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="text-base font-semibold">কন্টেন্ট</div>
                <div className="text-sm text-muted-foreground">
                  {selectedUnit ? `${formatUnitLabel(selectedUnit)}-এর কন্টেন্ট বেছে নিন।` : "নির্বাচিত ইউনিটের কন্টেন্ট বেছে নিন।"}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer self-start"
                onClick={() => {
                  setSelectedContentId(null);
                  if (visibleTopics.length > 0) {
                    setSelectedTopicId(null);
                    setStep("topics");
                  } else {
                    setSelectedUnitId(null);
                    setStep("units");
                  }
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
            <Separator />
            {contentCandidates.length > 0 ? (
              <AnimatedTileGrid
                items={contentCandidates}
                getKey={(content) => content.id}
                onItemClick={(content) => {
                  setSelectedContentId(content.id);
                  setStep("viewer");
                }}
                renderIcon={() => (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 text-primary shadow-sm dark:border-primary/30 dark:bg-primary/10">
                    <Layers3 className="h-5 w-5" />
                  </div>
                )}
                renderTitle={(content, index) => (content.topicId ? `Topic content ${index + 1}` : `Direct content ${index + 1}`)}
                renderMeta={(content) => (
                  <>
                    <Badge variant="outline">{content.blocks.length} blocks</Badge>
                    <Badge variant="secondary">{content.topicId ? "Topic-level" : "Direct"}</Badge>
                    <Badge variant="outline" className="inline-flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" />
                      {formatLessonLabel(lessonById.get(content.lessonId))}
                    </Badge>
                  </>
                )}
                renderRight={() => <ArrowRight className="h-4 w-4 text-primary/70 transition-transform group-hover:translate-x-0.5" />}
              />
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                No content records found for this selection.
              </div>
            )}
          </div>
        ) : null}

        {step === "viewer" ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="text-base font-semibold">কন্টেন্ট ভিউয়ার</div>
                <div className="text-sm text-muted-foreground">কন্টেন্ট পড়ুন এবং উত্তর যাচাই বা রিভিউ ব্যবহার করুন।</div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer self-start"
                onClick={() => {
                  setSelectedContentId(null);
                  setStep("content");
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
            <Separator />
            {selectedContent ? (
              <StudentContentViewer content={selectedContent} />
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Select a content record first.</div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
