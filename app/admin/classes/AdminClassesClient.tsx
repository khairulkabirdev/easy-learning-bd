"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { deleteClass, saveClass } from "@/app/admin/classes/actions";
import { EntityVisual } from "@/components/app/EntityVisual";
import { EntityMediaField } from "@/components/admin/EntityMediaField";
import { ResponsiveEntityEditor } from "@/components/admin/ResponsiveEntityEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ClassRow = {
  id: string;
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
  subjectsCount: number;
  unitsCount: number;
};

type AdminClassesClientProps = {
  classes: ClassRow[];
};

const initialForm = {
  id: "",
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

export default function AdminClassesClient({ classes }: AdminClassesClientProps) {
  const router = useRouter();
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const filteredClasses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return classes;

    return classes.filter((item) =>
      [item.name, item.slug, item.code, item.description].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [classes, query]);

  function resetForm() {
    setForm(initialForm);
  }

  function beginCreate() {
    setError(null);
    resetForm();
    setIsEditorOpen(true);
  }

  function beginEdit(item: ClassRow) {
    setError(null);
    setForm({
      id: item.id,
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
        await saveClass({
          id: form.id || undefined,
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
        setError(saveError instanceof Error ? saveError.message : "Failed to save class.");
      }
    });
  }

  function handleDelete(id: string) {
    setError(null);

    startDeleteTransition(async () => {
      try {
        await deleteClass(id);
        if (form.id === id) {
          resetForm();
        }
        router.refresh();
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "Failed to delete class.");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-3xl">Classes</CardTitle>
              <CardDescription>
                Manage the top-level academic groups. Each class becomes the entry point for subjects, units, lessons,
                topics, and student-side lesson browsing.
              </CardDescription>
            </div>
            <Button type="button" onClick={beginCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Class
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Class list</CardTitle>
              <CardDescription>Search existing classes and open an item in edit mode directly from the table.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline">{classes.length} total</Badge>
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search classes..." />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredClasses.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              No classes matched the current search.
            </div>
          ) : (
            filteredClasses.map((item) => (
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
                    <Badge variant="secondary">{item.code || "No code"}</Badge>
                    <Badge variant="outline">Order {item.sortOrder}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{item.slug}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.subjectsCount} subject{item.subjectsCount === 1 ? "" : "s"} | {item.unitsCount} unit
                    {item.unitsCount === 1 ? "" : "s"}
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
        title={form.id ? "Edit class" : "Create class"}
        description="Keep the class name clear and unique. The slug is derived server-side from the name."
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving || !form.name.trim()}>
              {isSaving ? "Saving..." : form.id ? "Update Class" : "Create Class"}
            </Button>
          </div>
        }
      >
        <FieldGroup>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Class 8"
            />
          </Field>
          <Field>
            <FieldLabel>Code</FieldLabel>
            <Input
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
              placeholder="C8"
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
              placeholder="Short note about the class group"
            />
            <FieldDescription>
              This page keeps the initial class CRUD simple. Visual identity and advanced metadata can be layered in later.
            </FieldDescription>
          </Field>
          <EntityMediaField
            domain="classes"
            titlePreview={form.name || "Class preview"}
            value={form}
            onChange={setForm}
            error={null}
          />
          {error ? <div className="text-sm font-medium text-destructive">{error}</div> : null}
        </FieldGroup>
      </ResponsiveEntityEditor>
    </div>
  );
}
