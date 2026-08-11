"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { deleteLesson, saveLesson } from "@/app/admin/lessons/actions";
import { saveUnit } from "@/app/admin/units/actions";
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

type LessonRow = {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  unitId: string;
  unitTitle: string;
  title: string;
  slug: string;
  lessonNumber: string;
  shortDescription: string;
  sortOrder: number;
  topicsCount: number;
};

type AdminLessonsClientProps = {
  classes: ClassOption[];
  subjects: SubjectOption[];
  units: UnitOption[];
  lessons: LessonRow[];
};

const initialForm = {
  id: "",
  classId: "",
  subjectId: "",
  unitId: "",
  title: "",
  lessonNumber: "",
  shortDescription: "",
  sortOrder: "0",
};

const initialUnitForm = {
  classId: "",
  subjectId: "",
  title: "",
  unitNumber: "",
  description: "",
  sortOrder: "0",
};

export default function AdminLessonsClient({ classes, subjects, units, lessons }: AdminLessonsClientProps) {
  const router = useRouter();
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isSavingUnit, startSaveUnitTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draftFilterClassId, setDraftFilterClassId] = useState("");
  const [draftFilterSubjectId, setDraftFilterSubjectId] = useState("");
  const [draftFilterUnitId, setDraftFilterUnitId] = useState("");
  const [appliedFilterClassId, setAppliedFilterClassId] = useState("");
  const [appliedFilterSubjectId, setAppliedFilterSubjectId] = useState("");
  const [appliedFilterUnitId, setAppliedFilterUnitId] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [unitForm, setUnitForm] = useState(initialUnitForm);

  const availableFormSubjects = useMemo(
    () => subjects.filter((item) => item.classId === form.classId),
    [subjects, form.classId],
  );
  const availableFormUnits = useMemo(
    () => units.filter((item) => item.classId === form.classId && item.subjectId === form.subjectId),
    [units, form.classId, form.subjectId],
  );
  const availableDraftFilterSubjects = useMemo(
    () => subjects.filter((item) => item.classId === draftFilterClassId),
    [subjects, draftFilterClassId],
  );
  const availableDraftFilterUnits = useMemo(
    () => units.filter((item) => item.classId === draftFilterClassId && item.subjectId === draftFilterSubjectId),
    [units, draftFilterClassId, draftFilterSubjectId],
  );

  const filteredLessons = useMemo(() => {
    if (!appliedFilterClassId || !appliedFilterSubjectId || !appliedFilterUnitId) return [];
    const normalizedQuery = query.trim().toLowerCase();

    return lessons.filter((item) => {
      if (
        item.classId !== appliedFilterClassId ||
        item.subjectId !== appliedFilterSubjectId ||
        item.unitId !== appliedFilterUnitId
      ) {
        return false;
      }

      if (!normalizedQuery) return true;

      return [
        item.title,
        item.slug,
        item.lessonNumber,
        item.shortDescription,
        item.className,
        item.subjectName,
        item.unitTitle,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [lessons, appliedFilterClassId, appliedFilterSubjectId, appliedFilterUnitId, query]);

  function resetForm() {
    setForm(initialForm);
  }

  function beginCreate() {
    setError(null);
    resetForm();
    setIsEditorOpen(true);
  }

  function beginEdit(item: LessonRow) {
    setError(null);
    setForm({
      id: item.id,
      classId: item.classId,
      subjectId: item.subjectId,
      unitId: item.unitId,
      title: item.title,
      lessonNumber: item.lessonNumber,
      shortDescription: item.shortDescription,
      sortOrder: String(item.sortOrder),
    });
    setIsEditorOpen(true);
  }

  function applyFilters() {
    setAppliedFilterClassId(draftFilterClassId);
    setAppliedFilterSubjectId(draftFilterSubjectId);
    setAppliedFilterUnitId(draftFilterUnitId);
  }

  function clearFilters() {
    setDraftFilterClassId("");
    setDraftFilterSubjectId("");
    setDraftFilterUnitId("");
    setAppliedFilterClassId("");
    setAppliedFilterSubjectId("");
    setAppliedFilterUnitId("");
    setQuery("");
  }

  function handleSave() {
    setError(null);

    startSaveTransition(async () => {
      try {
        await saveLesson({
          id: form.id || undefined,
          classId: form.classId,
          subjectId: form.subjectId,
          unitId: form.unitId,
          title: form.title,
          lessonNumber: form.lessonNumber,
          shortDescription: form.shortDescription,
          sortOrder: form.sortOrder,
        });
        resetForm();
        setIsEditorOpen(false);
        router.refresh();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Failed to save lesson.");
      }
    });
  }

  function handleSaveUnit() {
    setError(null);

    startSaveUnitTransition(async () => {
      try {
        await saveUnit(unitForm);
        setUnitForm(initialUnitForm);
        setIsUnitModalOpen(false);
        router.refresh();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Failed to save unit.");
      }
    });
  }

  function handleDelete(id: string) {
    setError(null);

    startDeleteTransition(async () => {
      try {
        await deleteLesson(id);
        if (form.id === id) {
          resetForm();
        }
        router.refresh();
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "Failed to delete lesson.");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-3xl">Lessons</CardTitle>
              <CardDescription>
                Lessons stay under one class, one subject, and one unit. The list stays empty until filters are applied.
              </CardDescription>
            </div>
            <Button type="button" onClick={beginCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Lesson
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select class, subject, and unit, then apply filters to load lessons.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-[200px_220px_240px_1fr_auto_auto]">
            <SelectField
              label="Class"
              value={draftFilterClassId}
              onChange={(classId) => {
                setDraftFilterClassId(classId);
                setDraftFilterSubjectId("");
                setDraftFilterUnitId("");
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
              }}
              options={availableDraftFilterSubjects.map((item) => ({ id: item.id, label: item.name }))}
              placeholder={draftFilterClassId ? "Select subject" : "Select class first"}
              disabled={!draftFilterClassId}
            />
            <SelectField
              label="Unit"
              value={draftFilterUnitId}
              onChange={setDraftFilterUnitId}
              options={availableDraftFilterUnits.map((item) => ({ id: item.id, label: item.title }))}
              placeholder={draftFilterSubjectId ? "Select unit" : "Select subject first"}
              disabled={!draftFilterSubjectId}
            />
            <Field>
              <FieldLabel>Search</FieldLabel>
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search lessons..." />
            </Field>
            <div className="flex items-end gap-3">
              <Button
                type="button"
                onClick={applyFilters}
                disabled={!draftFilterClassId || !draftFilterSubjectId || !draftFilterUnitId}
              >
                Apply filter
              </Button>
              <Button type="button" variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
            <div className="flex items-end">
              <Badge variant="outline">
                {appliedFilterClassId && appliedFilterSubjectId && appliedFilterUnitId
                  ? `${filteredLessons.length} shown`
                  : "Not applied"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lesson list</CardTitle>
          <CardDescription>Only the applied class, subject, and unit path will load lessons.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!appliedFilterClassId || !appliedFilterSubjectId || !appliedFilterUnitId ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              Apply class, subject, and unit filters to view lessons.
            </div>
          ) : filteredLessons.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              No lessons matched the applied filters.
            </div>
          ) : (
            filteredLessons.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-xl border bg-card p-4 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-lg font-semibold">{item.title}</div>
                    <Badge variant="secondary">{item.className}</Badge>
                    <Badge variant="outline">{item.subjectName}</Badge>
                    <Badge variant="outline">{item.unitTitle}</Badge>
                    <Badge variant="outline">{item.lessonNumber || "No number"}</Badge>
                    <Badge variant="outline">Order {item.sortOrder}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{item.slug}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.topicsCount} topic{item.topicsCount === 1 ? "" : "s"} in this lesson
                  </div>
                  {item.shortDescription ? (
                    <div className="text-sm text-muted-foreground">{item.shortDescription}</div>
                  ) : null}
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
        title={form.id ? "Edit lesson" : "Create lesson"}
        description="Pick class, subject, and unit in order before saving the lesson."
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !form.classId || !form.subjectId || !form.unitId || !form.title.trim()}
            >
              {isSaving ? "Saving..." : form.id ? "Update Lesson" : "Create Lesson"}
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
              }))
            }
            options={availableFormSubjects.map((item) => ({ id: item.id, label: item.name }))}
            placeholder={form.classId ? "Select subject" : "Select class first"}
            disabled={!form.classId}
          />
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <SelectField
              label="Unit"
              value={form.unitId}
              onChange={(unitId) => setForm((current) => ({ ...current, unitId }))}
              options={availableFormUnits.map((item) => ({ id: item.id, label: item.title }))}
              placeholder={form.subjectId ? "Select unit" : "Select subject first"}
              disabled={!form.subjectId}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUnitForm((current) => ({
                  ...current,
                  classId: form.classId,
                  subjectId: form.subjectId,
                }));
                setIsUnitModalOpen(true);
              }}
              disabled={!form.classId || !form.subjectId}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Unit
            </Button>
          </div>
          <Field>
            <FieldLabel>Title</FieldLabel>
            <Input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Lesson 1"
            />
          </Field>
          <Field>
            <FieldLabel>Lesson number</FieldLabel>
            <Input
              value={form.lessonNumber}
              onChange={(event) => setForm((current) => ({ ...current, lessonNumber: event.target.value }))}
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
              placeholder="Short lesson summary"
            />
            <FieldDescription>Server actions validate the full hierarchy before the lesson is saved.</FieldDescription>
          </Field>
          {error ? <div className="text-sm font-medium text-destructive">{error}</div> : null}
        </FieldGroup>
      </ResponsiveEntityEditor>

      <ResponsiveEntityEditor
        open={isUnitModalOpen}
        onOpenChange={setIsUnitModalOpen}
        title="Create unit"
        description="Create the parent unit without leaving the lesson page."
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsUnitModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveUnit}
              disabled={isSavingUnit || !unitForm.classId || !unitForm.subjectId || !unitForm.title.trim()}
            >
              {isSavingUnit ? "Saving..." : "Create Unit"}
            </Button>
          </div>
        }
      >
        <FieldGroup>
          <SelectField
            label="Class"
            value={unitForm.classId}
            onChange={(classId) =>
              setUnitForm((current) => ({
                ...current,
                classId,
                subjectId: "",
              }))
            }
            options={classes.map((item) => ({ id: item.id, label: item.name }))}
            placeholder="Select class"
          />
          <SelectField
            label="Subject"
            value={unitForm.subjectId}
            onChange={(subjectId) => setUnitForm((current) => ({ ...current, subjectId }))}
            options={subjects
              .filter((item) => item.classId === unitForm.classId)
              .map((item) => ({ id: item.id, label: item.name }))}
            placeholder={unitForm.classId ? "Select subject" : "Select class first"}
            disabled={!unitForm.classId}
          />
          <Field>
            <FieldLabel>Title</FieldLabel>
            <Input
              value={unitForm.title}
              onChange={(event) => setUnitForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Unit 1"
            />
          </Field>
          <Field>
            <FieldLabel>Unit number</FieldLabel>
            <Input
              value={unitForm.unitNumber}
              onChange={(event) => setUnitForm((current) => ({ ...current, unitNumber: event.target.value }))}
              placeholder="1"
            />
          </Field>
          <Field>
            <FieldLabel>Sort order</FieldLabel>
            <Input
              type="number"
              min={0}
              value={unitForm.sortOrder}
              onChange={(event) => setUnitForm((current) => ({ ...current, sortOrder: event.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel>Description</FieldLabel>
            <Textarea
              value={unitForm.description}
              onChange={(event) => setUnitForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Short note about the unit"
            />
          </Field>
          {error ? <div className="text-sm font-medium text-destructive">{error}</div> : null}
        </FieldGroup>
      </ResponsiveEntityEditor>
    </div>
  );
}
