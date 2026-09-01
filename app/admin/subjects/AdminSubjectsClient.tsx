"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { saveClass } from "@/app/admin/classes/actions";
import { deleteSubject, saveSubject } from "@/app/admin/subjects/actions";
import { EntityVisual } from "@/components/app/EntityVisual";
import { EntityMediaField } from "@/components/admin/EntityMediaField";
import { ResponsiveEntityEditor } from "@/components/admin/ResponsiveEntityEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { AdminSelectField as SelectField } from "@/components/admin/AdminSelectField";
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

type SubjectRow = {
  id: string;
  classId: string;
  className: string;
  name: string;
  slug: string;
  code: string;
  description: string;
  sortOrder: number;
  iconType: string;
  iconLibrary: string;
  iconName: string;
  iconColor: string;
  imagePath: string;
  unitsCount: number;
};

type AdminSubjectsClientProps = {
  classes: ClassOption[];
  subjects: SubjectRow[];
};

const initialForm = {
  id: "",
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

const initialClassForm = {
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


export default function AdminSubjectsClient({ classes, subjects }: AdminSubjectsClientProps) {
  const router = useRouter();
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSavingClass, startSaveClassTransition] = useTransition();
  const [draftFilterClassId, setDraftFilterClassId] = useState("");
  const [appliedFilterClassId, setAppliedFilterClassId] = useState("");
  const [classForm, setClassForm] = useState(initialClassForm);
  const [form, setForm] = useState(initialForm);

  const filteredSubjects = useMemo(() => {
    if (!appliedFilterClassId) return [];
    const normalizedQuery = query.trim().toLowerCase();

    return subjects.filter((item) => {
      const matchesClass = item.classId === appliedFilterClassId;
      if (!matchesClass) return false;

      if (!normalizedQuery) return true;

      return [item.name, item.slug, item.code, item.description, item.className].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [subjects, appliedFilterClassId, query]);

  function resetForm() {
    setForm(initialForm);
  }

  function beginCreate() {
    setError(null);
    resetForm();
    setIsEditorOpen(true);
  }

  function beginEdit(item: SubjectRow) {
    setError(null);
    setForm({
      id: item.id,
      classId: item.classId,
      name: item.name,
      code: item.code,
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

  function handleSave() {
    setError(null);

    startSaveTransition(async () => {
      try {
        await saveSubject({
          id: form.id || undefined,
          classId: form.classId,
          name: form.name,
          code: form.code,
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
        setError(saveError instanceof Error ? saveError.message : "Failed to save subject.");
      }
    });
  }

  function applyFilters() {
    setAppliedFilterClassId(draftFilterClassId);
  }

  function clearFilters() {
    setDraftFilterClassId("");
    setAppliedFilterClassId("");
    setQuery("");
  }

  function handleSaveClass() {
    setError(null);

    startSaveClassTransition(async () => {
      try {
        await saveClass(classForm);
        setClassForm(initialClassForm);
        setIsClassModalOpen(false);
        router.refresh();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Failed to save class.");
      }
    });
  }

  function handleDelete(id: string) {
    setError(null);

    startDeleteTransition(async () => {
      try {
        await deleteSubject(id);
        if (form.id === id) {
          resetForm();
        }
        router.refresh();
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "Failed to delete subject.");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-3xl">Subjects</CardTitle>
              <CardDescription>
                Subjects sit inside a class and drive the next layer of units, lessons, topics, and published content.
              </CardDescription>
            </div>
            <Button type="button" onClick={beginCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Subject
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select the class first, then apply filters to load the subject list.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[240px_1fr_auto_auto]">
            <SelectField
              label="Class"
              value={draftFilterClassId}
              onChange={setDraftFilterClassId}
              options={classes.map((item) => ({ id: item.id, label: item.name }))}
              placeholder="Select class"
            />
            <Field>
              <FieldLabel>Search</FieldLabel>
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search subjects..." />
            </Field>
            <div className="flex items-end gap-3">
              <Button type="button" onClick={applyFilters} disabled={!draftFilterClassId}>
                Apply filter
              </Button>
              <Button type="button" variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
            <div className="flex items-end">
              <Badge variant="outline">{appliedFilterClassId ? `${filteredSubjects.length} shown` : "Not applied"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subject list</CardTitle>
          <CardDescription>Only the applied class filter will load matching subjects.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!appliedFilterClassId ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              Apply a class filter to view subjects.
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              No subjects matched the applied filters.
            </div>
          ) : (
            filteredSubjects.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-xl border bg-card p-4 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="flex gap-4">
                  <EntityVisual
                    title={item.name}
                    iconType={item.iconType}
                    iconName={item.iconName}
                    iconColor={item.iconColor}
                    imagePath={item.imagePath}
                  />
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-lg font-semibold">{item.name}</div>
                    <Badge variant="secondary">{item.className}</Badge>
                    <Badge variant="outline">{item.code || "No code"}</Badge>
                    <Badge variant="outline">Order {item.sortOrder}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{item.slug}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.unitsCount} unit{item.unitsCount === 1 ? "" : "s"} in this subject
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
        title={form.id ? "Edit subject" : "Create subject"}
        description="Pick the parent class first. The subject slug is derived server-side from the class and subject names."
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving || !form.classId || !form.name.trim()}>
              {isSaving ? "Saving..." : form.id ? "Update Subject" : "Create Subject"}
            </Button>
          </div>
        }
      >
        <FieldGroup>
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <SelectField
              label="Class"
              value={form.classId}
              onChange={(classId) => setForm((current) => ({ ...current, classId }))}
              options={classes.map((item) => ({ id: item.id, label: item.name }))}
              placeholder="Select class"
            />
            <Button type="button" variant="outline" onClick={() => setIsClassModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Class
            </Button>
          </div>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="English"
            />
          </Field>
          <Field>
            <FieldLabel>Code</FieldLabel>
            <Input
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
              placeholder="ENG"
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
              placeholder="Short note about the subject"
            />
            <FieldDescription>This first pass focuses on direct server-action CRUD with applied filter visibility.</FieldDescription>
          </Field>
          <EntityMediaField
            domain="subjects"
            titlePreview={form.name || "Subject preview"}
            value={form}
            onChange={setForm}
            error={null}
          />
          {error ? <div className="text-sm font-medium text-destructive">{error}</div> : null}
        </FieldGroup>
      </ResponsiveEntityEditor>

      <ResponsiveEntityEditor
        open={isClassModalOpen}
        onOpenChange={setIsClassModalOpen}
        title="Create class"
        description="Create the parent class without leaving the subject page."
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsClassModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveClass} disabled={isSavingClass || !classForm.name.trim()}>
              {isSavingClass ? "Saving..." : "Create Class"}
            </Button>
          </div>
        }
      >
        <FieldGroup>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input
              value={classForm.name}
              onChange={(event) => setClassForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Class 8"
            />
          </Field>
          <Field>
            <FieldLabel>Code</FieldLabel>
            <Input
              value={classForm.code}
              onChange={(event) => setClassForm((current) => ({ ...current, code: event.target.value }))}
              placeholder="C8"
            />
          </Field>
          <Field>
            <FieldLabel>Sort order</FieldLabel>
            <Input
              type="number"
              min={0}
              value={classForm.sortOrder}
              onChange={(event) => setClassForm((current) => ({ ...current, sortOrder: event.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel>Description</FieldLabel>
            <Textarea
              value={classForm.description}
              onChange={(event) => setClassForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Short note about the class group"
            />
          </Field>
          <EntityMediaField
            domain="classes"
            titlePreview={classForm.name || "Class preview"}
            value={classForm}
            onChange={setClassForm}
            error={null}
          />
          {error ? <div className="text-sm font-medium text-destructive">{error}</div> : null}
        </FieldGroup>
      </ResponsiveEntityEditor>
    </div>
  );
}
