"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Layers3, Tag } from "lucide-react";

import { StudentContentViewer, type StudentContentRecord } from "@/app/user/lessons/student-content";
import { EntityVisual } from "@/components/app/EntityVisual";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <EntityVisual
                title={subject.name}
                iconType={subject.iconType}
                iconName={subject.iconName}
                iconColor={subject.iconColor}
                imagePath={subject.imagePath}
                className="h-14 w-14 rounded-2xl"
              />
              <div className="space-y-1">
                <CardTitle>{subject.name}</CardTitle>
                <CardDescription>Open units first, then go directly to topics or content.</CardDescription>
              </div>
            </div>
            <Link href={backHref || "/user/chapter-preparation"} className={cn(buttonVariants({ variant: "outline" }), "self-start")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{subject.class.name}</Badge>
            <Badge variant="secondary">{subject.name}</Badge>
            {selectedUnit ? <Badge variant="secondary">{formatUnitLabel(selectedUnit)}</Badge> : null}
            {selectedTopic ? <Badge variant="secondary">{formatTopicLabel(selectedTopic)}</Badge> : null}
            {selectedContent ? (
              <Badge variant="secondary">{selectedContent.topicId ? "Topic content" : "Direct content"}</Badge>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          {step === "units" ? (
            <>
              <div className="space-y-1">
                <div className="text-sm font-medium">Units</div>
                <div className="text-sm text-muted-foreground">Choose a unit to open its topics or direct content.</div>
              </div>
              <Separator />
              {units.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {units.map((unit) => {
                    const summary = unitSummaries.get(unit.id);
                    return (
                      <Button
                        key={unit.id}
                        type="button"
                        variant="outline"
                        className="h-auto cursor-pointer justify-start rounded-xl px-4 py-4 text-left"
                        onClick={() => {
                          const nextUnitContents = contents.filter((item) => item.unitId === unit.id);
                          const hasTopicLevelContent = nextUnitContents.some((item) => Boolean(item.topicId));

                          setSelectedUnitId(unit.id);
                          setSelectedTopicId(null);
                          setSelectedContentId(null);
                          setStep(hasTopicLevelContent ? "topics" : "content");
                        }}
                      >
                        <div className="flex w-full items-start gap-3">
                          <EntityVisual
                            title={unit.title}
                            iconType={unit.iconType}
                            iconName={unit.iconName}
                            iconColor={unit.iconColor}
                            imagePath={unit.imagePath}
                            className="h-12 w-12 rounded-2xl"
                          />
                          <div className="min-w-0 space-y-2">
                            <div className="font-medium">{formatUnitLabel(unit)}</div>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span>{summary?.lessons ?? 0} lessons</span>
                              <span>{summary?.topics ?? 0} topics</span>
                              <span>{summary?.contents ?? 0} contents</span>
                            </div>
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  No published units found for this subject.
                </div>
              )}
            </>
          ) : null}

          {step === "topics" ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Topics</div>
                  <div className="text-sm text-muted-foreground">
                    Open a topic under {selectedUnit ? formatUnitLabel(selectedUnit) : "the selected unit"}.
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
                    className="h-auto w-full cursor-pointer justify-start rounded-xl px-4 py-4 text-left"
                    onClick={() => {
                      setSelectedTopicId(null);
                      setSelectedContentId(null);
                      setStep("content");
                    }}
                  >
                    <div className="space-y-1">
                      <div className="font-medium">Open direct content</div>
                      <div className="text-sm text-muted-foreground">
                        {directUnitContents.length} content record{directUnitContents.length > 1 ? "s" : ""} without topics
                      </div>
                    </div>
                  </Button>
                ) : null}
                {visibleTopics.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {visibleTopics.map((topic) => (
                      <Button
                        key={topic.id}
                        type="button"
                        variant="outline"
                        className="h-auto cursor-pointer justify-start rounded-xl px-4 py-4 text-left"
                        onClick={() => {
                          setSelectedTopicId(topic.id);
                          setSelectedContentId(null);
                          setStep("content");
                        }}
                      >
                        <div className="flex w-full items-start gap-3">
                          <EntityVisual
                            title={topic.title}
                            iconType={topic.iconType}
                            iconName={topic.iconName}
                            iconColor={topic.iconColor}
                            imagePath={topic.imagePath}
                            className="h-11 w-11 rounded-2xl"
                          />
                          <div className="min-w-0 space-y-2">
                            <div className="font-medium">{formatTopicLabel(topic)}</div>
                            <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <BookOpen className="h-3.5 w-3.5" />
                              {formatLessonLabel(lessonById.get(topic.lessonId))}
                            </div>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                    No topic-level content found for this unit.
                  </div>
                )}
              </div>
            </>
          ) : null}

          {step === "content" ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Content</div>
                  <div className="text-sm text-muted-foreground">
                    Select a content record for {selectedUnit ? formatUnitLabel(selectedUnit) : "the selected unit"}.
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
                <div className="grid gap-3">
                  {contentCandidates.map((content, index) => (
                    <Button
                      key={content.id}
                      type="button"
                      variant="outline"
                      className="h-auto w-full cursor-pointer justify-start rounded-xl px-4 py-4 text-left"
                      onClick={() => {
                        setSelectedContentId(content.id);
                        setStep("viewer");
                      }}
                    >
                      <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                          <div className="font-medium">
                            {content.topicId ? `Topic content ${index + 1}` : `Direct content ${index + 1}`}
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Layers3 className="h-3.5 w-3.5" />
                              {content.blocks.length} blocks
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Tag className="h-3.5 w-3.5" />
                              {formatLessonLabel(lessonById.get(content.lessonId))}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{content.blocks.length} blocks</Badge>
                          <Badge variant="secondary">{content.topicId ? "Topic-level" : "Direct"}</Badge>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  No content records found for this selection.
                </div>
              )}
            </>
          ) : null}

          {step === "viewer" ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Content viewer</div>
                  <div className="text-sm text-muted-foreground">
                    Read the content and use the answer review tools where available.
                  </div>
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
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  Select a content record first.
                </div>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
