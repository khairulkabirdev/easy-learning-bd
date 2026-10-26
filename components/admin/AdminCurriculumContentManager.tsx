"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { deleteContent, saveContent } from "@/app/admin/content/actions";
import { AdminSelectField as SelectField } from "@/components/admin/AdminSelectField";
import {
  AdminRecordDataTable,
  type AdminRecordDataTableColumn,
} from "@/components/admin/AdminRecordDataTable";
import { ResponsiveEntityEditor } from "@/components/admin/ResponsiveEntityEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type UnitOption = { id: string; title: string };
type LessonOption = { id: string; unitId: string; title: string };
type TopicOption = { id: string; lessonId: string; title: string };
type ContentRow = {
  id: string;
  title: string;
  unit: { id: string; title: string };
  lesson: { id: string; title: string };
  topic: { id: string; title: string } | null;
  blocksCount: number;
  createdAt: string;
};

type Props = {
  classItem: { id: string; name: string };
  subject: { id: string; name: string };
  units: UnitOption[];
  lessons: LessonOption[];
  topics: TopicOption[];
  contents: ContentRow[];
  heading?: string;
  description?: string;
  editorMode?: "seen-composition";
};

export function AdminCurriculumContentManager({
  classItem,
  subject,
  units,
  lessons,
  topics,
  contents,
  heading = "Content",
  description = "Select unit, lesson, and optional topic. Class and subject are already fixed.",
  editorMode,
}: Props) {
  const router = useRouter();
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ContentRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [form, setForm] = useState({ title: "", unitId: "", lessonId: "", topicId: "" });
  const [filter, setFilter] = useState({ unitId: "", lessonId: "", topicId: "" });
  const [appliedFilter, setAppliedFilter] = useState({ unitId: "", lessonId: "", topicId: "" });

  const formLessons = useMemo(() => lessons.filter((item) => item.unitId === form.unitId), [lessons, form.unitId]);
  const formTopics = useMemo(() => topics.filter((item) => item.lessonId === form.lessonId), [topics, form.lessonId]);
  const filterLessons = useMemo(() => lessons.filter((item) => item.unitId === filter.unitId), [lessons, filter.unitId]);
  const filterTopics = useMemo(() => topics.filter((item) => item.lessonId === filter.lessonId), [topics, filter.lessonId]);

  function beginCreate() {
    setError(null);
    setForm({ title: "", unitId: "", lessonId: "", topicId: "" });
    setIsEditorOpen(true);
  }

  function handleCreateContent() {
    setError(null);
    startSaveTransition(async () => {
      try {
        await saveContent({
          title: editorMode === "seen-composition" ? form.title.trim() : undefined,
          ...(editorMode === "seen-composition" ? { editorMode } : {}),
          classId: classItem.id,
          subjectId: subject.id,
          unitId: form.unitId,
          lessonId: form.lessonId,
          topicId: form.topicId || undefined,
        });
        setIsEditorOpen(false);
        setAppliedFilter({ unitId: form.unitId, lessonId: form.lessonId, topicId: form.topicId });
        setFilter({ unitId: form.unitId, lessonId: form.lessonId, topicId: form.topicId });
        setRefreshKey((value) => value + 1);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed to create content.");
      }
    });
  }

  function confirmDeleteContent() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    setError(null);
    startDeleteTransition(async () => {
      try {
        await deleteContent(id);
        setRefreshKey((value) => value + 1);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed to delete content.");
      }
    });
  }

  const columns = useMemo<AdminRecordDataTableColumn<ContentRow>[]>(() => {
    const items: AdminRecordDataTableColumn<ContentRow>[] = [];

    if (editorMode === "seen-composition") {
      items.push({
        id: "title",
        header: "Title",
        sortValue: (row) => row.title,
        cell: (row) => (
          <div className="max-w-72 truncate font-medium" title={row.title || "Untitled Seen Composition"}>
            {row.title.trim() || "Untitled Seen Composition"}
          </div>
        ),
      });
    }

    items.push(
      {
        id: "unit",
        header: "Unit",
        sortValue: (row) => row.unit.title,
        cell: (row) => <span className="font-medium">{row.unit.title}</span>,
      },
      {
        id: "lesson",
        header: "Lesson",
        sortValue: (row) => row.lesson.title,
        cell: (row) => row.lesson.title,
      },
      {
        id: "topic",
        header: "Topic",
        sortValue: (row) => row.topic?.title ?? "",
        cell: (row) => row.topic?.title || <span className="text-muted-foreground">—</span>,
      },
      {
        id: "blocks",
        header: "Blocks",
        sortValue: (row) => row.blocksCount,
        cell: (row) => <Badge variant="secondary">{row.blocksCount}</Badge>,
      },
      {
        id: "created",
        header: "Created",
        sortValue: (row) => new Date(row.createdAt),
        cell: (row) => <span className="text-muted-foreground">{format(new Date(row.createdAt), "dd MMM yyyy")}</span>,
      },
      {
        id: "actions",
        header: "Actions",
        headerClassName: "text-right",
        cellClassName: "text-right",
        cell: (row) => (
          <div className="flex min-w-max items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/admin/content/${row.id}${editorMode ? `?editorMode=${editorMode}` : ""}`} />}
            >
              <Edit3 data-icon="inline-start" />
              Edit
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={() => setPendingDelete(row)}
            >
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          </div>
        ),
      },
    );

    return items;
  }, [editorMode, isDeleting]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="secondary">{classItem.name}</Badge>
          <Badge variant="outline">{subject.name}</Badge>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div> : null}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Class and subject are fixed. Select unit and lesson to view records.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldGroup className="grid gap-4 md:grid-cols-3">
            <SelectField
              label="Unit"
              value={filter.unitId}
              onChange={(unitId) => setFilter({ unitId, lessonId: "", topicId: "" })}
              options={units.map((item) => ({ id: item.id, label: item.title }))}
              placeholder="Select unit"
            />
            <SelectField
              label="Lesson"
              value={filter.lessonId}
              onChange={(lessonId) => setFilter((current) => ({ ...current, lessonId, topicId: "" }))}
              options={filterLessons.map((item) => ({ id: item.id, label: item.title }))}
              placeholder={filter.unitId ? "Select lesson" : "Select unit first"}
              disabled={!filter.unitId}
            />
            <SelectField
              label="Topic"
              value={filter.topicId}
              onChange={(topicId) => setFilter((current) => ({ ...current, topicId }))}
              options={filterTopics.map((item) => ({ id: item.id, label: item.title }))}
              placeholder={filter.lessonId ? "Optional topic" : "Select lesson first"}
              disabled={!filter.lessonId}
            />
          </FieldGroup>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              type="button"
              onClick={() => setAppliedFilter(filter)}
              disabled={!filter.unitId || !filter.lessonId}
            >
              Apply filter
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFilter({ unitId: "", lessonId: "", topicId: "" });
                setAppliedFilter({ unitId: "", lessonId: "", topicId: "" });
              }}
            >
              Clear
            </Button>
            <Badge variant="outline">
              {appliedFilter.unitId && appliedFilter.lessonId ? "Filter applied" : "Not applied"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Create content record</CardTitle>
            <CardDescription>Select unit, lesson, and optional topic. Class and subject are already fixed.</CardDescription>
          </div>
          <Button type="button" onClick={beginCreate} className="sm:self-center">
            <Plus data-icon="inline-start" />
            New Content
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Content records</CardTitle>
            <CardDescription>Search, sort, paginate, edit, or delete content records.</CardDescription>
          </div>
          <Badge variant="outline">Server paged</Badge>
        </CardHeader>
        <CardContent>
          {!appliedFilter.unitId || !appliedFilter.lessonId ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              Select unit and lesson, then apply the filter.
            </div>
          ) : (
            <AdminRecordDataTable
              rows={contents}
              columns={columns}
              searchValue={(row) =>
                [row.title, row.unit.title, row.lesson.title, row.topic?.title ?? ""].join(" ")
              }
              searchPlaceholder={editorMode === "seen-composition" ? "Search title, unit, lesson, or topic..." : "Search unit, lesson, or topic..."}
              emptyMessage="No content records found."
              initialPageSize={10}
              defaultSort={{ columnId: "created", direction: "desc" }}
              server={{
                resource: "content",
                filters: {
                  classId: classItem.id,
                  subjectId: subject.id,
                  unitId: appliedFilter.unitId,
                  lessonId: appliedFilter.lessonId,
                  topicId: appliedFilter.topicId || undefined,
                },
                total: 0,
                enabled: Boolean(appliedFilter.unitId && appliedFilter.lessonId),
                refreshKey,
              }}
            />
          )}
        </CardContent>
      </Card>

      <ResponsiveEntityEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        title="Create content record"
        description={`${classItem.name} / ${subject.name}`}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setIsEditorOpen(false)}>Cancel</Button>
            <Button
              type="button"
              onClick={handleCreateContent}
              disabled={
                isSaving ||
                !form.unitId ||
                !form.lessonId ||
                (editorMode === "seen-composition" && !form.title.trim())
              }
            >
              {isSaving ? "Creating..." : "Create Content"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {editorMode === "seen-composition" ? (
            <Field data-invalid={!form.title.trim()}>
              <FieldLabel htmlFor="seen-composition-title">Title</FieldLabel>
              <Input
                id="seen-composition-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Enter Seen Composition title"
                maxLength={200}
                autoFocus
              />
              {!form.title.trim() ? <FieldError>Title is required.</FieldError> : null}
            </Field>
          ) : null}
          <SelectField
            label="Unit"
            value={form.unitId}
            onChange={(unitId) => setForm((current) => ({ ...current, unitId, lessonId: "", topicId: "" }))}
            options={units.map((item) => ({ id: item.id, label: item.title }))}
            placeholder="Select unit"
          />
          <SelectField
            label="Lesson"
            value={form.lessonId}
            onChange={(lessonId) => setForm((current) => ({ ...current, lessonId, topicId: "" }))}
            options={formLessons.map((item) => ({ id: item.id, label: item.title }))}
            placeholder={form.unitId ? "Select lesson" : "Select unit first"}
            disabled={!form.unitId}
          />
          <SelectField
            label="Topic"
            value={form.topicId}
            onChange={(topicId) => setForm((current) => ({ ...current, topicId }))}
            options={formTopics.map((item) => ({ id: item.id, label: item.title }))}
            placeholder={form.lessonId ? "Optional topic" : "Select lesson first"}
            disabled={!form.lessonId}
          />
          {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div> : null}
        </div>
      </ResponsiveEntityEditor>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this content record?</AlertDialogTitle>
            <AlertDialogDescription>
              {editorMode === "seen-composition" && pendingDelete?.title?.trim()
                ? `“${pendingDelete.title}” and every content block stored inside it will be permanently deleted.`
                : "This content record and every content block stored inside it will be permanently deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteContent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete content
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
