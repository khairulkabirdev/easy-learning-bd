"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { deleteContent, saveContent } from "@/app/admin/content/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { AdminSelectField as SelectField } from "@/components/admin/AdminSelectField";

type ClassOption = {
  id: string;
  name: string;
};

type SubjectOption = {
  id: string;
  classId: string;
  name: string;
};

type UnitOption = {
  id: string;
  classId: string;
  subjectId: string;
  title: string;
};

type LessonOption = {
  id: string;
  unitId: string;
  title: string;
};

type TopicOption = {
  id: string;
  lessonId: string;
  title: string;
};

type ContentRow = {
  id: string;
  class: { id: string; name: string };
  subject: { id: string; name: string };
  unit: { id: string; title: string };
  lesson: { id: string; title: string };
  topic: { id: string; title: string } | null;
  blocksCount: number;
  createdAt: string;
};

type AdminContentListClientProps = {
  classes: ClassOption[];
  subjects: SubjectOption[];
  units: UnitOption[];
  lessons: LessonOption[];
  topics: TopicOption[];
  contents: ContentRow[];
};


export default function AdminContentListClient({
  classes,
  subjects,
  units,
  lessons,
  topics,
  contents,
}: AdminContentListClientProps) {
  const router = useRouter();
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    classId: "",
    subjectId: "",
    unitId: "",
    lessonId: "",
    topicId: "",
  });
  const [draftFilterClassId, setDraftFilterClassId] = useState("");
  const [draftFilterSubjectId, setDraftFilterSubjectId] = useState("");
  const [draftFilterUnitId, setDraftFilterUnitId] = useState("");
  const [draftFilterLessonId, setDraftFilterLessonId] = useState("");
  const [draftFilterTopicId, setDraftFilterTopicId] = useState("");
  const [appliedFilterClassId, setAppliedFilterClassId] = useState("");
  const [appliedFilterSubjectId, setAppliedFilterSubjectId] = useState("");
  const [appliedFilterUnitId, setAppliedFilterUnitId] = useState("");
  const [appliedFilterLessonId, setAppliedFilterLessonId] = useState("");
  const [appliedFilterTopicId, setAppliedFilterTopicId] = useState("");

  const availableSubjects = useMemo(
    () => subjects.filter((item) => item.classId === form.classId),
    [subjects, form.classId],
  );
  const availableUnits = useMemo(
    () => units.filter((item) => item.classId === form.classId && item.subjectId === form.subjectId),
    [units, form.classId, form.subjectId],
  );
  const availableLessons = useMemo(
    () => lessons.filter((item) => item.unitId === form.unitId),
    [lessons, form.unitId],
  );
  const availableTopics = useMemo(
    () => topics.filter((item) => item.lessonId === form.lessonId),
    [topics, form.lessonId],
  );
  const availableDraftFilterSubjects = useMemo(
    () => subjects.filter((item) => item.classId === draftFilterClassId),
    [subjects, draftFilterClassId],
  );
  const availableDraftFilterUnits = useMemo(
    () => units.filter((item) => item.classId === draftFilterClassId && item.subjectId === draftFilterSubjectId),
    [units, draftFilterClassId, draftFilterSubjectId],
  );
  const availableDraftFilterLessons = useMemo(
    () => lessons.filter((item) => item.unitId === draftFilterUnitId),
    [lessons, draftFilterUnitId],
  );
  const availableDraftFilterTopics = useMemo(
    () => topics.filter((item) => item.lessonId === draftFilterLessonId),
    [topics, draftFilterLessonId],
  );
  const filteredContents = useMemo(() => {
    if (!appliedFilterClassId || !appliedFilterSubjectId || !appliedFilterUnitId || !appliedFilterLessonId) {
      return [];
    }

    return contents.filter((item) => {
      if (
        item.class.id !== appliedFilterClassId ||
        item.subject.id !== appliedFilterSubjectId ||
        item.unit.id !== appliedFilterUnitId ||
        item.lesson.id !== appliedFilterLessonId
      ) {
        return false;
      }

      if (!appliedFilterTopicId) {
        return true;
      }

      return item.topic?.id === appliedFilterTopicId;
    });
  }, [
    contents,
    appliedFilterClassId,
    appliedFilterSubjectId,
    appliedFilterUnitId,
    appliedFilterLessonId,
    appliedFilterTopicId,
  ]);

  function resetForm() {
    setForm({
      classId: "",
      subjectId: "",
      unitId: "",
      lessonId: "",
      topicId: "",
    });
  }

  function applyFilters() {
    setAppliedFilterClassId(draftFilterClassId);
    setAppliedFilterSubjectId(draftFilterSubjectId);
    setAppliedFilterUnitId(draftFilterUnitId);
    setAppliedFilterLessonId(draftFilterLessonId);
    setAppliedFilterTopicId(draftFilterTopicId);
  }

  function clearFilters() {
    setDraftFilterClassId("");
    setDraftFilterSubjectId("");
    setDraftFilterUnitId("");
    setDraftFilterLessonId("");
    setDraftFilterTopicId("");
    setAppliedFilterClassId("");
    setAppliedFilterSubjectId("");
    setAppliedFilterUnitId("");
    setAppliedFilterLessonId("");
    setAppliedFilterTopicId("");
  }

  function handleCreateContent() {
    setError(null);

    startSaveTransition(async () => {
      try {
        await saveContent({
          classId: form.classId,
          subjectId: form.subjectId,
          unitId: form.unitId,
          lessonId: form.lessonId,
          topicId: form.topicId || undefined,
        });
        resetForm();
        router.refresh();
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : "Failed to create content.");
      }
    });
  }

  function handleDeleteContent(id: string) {
    setError(null);

    startDeleteTransition(async () => {
      try {
        await deleteContent(id);
        router.refresh();
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "Failed to delete content.");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Content</CardTitle>
          <CardDescription>
            Create one content record per exact curriculum path, then open the dedicated editor to manage its content
            blocks.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select the hierarchy path, then apply filters to load content records.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SelectField
              label="Class"
              value={draftFilterClassId}
              onChange={(classId) => {
                setDraftFilterClassId(classId);
                setDraftFilterSubjectId("");
                setDraftFilterUnitId("");
                setDraftFilterLessonId("");
                setDraftFilterTopicId("");
              }}
              options={classes.map((item) => ({ id: item.id, label: item.name }))}
              placeholder="Select class"
            />
            <SelectField
              label="Subject"
              value={draftFilterSubjectId}
              onChange={(subjectId) => {
                setDraftFilterSubjectId(subjectId);
                setDraftFilterUnitId("");
                setDraftFilterLessonId("");
                setDraftFilterTopicId("");
              }}
              options={availableDraftFilterSubjects.map((item) => ({ id: item.id, label: item.name }))}
              placeholder={draftFilterClassId ? "Select subject" : "Select class first"}
              disabled={!draftFilterClassId}
            />
            <SelectField
              label="Unit"
              value={draftFilterUnitId}
              onChange={(unitId) => {
                setDraftFilterUnitId(unitId);
                setDraftFilterLessonId("");
                setDraftFilterTopicId("");
              }}
              options={availableDraftFilterUnits.map((item) => ({ id: item.id, label: item.title }))}
              placeholder={draftFilterSubjectId ? "Select unit" : "Select subject first"}
              disabled={!draftFilterSubjectId}
            />
            <SelectField
              label="Lesson"
              value={draftFilterLessonId}
              onChange={(lessonId) => {
                setDraftFilterLessonId(lessonId);
                setDraftFilterTopicId("");
              }}
              options={availableDraftFilterLessons.map((item) => ({ id: item.id, label: item.title }))}
              placeholder={draftFilterUnitId ? "Select lesson" : "Select unit first"}
              disabled={!draftFilterUnitId}
            />
            <SelectField
              label="Topic"
              value={draftFilterTopicId}
              onChange={setDraftFilterTopicId}
              options={availableDraftFilterTopics.map((item) => ({ id: item.id, label: item.title }))}
              placeholder={draftFilterLessonId ? "Optional topic" : "Select lesson first"}
              disabled={!draftFilterLessonId}
            />
          </FieldGroup>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <FieldDescription>
              Apply class, subject, unit, and lesson first. Topic stays optional if you want lesson-level content only.
            </FieldDescription>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={applyFilters}
                disabled={!draftFilterClassId || !draftFilterSubjectId || !draftFilterUnitId || !draftFilterLessonId}
              >
                Apply filter
              </Button>
              <Button type="button" variant="outline" onClick={clearFilters}>
                Clear
              </Button>
              <Badge variant="outline">
                {appliedFilterClassId && appliedFilterSubjectId && appliedFilterUnitId && appliedFilterLessonId
                  ? `${filteredContents.length} shown`
                  : "Not applied"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Create content record</CardTitle>
              <CardDescription>Choose the exact class, subject, unit, lesson, and optional topic path.</CardDescription>
            </div>
            <Badge variant="outline">{contents.length} records</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <FieldGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SelectField
              label="Class"
              value={form.classId}
              onChange={(classId) =>
                setForm({
                  classId,
                  subjectId: "",
                  unitId: "",
                  lessonId: "",
                  topicId: "",
                })
              }
              options={classes.map((item) => ({ id: item.id, label: item.name }))}
              placeholder="Select class"
            />
            <SelectField
              label="Subject"
              value={form.subjectId}
              onChange={(subjectId) =>
                setForm((current) => ({
                  ...current,
                  subjectId,
                  unitId: "",
                  lessonId: "",
                  topicId: "",
                }))
              }
              options={availableSubjects.map((item) => ({ id: item.id, label: item.name }))}
              placeholder={form.classId ? "Select subject" : "Select class first"}
              disabled={!form.classId}
            />
            <SelectField
              label="Unit"
              value={form.unitId}
              onChange={(unitId) =>
                setForm((current) => ({
                  ...current,
                  unitId,
                  lessonId: "",
                  topicId: "",
                }))
              }
              options={availableUnits.map((item) => ({ id: item.id, label: item.title }))}
              placeholder={form.subjectId ? "Select unit" : "Select subject first"}
              disabled={!form.subjectId}
            />
            <SelectField
              label="Lesson"
              value={form.lessonId}
              onChange={(lessonId) =>
                setForm((current) => ({
                  ...current,
                  lessonId,
                  topicId: "",
                }))
              }
              options={availableLessons.map((item) => ({ id: item.id, label: item.title }))}
              placeholder={form.unitId ? "Select lesson" : "Select unit first"}
              disabled={!form.unitId}
            />
            <SelectField
              label="Topic"
              value={form.topicId}
              onChange={(topicId) => setForm((current) => ({ ...current, topicId }))}
              options={availableTopics.map((item) => ({ id: item.id, label: item.title }))}
              placeholder={form.lessonId ? "Optional topic" : "Select lesson first"}
              disabled={!form.lessonId}
            />
          </FieldGroup>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <FieldDescription>
              Leave topic empty to create lesson-level content. Add a topic only when content belongs to a specific
              topic record.
            </FieldDescription>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={resetForm}>
                Reset
              </Button>
              <Button
                type="button"
                onClick={handleCreateContent}
                disabled={isSaving || !form.classId || !form.subjectId || !form.unitId || !form.lessonId}
              >
                <Plus className="mr-2 h-4 w-4" />
                {isSaving ? "Creating..." : "Create Content"}
              </Button>
            </div>
          </div>
          {error ? <div className="text-sm font-medium text-destructive">{error}</div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content records</CardTitle>
          <CardDescription>Open a record to manage its content blocks or delete it if the hierarchy path is wrong.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!appliedFilterClassId || !appliedFilterSubjectId || !appliedFilterUnitId || !appliedFilterLessonId ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              Apply class, subject, unit, and lesson filters to view content records.
            </div>
          ) : filteredContents.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              No content records matched the applied filters.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredContents.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 rounded-xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{item.class.name}</Badge>
                      <span className="text-sm text-muted-foreground">/</span>
                      <Badge variant="outline">{item.subject.name}</Badge>
                      <span className="text-sm text-muted-foreground">/</span>
                      <Badge variant="outline">{item.unit.title}</Badge>
                      <span className="text-sm text-muted-foreground">/</span>
                      <Badge variant="outline">{item.lesson.title}</Badge>
                      {item.topic ? (
                        <>
                          <span className="text-sm text-muted-foreground">/</span>
                          <Badge variant="outline">{item.topic.title}</Badge>
                        </>
                      ) : null}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.topic ? "Topic-level content" : "Lesson-level content"} | {item.blocksCount} block
                      {item.blocksCount === 1 ? "" : "s"} | Created {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/admin/content/${item.id}`}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
                    >
                      Open Editor
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={isDeleting}
                      onClick={() => handleDeleteContent(item.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
