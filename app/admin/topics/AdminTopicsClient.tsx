"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { saveLesson } from "@/app/admin/lessons/actions";
import { deleteTopic, saveTopic } from "@/app/admin/topics/actions";
import { EntityVisual } from "@/components/app/EntityVisual";
import { EntityMediaField } from "@/components/admin/EntityMediaField";
import { AdminSelectField as SelectField } from "@/components/admin/AdminSelectField";
import { ResponsiveEntityEditor } from "@/components/admin/ResponsiveEntityEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ClassOption = {
  id: string;
  name: string;
  iconType: string;
  iconLibrary: string;
  iconName: string;
  iconColor: string;
  imagePath: string;
};

type SubjectOption = {
  id: string;
  classId: string;
  name: string;
  iconType: string;
  iconLibrary: string;
  iconName: string;
  iconColor: string;
  imagePath: string;
};

type UnitOption = {
  id: string;
  classId: string;
  subjectId: string;
  title: string;
  iconType: string;
  iconLibrary: string;
  iconName: string;
  iconColor: string;
  imagePath: string;
};

type LessonOption = {
  id: string;
  unitId: string;
  title: string;
  iconType: string;
  iconLibrary: string;
  iconName: string;
  iconColor: string;
  imagePath: string;
};

type TopicRow = {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  unitId: string;
  unitTitle: string;
  lessonId: string;
  lessonTitle: string;
  title: string;
  slug: string;
  topicNumber: string;
  shortDescription: string;
  sortOrder: number;
  iconType: string;
  iconLibrary: string;
  iconName: string;
  iconColor: string;
  imagePath: string;
  contentsCount: number;
};

type AdminTopicsClientProps = {
  classes: ClassOption[];
  subjects: SubjectOption[];
  units: UnitOption[];
  lessons: LessonOption[];
  topics: TopicRow[];
};

const initialForm = {
  id: "",
  classId: "",
  subjectId: "",
  unitId: "",
  lessonId: "",
  title: "",
  topicNumber: "",
  shortDescription: "",
  sortOrder: "0",
  iconType: "none",
  iconLibrary: "",
  iconName: "",
  iconColor: "#0f766e",
  imagePath: "",
  persistedImagePath: "",
};

const initialLessonForm = {
  classId: "",
  subjectId: "",
  unitId: "",
  title: "",
  lessonNumber: "",
  shortDescription: "",
  sortOrder: "0",
  iconType: "none",
  iconLibrary: "",
  iconName: "",
  iconColor: "#0f766e",
  imagePath: "",
  persistedImagePath: "",
};

export default function AdminTopicsClient({ classes, subjects, units, lessons, topics }: AdminTopicsClientProps) {
  const router = useRouter();
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isSavingLesson, startSaveLessonTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draftFilterClassId, setDraftFilterClassId] = useState("");
  const [draftFilterSubjectId, setDraftFilterSubjectId] = useState("");
  const [draftFilterUnitId, setDraftFilterUnitId] = useState("");
  const [draftFilterLessonId, setDraftFilterLessonId] = useState("");
  const [appliedFilterClassId, setAppliedFilterClassId] = useState("");
  const [appliedFilterSubjectId, setAppliedFilterSubjectId] = useState("");
  const [appliedFilterUnitId, setAppliedFilterUnitId] = useState("");
  const [appliedFilterLessonId, setAppliedFilterLessonId] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [lessonForm, setLessonForm] = useState(initialLessonForm);

  const availableFormSubjects = useMemo(
    () => subjects.filter((item) => item.classId === form.classId),
    [subjects, form.classId],
  );
  const availableFormUnits = useMemo(
    () => units.filter((item) => item.classId === form.classId && item.subjectId === form.subjectId),
    [units, form.classId, form.subjectId],
  );
  const availableFormLessons = useMemo(
    () => lessons.filter((item) => item.unitId === form.unitId),
    [lessons, form.unitId],
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

  const filteredTopics = useMemo(() => {
    if (!appliedFilterClassId || !appliedFilterSubjectId || !appliedFilterUnitId || !appliedFilterLessonId) {
      return [];
    }
    const normalizedQuery = query.trim().toLowerCase();

    return topics.filter((item) => {
      if (
        item.classId !== appliedFilterClassId ||
        item.subjectId !== appliedFilterSubjectId ||
        item.unitId !== appliedFilterUnitId ||
        item.lessonId !== appliedFilterLessonId
      ) {
        return false;
      }

      if (!normalizedQuery) return true;

      return [
        item.title,
        item.slug,
        item.topicNumber,
        item.shortDescription,
        item.className,
        item.subjectName,
        item.unitTitle,
        item.lessonTitle,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [topics, appliedFilterClassId, appliedFilterSubjectId, appliedFilterUnitId, appliedFilterLessonId, query]);

  function resetForm() {
    setForm(initialForm);
  }

  function beginCreate() {
    setError(null);
    resetForm();
    setIsEditorOpen(true);
  }

  function beginEdit(item: TopicRow) {
    setError(null);
    setForm({
      id: item.id,
      classId: item.classId,
      subjectId: item.subjectId,
      unitId: item.unitId,
      lessonId: item.lessonId,
      title: item.title,
      topicNumber: item.topicNumber,
      shortDescription: item.shortDescription,
      sortOrder: String(item.sortOrder),
      iconType: item.iconType,
      iconLibrary: item.iconLibrary,
      iconName: item.iconName,
      iconColor: item.iconColor || "#0f766e",
      imagePath: item.imagePath,
      persistedImagePath: item.imagePath,
    });
    setIsEditorOpen(true);
  }

  function applyFilters() {
    setAppliedFilterClassId(draftFilterClassId);
    setAppliedFilterSubjectId(draftFilterSubjectId);
    setAppliedFilterUnitId(draftFilterUnitId);
    setAppliedFilterLessonId(draftFilterLessonId);
  }

  function clearFilters() {
    setDraftFilterClassId("");
    setDraftFilterSubjectId("");
    setDraftFilterUnitId("");
    setDraftFilterLessonId("");
    setAppliedFilterClassId("");
    setAppliedFilterSubjectId("");
    setAppliedFilterUnitId("");
    setAppliedFilterLessonId("");
    setQuery("");
  }

  function handleSave() {
    setError(null);

    startSaveTransition(async () => {
      try {
        await saveTopic({
          id: form.id || undefined,
          classId: form.classId,
          subjectId: form.subjectId,
          unitId: form.unitId,
          lessonId: form.lessonId,
          title: form.title,
          topicNumber: form.topicNumber,
          shortDescription: form.shortDescription,
          sortOrder: form.sortOrder,
          iconType: form.iconType,
          iconLibrary: form.iconLibrary,
          iconName: form.iconName,
          iconColor: form.iconColor,
          imagePath: form.imagePath,
          persistedImagePath: form.persistedImagePath,
        });
        resetForm();
        setIsEditorOpen(false);
        router.refresh();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Failed to save topic.");
      }
    });
  }

  function handleSaveLesson() {
    setError(null);

    startSaveLessonTransition(async () => {
      try {
        await saveLesson(lessonForm);
        setLessonForm(initialLessonForm);
        setIsLessonModalOpen(false);
        router.refresh();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Failed to save lesson.");
      }
    });
  }

  function handleDelete(id: string) {
    setError(null);

    startDeleteTransition(async () => {
      try {
        await deleteTopic(id);
        if (form.id === id) {
          resetForm();
        }
        router.refresh();
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "Failed to delete topic.");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-3xl">Topics</CardTitle>
              <CardDescription>
                Topics stay under one class, one subject, one unit, and one lesson. The list stays empty until the full
                filter path is applied.
              </CardDescription>
            </div>
            <Button type="button" onClick={beginCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Topic
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select the full hierarchy path, then apply filters to load topics.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-[160px_180px_200px_220px_1fr_auto_auto]">
            <SelectField
              label="Class"
              value={draftFilterClassId}
              onChange={(classId) => {
                setDraftFilterClassId(classId);
                setDraftFilterSubjectId("");
                setDraftFilterUnitId("");
                setDraftFilterLessonId("");
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
              }}
              options={availableDraftFilterUnits.map((item) => ({ id: item.id, label: item.title }))}
              placeholder={draftFilterSubjectId ? "Select unit" : "Select subject first"}
              disabled={!draftFilterSubjectId}
            />
            <SelectField
              label="Lesson"
              value={draftFilterLessonId}
              onChange={setDraftFilterLessonId}
              options={availableDraftFilterLessons.map((item) => ({ id: item.id, label: item.title }))}
              placeholder={draftFilterUnitId ? "Select lesson" : "Select unit first"}
              disabled={!draftFilterUnitId}
            />
            <Field>
              <FieldLabel>Search</FieldLabel>
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search topics..." />
            </Field>
            <div className="flex items-end gap-3">
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
            </div>
            <div className="flex items-end">
              <Badge variant="outline">
                {appliedFilterClassId && appliedFilterSubjectId && appliedFilterUnitId && appliedFilterLessonId
                  ? `${filteredTopics.length} shown`
                  : "Not applied"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Topic list</CardTitle>
          <CardDescription>Only the applied class, subject, unit, and lesson path will load topics.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!appliedFilterClassId || !appliedFilterSubjectId || !appliedFilterUnitId || !appliedFilterLessonId ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              Apply class, subject, unit, and lesson filters to view topics.
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              No topics matched the applied filters.
            </div>
          ) : (
            filteredTopics.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-xl border bg-card p-4 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="flex gap-4">
                  <EntityVisual
                    title={item.title}
                    iconType={item.iconType}
                    iconName={item.iconName}
                    iconColor={item.iconColor}
                    imagePath={item.imagePath}
                  />
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-lg font-semibold">{item.title}</div>
                    <Badge variant="secondary">{item.className}</Badge>
                    <Badge variant="outline">{item.subjectName}</Badge>
                    <Badge variant="outline">{item.unitTitle}</Badge>
                    <Badge variant="outline">{item.lessonTitle}</Badge>
                    <Badge variant="outline">{item.topicNumber || "No number"}</Badge>
                    <Badge variant="outline">Order {item.sortOrder}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{item.slug}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.contentsCount} content link{item.contentsCount === 1 ? "" : "s"} attached
                  </div>
                  {item.shortDescription ? (
                    <div className="text-sm text-muted-foreground">{item.shortDescription}</div>
                  ) : null}
                </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" onClick={() => beginEdit(item)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isDeleting}
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ResponsiveEntityEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        title={form.id ? "Edit topic" : "Create topic"}
        description="Pick class, subject, unit, and lesson in order before saving the topic."
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={
                isSaving ||
                !form.classId ||
                !form.subjectId ||
                !form.unitId ||
                !form.lessonId ||
                !form.title.trim()
              }
            >
              {isSaving ? "Saving..." : form.id ? "Update Topic" : "Create Topic"}
            </Button>
          </div>
        }
      >
        <FieldGroup>
          <SelectField
            label="Class"
            value={form.classId}
            onChange={(classId) =>
              setForm((current) => ({
                ...current,
                classId,
                subjectId: "",
                unitId: "",
                lessonId: "",
              }))
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
              }))
            }
            options={availableFormSubjects.map((item) => ({ id: item.id, label: item.name }))}
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
              }))
            }
            options={availableFormUnits.map((item) => ({ id: item.id, label: item.title }))}
            placeholder={form.subjectId ? "Select unit" : "Select subject first"}
            disabled={!form.subjectId}
          />
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <SelectField
              label="Lesson"
              value={form.lessonId}
              onChange={(lessonId) => setForm((current) => ({ ...current, lessonId }))}
              options={availableFormLessons.map((item) => ({ id: item.id, label: item.title }))}
              placeholder={form.unitId ? "Select lesson" : "Select unit first"}
              disabled={!form.unitId}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setLessonForm((current) => ({
                  ...current,
                  classId: form.classId,
                  subjectId: form.subjectId,
                  unitId: form.unitId,
                }));
                setIsLessonModalOpen(true);
              }}
              disabled={!form.classId || !form.subjectId || !form.unitId}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Lesson
            </Button>
          </div>
          <Field>
            <FieldLabel>Title</FieldLabel>
            <Input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Topic 1"
            />
          </Field>
          <Field>
            <FieldLabel>Topic number</FieldLabel>
            <Input
              value={form.topicNumber}
              onChange={(event) => setForm((current) => ({ ...current, topicNumber: event.target.value }))}
              placeholder="1"
            />
          </Field>
          <Field>
            <FieldLabel>Sort order</FieldLabel>
            <Input
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel>Short description</FieldLabel>
            <Textarea
              value={form.shortDescription}
              onChange={(event) => setForm((current) => ({ ...current, shortDescription: event.target.value }))}
              placeholder="Short topic summary"
            />
            <FieldDescription>Server actions validate the full chain before the topic is saved.</FieldDescription>
          </Field>
          <EntityMediaField
            domain="topics"
            titlePreview={form.title || "Topic preview"}
            value={form}
            onChange={(media) => setForm((current) => ({ ...current, ...media }))}
            error={null}
          />
          {error ? <div className="text-sm font-medium text-destructive">{error}</div> : null}
        </FieldGroup>
      </ResponsiveEntityEditor>

      <ResponsiveEntityEditor
        open={isLessonModalOpen}
        onOpenChange={setIsLessonModalOpen}
        title="Create lesson"
        description="Create the parent lesson without leaving the topic page."
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsLessonModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveLesson}
              disabled={
                isSavingLesson ||
                !lessonForm.classId ||
                !lessonForm.subjectId ||
                !lessonForm.unitId ||
                !lessonForm.title.trim()
              }
            >
              {isSavingLesson ? "Saving..." : "Create Lesson"}
            </Button>
          </div>
        }
      >
        <FieldGroup>
          <SelectField
            label="Class"
            value={lessonForm.classId}
            onChange={(classId) =>
              setLessonForm((current) => ({
                ...current,
                classId,
                subjectId: "",
                unitId: "",
              }))
            }
            options={classes.map((item) => ({ id: item.id, label: item.name }))}
            placeholder="Select class"
          />
          <SelectField
            label="Subject"
            value={lessonForm.subjectId}
            onChange={(subjectId) =>
              setLessonForm((current) => ({
                ...current,
                subjectId,
                unitId: "",
              }))
            }
            options={subjects
              .filter((item) => item.classId === lessonForm.classId)
              .map((item) => ({ id: item.id, label: item.name }))}
            placeholder={lessonForm.classId ? "Select subject" : "Select class first"}
            disabled={!lessonForm.classId}
          />
          <SelectField
            label="Unit"
            value={lessonForm.unitId}
            onChange={(unitId) => setLessonForm((current) => ({ ...current, unitId }))}
            options={units
              .filter((item) => item.classId === lessonForm.classId && item.subjectId === lessonForm.subjectId)
              .map((item) => ({ id: item.id, label: item.title }))}
            placeholder={lessonForm.subjectId ? "Select unit" : "Select subject first"}
            disabled={!lessonForm.subjectId}
          />
          <Field>
            <FieldLabel>Title</FieldLabel>
            <Input
              value={lessonForm.title}
              onChange={(event) => setLessonForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Lesson 1"
            />
          </Field>
          <Field>
            <FieldLabel>Lesson number</FieldLabel>
            <Input
              value={lessonForm.lessonNumber}
              onChange={(event) => setLessonForm((current) => ({ ...current, lessonNumber: event.target.value }))}
              placeholder="1"
            />
          </Field>
          <Field>
            <FieldLabel>Sort order</FieldLabel>
            <Input
              type="number"
              min={0}
              value={lessonForm.sortOrder}
              onChange={(event) => setLessonForm((current) => ({ ...current, sortOrder: event.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel>Short description</FieldLabel>
            <Textarea
              value={lessonForm.shortDescription}
              onChange={(event) => setLessonForm((current) => ({ ...current, shortDescription: event.target.value }))}
              placeholder="Short lesson summary"
            />
          </Field>
          <EntityMediaField
            domain="lessons"
            titlePreview={lessonForm.title || "Lesson preview"}
            value={lessonForm}
            onChange={(media) => setLessonForm((current) => ({ ...current, ...media }))}
            error={null}
          />
          {error ? <div className="text-sm font-medium text-destructive">{error}</div> : null}
        </FieldGroup>
      </ResponsiveEntityEditor>
    </div>
  );
}
