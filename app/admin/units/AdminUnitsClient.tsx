"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { saveSubject } from "@/app/admin/subjects/actions";
import { deleteUnit, saveUnit } from "@/app/admin/units/actions";
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

type UnitRow = {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  title: string;
  slug: string;
  unitNumber: string;
  description: string;
  sortOrder: number;
  iconType: string;
  iconLibrary: string;
  iconName: string;
  iconColor: string;
  imagePath: string;
  lessonsCount: number;
};

type AdminUnitsClientProps = {
  classes: ClassOption[];
  subjects: SubjectOption[];
  units: UnitRow[];
};

const initialForm = {
  id: "",
  classId: "",
  subjectId: "",
  title: "",
  unitNumber: "",
  description: "",
  sortOrder: "0",
  iconType: "none",
  iconLibrary: "",
  iconName: "",
  iconColor: "#0f766e",
  imagePath: "",
  persistedImagePath: "",
};

const initialSubjectForm = {
  classId: "",
  name: "",
  code: "",
  description: "",
  sortOrder: "0",
  iconType: "none",
  iconLibrary: "",
  iconName: "",
  iconColor: "#0f766e",
  imagePath: "",
  persistedImagePath: "",
};

export default function AdminUnitsClient({ classes, subjects, units }: AdminUnitsClientProps) {
  const router = useRouter();
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isSavingSubject, startSaveSubjectTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draftFilterClassId, setDraftFilterClassId] = useState("");
  const [draftFilterSubjectId, setDraftFilterSubjectId] = useState("");
  const [appliedFilterClassId, setAppliedFilterClassId] = useState("");
  const [appliedFilterSubjectId, setAppliedFilterSubjectId] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [subjectForm, setSubjectForm] = useState(initialSubjectForm);

  const availableFormSubjects = useMemo(
    () => subjects.filter((item) => item.classId === form.classId),
    [subjects, form.classId],
  );
  const availableDraftFilterSubjects = useMemo(
    () => subjects.filter((item) => item.classId === draftFilterClassId),
    [subjects, draftFilterClassId],
  );

  const filteredUnits = useMemo(() => {
    if (!appliedFilterClassId || !appliedFilterSubjectId) return [];
    const normalizedQuery = query.trim().toLowerCase();

    return units.filter((item) => {
      if (item.classId !== appliedFilterClassId || item.subjectId !== appliedFilterSubjectId) {
        return false;
      }

      if (!normalizedQuery) return true;

      return [
        item.title,
        item.slug,
        item.unitNumber,
        item.description,
        item.className,
        item.subjectName,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [units, appliedFilterClassId, appliedFilterSubjectId, query]);

  function resetForm() {
    setForm(initialForm);
  }

  function beginCreate() {
    setError(null);
    resetForm();
    setIsEditorOpen(true);
  }

  function beginEdit(item: UnitRow) {
    setError(null);
    setForm({
      id: item.id,
      classId: item.classId,
      subjectId: item.subjectId,
      title: item.title,
      unitNumber: item.unitNumber,
      description: item.description,
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
  }

  function clearFilters() {
    setDraftFilterClassId("");
    setDraftFilterSubjectId("");
    setAppliedFilterClassId("");
    setAppliedFilterSubjectId("");
    setQuery("");
  }

  function handleSave() {
    setError(null);

    startSaveTransition(async () => {
      try {
        await saveUnit({
          id: form.id || undefined,
          classId: form.classId,
          subjectId: form.subjectId,
          title: form.title,
          unitNumber: form.unitNumber,
          description: form.description,
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
        setError(saveError instanceof Error ? saveError.message : "Failed to save unit.");
      }
    });
  }

  function handleSaveSubject() {
    setError(null);

    startSaveSubjectTransition(async () => {
      try {
        await saveSubject(subjectForm);
        setSubjectForm(initialSubjectForm);
        setIsSubjectModalOpen(false);
        router.refresh();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Failed to save subject.");
      }
    });
  }

  function handleDelete(id: string) {
    setError(null);

    startDeleteTransition(async () => {
      try {
        await deleteUnit(id);
        if (form.id === id) {
          resetForm();
        }
        router.refresh();
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "Failed to delete unit.");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-3xl">Units</CardTitle>
              <CardDescription>
                Units stay under one class and one subject. The list stays empty until the hierarchy filter is applied.
              </CardDescription>
            </div>
            <Button type="button" onClick={beginCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Unit
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select class and subject, then apply filters to load matching units.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[220px_240px_1fr_auto_auto]">
            <SelectField
              label="Class"
              value={draftFilterClassId}
              onChange={(classId) => {
                setDraftFilterClassId(classId);
                setDraftFilterSubjectId("");
              }}
              options={classes.map((item) => ({ id: item.id, label: item.name }))}
              placeholder="Select class"
            />
            <SelectField
              label="Subject"
              value={draftFilterSubjectId}
              onChange={setDraftFilterSubjectId}
              options={availableDraftFilterSubjects.map((item) => ({ id: item.id, label: item.name }))}
              placeholder={draftFilterClassId ? "Select subject" : "Select class first"}
              disabled={!draftFilterClassId}
            />
            <Field>
              <FieldLabel>Search</FieldLabel>
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search units..." />
            </Field>
            <div className="flex items-end gap-3">
              <Button type="button" onClick={applyFilters} disabled={!draftFilterClassId || !draftFilterSubjectId}>
                Apply filter
              </Button>
              <Button type="button" variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
            <div className="flex items-end">
              <Badge variant="outline">
                {appliedFilterClassId && appliedFilterSubjectId ? `${filteredUnits.length} shown` : "Not applied"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unit list</CardTitle>
          <CardDescription>Only the applied class and subject path will load units.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!appliedFilterClassId || !appliedFilterSubjectId ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              Apply class and subject filters to view units.
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              No units matched the applied filters.
            </div>
          ) : (
            filteredUnits.map((item) => (
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
                    <Badge variant="outline">{item.unitNumber || "No number"}</Badge>
                    <Badge variant="outline">Order {item.sortOrder}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{item.slug}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.lessonsCount} lesson{item.lessonsCount === 1 ? "" : "s"} in this unit
                  </div>
                  {item.description ? <div className="text-sm text-muted-foreground">{item.description}</div> : null}
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
        title={form.id ? "Edit unit" : "Create unit"}
        description="Pick the parent class and subject before saving the unit."
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !form.classId || !form.subjectId || !form.title.trim()}
            >
              {isSaving ? "Saving..." : form.id ? "Update Unit" : "Create Unit"}
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
              }))
            }
            options={classes.map((item) => ({ id: item.id, label: item.name }))}
            placeholder="Select class"
          />
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <SelectField
              label="Subject"
              value={form.subjectId}
              onChange={(subjectId) => setForm((current) => ({ ...current, subjectId }))}
              options={availableFormSubjects.map((item) => ({ id: item.id, label: item.name }))}
              placeholder={form.classId ? "Select subject" : "Select class first"}
              disabled={!form.classId}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSubjectForm((current) => ({ ...current, classId: form.classId }));
                setIsSubjectModalOpen(true);
              }}
              disabled={!form.classId}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Subject
            </Button>
          </div>
          <Field>
            <FieldLabel>Title</FieldLabel>
            <Input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Unit 1"
            />
          </Field>
          <Field>
            <FieldLabel>Unit number</FieldLabel>
            <Input
              value={form.unitNumber}
              onChange={(event) => setForm((current) => ({ ...current, unitNumber: event.target.value }))}
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
            <FieldLabel>Description</FieldLabel>
            <Textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Short note about the unit"
            />
            <FieldDescription>Server actions handle slug creation and hierarchy validation.</FieldDescription>
          </Field>
          <EntityMediaField
            domain="units"
            titlePreview={form.title || "Unit preview"}
            value={form}
            onChange={(media) => setForm((current) => ({ ...current, ...media }))}
            error={null}
          />
          {error ? <div className="text-sm font-medium text-destructive">{error}</div> : null}
        </FieldGroup>
      </ResponsiveEntityEditor>

      <ResponsiveEntityEditor
        open={isSubjectModalOpen}
        onOpenChange={setIsSubjectModalOpen}
        title="Create subject"
        description="Create the parent subject without leaving the unit page."
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsSubjectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveSubject}
              disabled={isSavingSubject || !subjectForm.classId || !subjectForm.name.trim()}
            >
              {isSavingSubject ? "Saving..." : "Create Subject"}
            </Button>
          </div>
        }
      >
        <FieldGroup>
          <SelectField
            label="Class"
            value={subjectForm.classId}
            onChange={(classId) => setSubjectForm((current) => ({ ...current, classId }))}
            options={classes.map((item) => ({ id: item.id, label: item.name }))}
            placeholder="Select class"
          />
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input
              value={subjectForm.name}
              onChange={(event) => setSubjectForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="English"
            />
          </Field>
          <Field>
            <FieldLabel>Code</FieldLabel>
            <Input
              value={subjectForm.code}
              onChange={(event) => setSubjectForm((current) => ({ ...current, code: event.target.value }))}
              placeholder="ENG"
            />
          </Field>
          <Field>
            <FieldLabel>Sort order</FieldLabel>
            <Input
              type="number"
              min={0}
              value={subjectForm.sortOrder}
              onChange={(event) => setSubjectForm((current) => ({ ...current, sortOrder: event.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel>Description</FieldLabel>
            <Textarea
              value={subjectForm.description}
              onChange={(event) => setSubjectForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Short note about the subject"
            />
          </Field>
          <EntityMediaField
            domain="subjects"
            titlePreview={subjectForm.name || "Subject preview"}
            value={subjectForm}
            onChange={(media) => setSubjectForm((current) => ({ ...current, ...media }))}
            error={null}
          />
          {error ? <div className="text-sm font-medium text-destructive">{error}</div> : null}
        </FieldGroup>
      </ResponsiveEntityEditor>
    </div>
  );
}
