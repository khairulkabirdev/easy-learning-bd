"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, Edit3, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  deleteSubjectSectionBlock,
  moveSubjectSectionBlock,
} from "@/app/admin/content/subject-section-blocks/actions";
import {
  SUBJECT_SECTION_META,
  type SubjectSectionKind,
} from "@/app/admin/content/subject-section-blocks/types";
import {
  AdminRecordDataTable,
  type AdminRecordDataTableColumn,
} from "@/components/admin/AdminRecordDataTable";
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

  const columns = useMemo<AdminRecordDataTableColumn<SubjectSectionListItem>[]>(
    () => [
      {
        id: "position",
        header: "#",
        sortValue: (row) => row.sortOrder,
        cell: (_row, originalIndex) => <Badge variant="secondary">#{originalIndex + 1}</Badge>,
        headerClassName: "w-16",
        cellClassName: "w-16",
      },
      {
        id: "title",
        header: "Title",
        sortValue: (row) => row.title,
        cell: (row, originalIndex) => (
          <div className="max-w-96 truncate font-medium" title={row.title.trim() || `${meta.title} ${originalIndex + 1}`}>
            {row.title.trim() || `${meta.title} ${originalIndex + 1}`}
          </div>
        ),
      },
      {
        id: "updated",
        header: "Updated",
        sortValue: (row) => new Date(row.updatedAt),
        cell: (row) => (
          <span className="text-muted-foreground">
            {format(new Date(row.updatedAt), "dd MMM yyyy, HH:mm")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        headerClassName: "text-right",
        cellClassName: "text-right",
        cell: (row, originalIndex) => (
          <div className="flex min-w-max items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Move up"
              title="Move up"
              disabled={isPending || originalIndex === 0}
              onClick={() => handleMove(row.id, "up")}
            >
              <ArrowUp />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Move down"
              title="Move down"
              disabled={isPending || originalIndex === records.length - 1}
              onClick={() => handleMove(row.id, "down")}
            >
              <ArrowDown />
            </Button>
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`${basePath}/${row.id}`} />}
            >
              <Edit3 data-icon="inline-start" />
              Edit
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() => setPendingDeleteId(row.id)}
            >
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [basePath, isPending, meta.title, records.length],
  );

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
        <Button size="default" render={<Link href={`${basePath}/add`} />}>
          <Plus data-icon="inline-start" />
          Add {meta.title}
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>{meta.title} records</CardTitle>
            <CardDescription>Search, sort, paginate, reorder, edit, or delete records.</CardDescription>
          </div>
          <Badge variant="outline">{records.length} records</Badge>
        </CardHeader>
        <CardContent>
          <AdminRecordDataTable
            rows={records}
            columns={columns}
            searchValue={(row) => row.title}
            searchPlaceholder={`Search ${meta.title.toLowerCase()} title...`}
            emptyMessage={`No ${meta.title} records yet.`}
            initialPageSize={10}
          />
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(pendingDeleteId)} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.title?.trim()
                ? `“${pendingDelete.title}” will be permanently deleted.`
                : `This ${meta.singular} will be permanently deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
