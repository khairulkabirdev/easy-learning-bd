"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Edit3, Plus, Trash2 } from "lucide-react";

import {
  deleteSubjectSectionBlock,
  moveSubjectSectionBlock,
} from "@/app/admin/content/subject-section-blocks/actions";
import {
  SUBJECT_SECTION_META,
  type SubjectSectionKind,
} from "@/app/admin/content/subject-section-blocks/types";
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

export type SubjectSectionListItem = {
  id: string;
  title: string;
  sortOrder: number;
  updatedAt: string;
};

type Props = {
  kind: SubjectSectionKind;
  classItem: { id: string; name: string };
  subject: { id: string; name: string };
  records: SubjectSectionListItem[];
};

export function SubjectSectionBlockListClient({ kind, classItem, subject, records }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const meta = SUBJECT_SECTION_META[kind];
  const basePath = `/admin/content/class/${classItem.id}/subject/${subject.id}/${kind}`;
  const pendingDelete = useMemo(
    () => records.find((item) => item.id === pendingDeleteId) ?? null,
    [pendingDeleteId, records],
  );

  function handleMove(id: string, direction: "up" | "down") {
    setError(null);
    startTransition(async () => {
      try {
        await moveSubjectSectionBlock({
          kind,
          id,
          direction,
          classId: classItem.id,
          subjectId: subject.id,
        });
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed to move block.");
      }
    });
  }

  function confirmDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    setError(null);
    startTransition(async () => {
      try {
        await deleteSubjectSectionBlock({
          kind,
          id,
          classId: classItem.id,
          subjectId: subject.id,
        });
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed to delete block.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{classItem.name}</span>
            <span>•</span>
            <span>{subject.name}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{meta.title}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">{meta.description}</p>
        </div>
        <Button
          size="default"
          render={<Link href={`${basePath}/add`} />}
        >
          <Plus data-icon="inline-start" />
          Add {meta.title}
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {records.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No blocks yet</CardTitle>
            <CardDescription>
              Click <strong>Add {meta.title}</strong>. The /add form opens first, and no database record is created until the required fields pass validation and you submit the form.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((record, index) => (
            <Card key={record.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">#{index + 1}</Badge>
                    <div className="truncate font-semibold">
                      {record.title.trim() || `${meta.title} ${index + 1}`}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Updated {record.updatedAt.slice(0, 16).replace("T", " ")} UTC
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Move up"
                    title="Move up"
                    disabled={isPending || index === 0}
                    onClick={() => handleMove(record.id, "up")}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Move down"
                    title="Move down"
                    disabled={isPending || index === records.length - 1}
                    onClick={() => handleMove(record.id, "down")}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    render={<Link href={`${basePath}/${record.id}`} />}
                  >
                    <Edit3 data-icon="inline-start" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="default"
                    disabled={isPending}
                    onClick={() => setPendingDeleteId(record.id)}
                  >
                    <Trash2 data-icon="inline-start" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={Boolean(pendingDeleteId)} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this block?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.title?.trim()
                ? `“${pendingDelete.title}” will be permanently deleted.`
                : `This ${meta.singular} will be permanently deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
