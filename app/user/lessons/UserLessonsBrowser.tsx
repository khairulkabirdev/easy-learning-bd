"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, FileText, Layers3, NotebookPen, Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type ClassRecord = {
  id: string;
  name: string;
};

type SubjectRecord = {
  id: string;
  classId: string;
  name: string;
};

type UnitRecord = {
  id: string;
  classId: string;
  subjectId: string;
  title: string;
  unitNumber: string;
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
};

type ContentRecord = {
  id: string;
  classId: string;
  subjectId: string;
  unitId: string;
  lessonId: string;
  topicId: string | null;
  createdAt: string;
  blocksCount: number;
};

type UserLessonsBrowserProps = {
  classes: ClassRecord[];
  subjects: SubjectRecord[];
  units: UnitRecord[];
  lessons: LessonRecord[];
  topics: TopicRecord[];
  contents: ContentRecord[];
};

type BrowserStep = "class" | "subject" | "unit" | "lesson" | "topic" | "content";

function formatUnitLabel(unit: UnitRecord) {
  return unit.unitNumber ? `${unit.unitNumber} · ${unit.title}` : unit.title;
}

function formatLessonLabel(lesson: LessonRecord) {
  return lesson.lessonNumber ? `${lesson.lessonNumber} · ${lesson.title}` : lesson.title;
}

function formatTopicLabel(topic: TopicRecord) {
  return topic.topicNumber ? `${topic.topicNumber} · ${topic.title}` : topic.title;
}

function StepHeader({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
      {onBack ? (
        <Button type="button" variant="outline" size="sm" className="cursor-pointer self-start" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      ) : null}
    </div>
  );
}

export default function UserLessonsBrowser({
  classes,
  subjects,
  units,
  lessons,
  topics,
  contents,
}: UserLessonsBrowserProps) {
  const [step, setStep] = useState<BrowserStep>("class");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );
  const selectedSubject = useMemo(
    () => subjects.find((item) => item.id === selectedSubjectId) ?? null,
    [selectedSubjectId, subjects],
  );
  const selectedUnit = useMemo(
    () => units.find((item) => item.id === selectedUnitId) ?? null,
    [selectedUnitId, units],
  );
  const selectedLesson = useMemo(
    () => lessons.find((item) => item.id === selectedLessonId) ?? null,
    [lessons, selectedLessonId],
  );
  const selectedTopic = useMemo(
    () => topics.find((item) => item.id === selectedTopicId) ?? null,
    [selectedTopicId, topics],
  );

  const visibleSubjects = useMemo(
    () => subjects.filter((item) => item.classId === selectedClassId),
    [selectedClassId, subjects],
  );
  const visibleUnits = useMemo(
    () => units.filter((item) => item.classId === selectedClassId && item.subjectId === selectedSubjectId),
    [selectedClassId, selectedSubjectId, units],
  );
  const visibleLessons = useMemo(
    () => lessons.filter((item) => item.unitId === selectedUnitId),
    [lessons, selectedUnitId],
  );
  const lessonContents = useMemo(
    () =>
      contents.filter(
        (item) =>
          item.classId === selectedClassId &&
          item.subjectId === selectedSubjectId &&
          item.unitId === selectedUnitId &&
          item.lessonId === selectedLessonId,
      ),
    [contents, selectedClassId, selectedLessonId, selectedSubjectId, selectedUnitId],
  );
  const visibleTopics = useMemo(() => {
    const topicIds = new Set(lessonContents.map((item) => item.topicId).filter(Boolean));
    return topics.filter((item) => item.lessonId === selectedLessonId && topicIds.has(item.id));
  }, [lessonContents, selectedLessonId, topics]);
  const lessonLevelContents = useMemo(
    () => lessonContents.filter((item) => !item.topicId),
    [lessonContents],
  );
  const topicLevelContents = useMemo(
    () => lessonContents.filter((item) => item.topicId === selectedTopicId),
    [lessonContents, selectedTopicId],
  );
  const classSubjectCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const subject of subjects) {
      counts.set(subject.classId, (counts.get(subject.classId) ?? 0) + 1);
    }

    return counts;
  }, [subjects]);

  const pathBadges = (
    <div className="flex flex-wrap items-center gap-2">
      {selectedClass ? <Badge variant="secondary">{selectedClass.name}</Badge> : null}
      {selectedSubject ? <Badge variant="secondary">{selectedSubject.name}</Badge> : null}
      {selectedUnit ? <Badge variant="secondary">{formatUnitLabel(selectedUnit)}</Badge> : null}
      {selectedLesson ? <Badge variant="secondary">{formatLessonLabel(selectedLesson)}</Badge> : null}
      {selectedTopic ? <Badge variant="secondary">{formatTopicLabel(selectedTopic)}</Badge> : null}
    </div>
  );

  let panel: React.ReactNode = null;

  if (step === "class") {
    panel = (
      <>
        <StepHeader
          title="Select class"
          description="Choose a class to start browsing its lesson hierarchy."
        />
        <Separator />
        <div className="grid gap-3 md:grid-cols-3">
          {classes.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant="outline"
              className="h-auto cursor-pointer justify-start rounded-2xl px-4 py-4 text-left"
              onClick={() => {
                setSelectedClassId(item.id);
                setSelectedSubjectId(null);
                setSelectedUnitId(null);
                setSelectedLessonId(null);
                setSelectedTopicId(null);
                setStep("subject");
              }}
            >
              <div className="flex w-full items-start gap-3">
                <div className="mt-0.5 rounded-full border p-2">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {classSubjectCounts.get(item.id) ?? 0} published subjects
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </>
    );
  }

  if (step === "subject") {
    panel = (
      <>
        <StepHeader
          title="Subjects"
          description={`Published subjects for ${selectedClass?.name ?? "the selected class"}.`}
          onBack={() => {
            setSelectedClassId(null);
            setSelectedSubjectId(null);
            setSelectedUnitId(null);
            setSelectedLessonId(null);
            setSelectedTopicId(null);
            setStep("class");
          }}
        />
        <Separator />
        {visibleSubjects.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleSubjects.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="outline"
                className="h-auto cursor-pointer justify-start rounded-xl px-4 py-4 text-left"
                onClick={() => {
                  setSelectedSubjectId(item.id);
                  setSelectedUnitId(null);
                  setSelectedLessonId(null);
                  setSelectedTopicId(null);
                  setStep("unit");
                }}
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4" />
                  <span>{item.name}</span>
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No published subjects found for this class.
          </div>
        )}
      </>
    );
  }

  if (step === "unit") {
    panel = (
      <>
        <StepHeader
          title="Units"
          description={`Published units for ${selectedSubject?.name ?? "the selected subject"}.`}
          onBack={() => {
            setSelectedSubjectId(null);
            setSelectedUnitId(null);
            setSelectedLessonId(null);
            setSelectedTopicId(null);
            setStep("subject");
          }}
        />
        <Separator />
        {visibleUnits.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {visibleUnits.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="outline"
                className="h-auto cursor-pointer justify-start rounded-xl px-4 py-4 text-left"
                onClick={() => {
                  setSelectedUnitId(item.id);
                  setSelectedLessonId(null);
                  setSelectedTopicId(null);
                  setStep("lesson");
                }}
              >
                <div className="flex items-center gap-3">
                  <Layers3 className="h-4 w-4" />
                  <span>{formatUnitLabel(item)}</span>
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No published units found for this subject.
          </div>
        )}
      </>
    );
  }

  if (step === "lesson") {
    panel = (
      <>
        <StepHeader
          title="Lessons"
          description={`Published lessons for ${selectedUnit ? formatUnitLabel(selectedUnit) : "the selected unit"}.`}
          onBack={() => {
            setSelectedUnitId(null);
            setSelectedLessonId(null);
            setSelectedTopicId(null);
            setStep("unit");
          }}
        />
        <Separator />
        {visibleLessons.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {visibleLessons.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="outline"
                className="h-auto cursor-pointer justify-start rounded-xl px-4 py-4 text-left"
                onClick={() => {
                  const nextLessonContents = contents.filter(
                    (content) =>
                      content.classId === selectedClassId &&
                      content.subjectId === selectedSubjectId &&
                      content.unitId === selectedUnitId &&
                      content.lessonId === item.id,
                  );
                  const hasTopicLevelContent = nextLessonContents.some((content) => Boolean(content.topicId));

                  setSelectedLessonId(item.id);
                  setSelectedTopicId(null);
                  setStep(hasTopicLevelContent ? "topic" : "content");
                }}
              >
                <div className="flex items-center gap-3">
                  <NotebookPen className="h-4 w-4" />
                  <span>{formatLessonLabel(item)}</span>
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No published lessons found for this unit.
          </div>
        )}
      </>
    );
  }

  if (step === "topic") {
    panel = (
      <>
        <StepHeader
          title="Topics"
          description={`Select a topic for ${selectedLesson ? formatLessonLabel(selectedLesson) : "the selected lesson"}.`}
          onBack={() => {
            setSelectedLessonId(null);
            setSelectedTopicId(null);
            setStep("lesson");
          }}
        />
        <Separator />
        {visibleTopics.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {visibleTopics.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="outline"
                className="h-auto cursor-pointer justify-start rounded-xl px-4 py-4 text-left"
                onClick={() => {
                  setSelectedTopicId(item.id);
                  setStep("content");
                }}
              >
                <div className="flex items-center gap-3">
                  <Tag className="h-4 w-4" />
                  <span>{formatTopicLabel(item)}</span>
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No topic-level content found for this lesson.
          </div>
        )}
      </>
    );
  }

  if (step === "content") {
    const backToStep: BrowserStep = visibleTopics.length > 0 ? "topic" : "lesson";

    panel = (
      <>
        <StepHeader
          title="Content"
          description={`Published content for ${selectedLesson ? formatLessonLabel(selectedLesson) : "the selected lesson"}.`}
          onBack={() => {
            if (backToStep === "topic") {
              setSelectedTopicId(null);
              setStep("topic");
              return;
            }

            setSelectedLessonId(null);
            setSelectedTopicId(null);
            setStep("lesson");
          }}
        />
        <Separator />
        <div className="space-y-6">
          {selectedTopicId ? (
            <div className="space-y-3">
              <div className="text-sm font-medium">Topic-level content</div>
              {topicLevelContents.length > 0 ? (
                <div className="grid gap-3">
                  {topicLevelContents.map((item) => (
                    <Card key={item.id} className="rounded-xl">
                      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Topic-level content</span>
                          </div>
                          <div className="text-sm text-muted-foreground">Content ID: {item.id}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{item.blocksCount} blocks</Badge>
                          <Badge variant="secondary">Topic-level</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  No topic-level content found for the selected topic.
                </div>
              )}
            </div>
          ) : null}

          {lessonLevelContents.length > 0 ? (
            <div className="space-y-3">
              <div className="text-sm font-medium">Lesson-level content</div>
              <div className="grid gap-3">
                {lessonLevelContents.map((item) => (
                  <Card key={item.id} className="rounded-xl">
                    <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Lesson-level content</span>
                        </div>
                        <div className="text-sm text-muted-foreground">Content ID: {item.id}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{item.blocksCount} blocks</Badge>
                        <Badge variant="secondary">Lesson-level</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}

          {lessonLevelContents.length === 0 && (!selectedTopicId || topicLevelContents.length === 0) ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              No content records found for this selection.
            </div>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="space-y-1">
            <CardTitle>Lesson content browser</CardTitle>
            <CardDescription>
              Browse published class, subject, unit, lesson, topic, and content records step by step.
            </CardDescription>
          </div>
          {pathBadges}
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">{panel}</CardContent>
      </Card>
    </div>
  );
}
