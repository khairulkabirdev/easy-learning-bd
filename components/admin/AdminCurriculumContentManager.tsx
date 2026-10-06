"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { deleteContent, saveContent } from "@/app/admin/content/actions";
import { ResponsiveEntityEditor } from "@/components/admin/ResponsiveEntityEditor";
import { AdminSelectField as SelectField } from "@/components/admin/AdminSelectField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";

type UnitOption = { id: string; title: string };
type LessonOption = { id: string; unitId: string; title: string };
type TopicOption = { id: string; lessonId: string; title: string };
type ContentRow = {
  id: string;
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

  const [form, setForm] = useState({ unitId: "", lessonId: "", topicId: "" });
  const [filter, setFilter] = useState({ unitId: "", lessonId: "", topicId: "" });
  const [appliedFilter, setAppliedFilter] = useState({ unitId: "", lessonId: "", topicId: "" });

  const formLessons = useMemo(() => lessons.filter((item) => item.unitId === form.unitId), [lessons, form.unitId]);
  const formTopics = useMemo(() => topics.filter((item) => item.lessonId === form.lessonId), [topics, form.lessonId]);
  const filterLessons = useMemo(() => lessons.filter((item) => item.unitId === filter.unitId), [lessons, filter.unitId]);
  const filterTopics = useMemo(() => topics.filter((item) => item.lessonId === filter.lessonId), [topics, filter.lessonId]);

  const filteredContents = useMemo(() => {
    if (!appliedFilter.unitId || !appliedFilter.lessonId) return [];
    return contents.filter((item) => {
      if (item.unit.id !== appliedFilter.unitId || item.lesson.id !== appliedFilter.lessonId) return false;
      if (!appliedFilter.topicId) return true;
      return item.topic?.id === appliedFilter.topicId;
    });
  }, [contents, appliedFilter]);

  function beginCreate() {
    setError(null);
    setForm({ unitId: "", lessonId: "", topicId: "" });
    setIsEditorOpen(true);
  }

  function handleCreateContent() {
    setError(null);
    startSaveTransition(async () => {
      try {
        await saveContent({
          classId: classItem.id,
          subjectId: subject.id,
          unitId: form.unitId,
          lessonId: form.lessonId,
          topicId: form.topicId || undefined,
        });
        setIsEditorOpen(false);
        setAppliedFilter({ unitId: form.unitId, lessonId: form.lessonId, topicId: form.topicId });
        setFilter({ unitId: form.unitId, lessonId: form.lessonId, topicId: form.topicId });
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed to create content.");
      }
    });
  }

  function handleDeleteContent(id: string) {
    if (!window.confirm("Delete this content record?")) return;
    setError(null);
    startDeleteTransition(async () => {
      try {
        await deleteContent(id);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed to delete content.");
      }
    });
  }

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
              {appliedFilter.unitId && appliedFilter.lessonId ? `${filteredContents.length} shown` : "Not applied"}
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
            <Plus className="mr-2 h-4 w-4" />
            New Content
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Content records</CardTitle>
            <CardDescription>Open a record to manage its content blocks.</CardDescription>
          </div>
          <Badge variant="outline">{contents.length} records</Badge>
        </CardHeader>
        <CardContent>
          {!appliedFilter.unitId || !appliedFilter.lessonId ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              Select unit and lesson, then apply the filter.
            </div>
          ) : filteredContents.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">No content records found.</div>
          ) : (
            <div className="space-y-3">
              {filteredContents.map((item) => (
                <div key={item.id} className="flex flex-col gap-4 rounded-xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{item.unit.title}</Badge>
                      <span className="text-muted-foreground">/</span>
                      <Badge variant="outline">{item.lesson.title}</Badge>
                      {item.topic ? (
                        <>
                          <span className="text-muted-foreground">/</span>
                          <Badge variant="outline">{item.topic.title}</Badge>
                        </>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.blocksCount} block{item.blocksCount === 1 ? "" : "s"} · Created {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/admin/content/${item.id}${editorMode ? `?editorMode=${editorMode}` : ""}`}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
                    >
                      Open Editor <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Button type="button" variant="destructive" disabled={isDeleting} onClick={() => handleDeleteContent(item.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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
            <Button type="button" onClick={handleCreateContent} disabled={isSaving || !form.unitId || !form.lessonId}>
              {isSaving ? "Creating..." : "Create Content"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <SelectField
            label="Unit"
            value={form.unitId}
            onChange={(unitId) => setForm({ unitId, lessonId: "", topicId: "" })}
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
    </div>
  );
}
