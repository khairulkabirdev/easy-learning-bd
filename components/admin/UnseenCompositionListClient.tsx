"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  createUnseenComposition,
  deleteUnseenComposition,
} from "@/app/admin/content/unseen-composition/actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UnseenRow = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  classItem: { id: string; name: string };
  subject: { id: string; name: string };
  records: UnseenRow[];
};

export function UnseenCompositionListClient({ classItem, subject, records }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isCreating, startCreateTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const pendingDelete = useMemo(
    () => records.find((record) => record.id === pendingDeleteId) ?? null,
    [pendingDeleteId, records],
  );

  function createRecord() {
    setError(null);
    startCreateTransition(async () => {
      try {
        const result = await createUnseenComposition({
          classId: classItem.id,
          subjectId: subject.id,
          title,
        });
        setOpen(false);
        setTitle("");
        router.push(
          `/admin/content/class/${classItem.id}/subject/${subject.id}/unseen-composition/${result.id}`,
        );
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed to create Unseen Composition.");
      }
    });
  }

  function confirmDeleteRecord() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    setError(null);
    startDeleteTransition(async () => {
      try {
        await deleteUnseenComposition(id);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed to delete Unseen Composition.");
      }
    });
  }

  const columns = useMemo<AdminRecordDataTableColumn<UnseenRow>[]>(
    () => [
      {
        id: "title",
        header: "Title",
        sortValue: (row) => row.title,
        cell: (row) => (
          <div className="max-w-96 truncate font-medium" title={row.title}>
            {row.title}
          </div>
        ),
      },
      {
        id: "updated",
        header: "Updated",
        sortValue: (row) => new Date(row.updatedAt),
        cell: (row) => <span className="text-muted-foreground">{format(new Date(row.updatedAt), "dd MMM yyyy, HH:mm")}</span>,
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
              render={
                <Link
                  href={`/admin/content/class/${classItem.id}/subject/${subject.id}/unseen-composition/${row.id}`}
                />
              }
            >
              <Edit3 data-icon="inline-start" />
              Edit
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={() => setPendingDeleteId(row.id)}
            >
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [classItem.id, isDeleting, subject.id],
  );

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Unseen Composition</CardTitle>
            <CardDescription>
              Create a standalone unseen record by title, then open its dedicated block editor.
            </CardDescription>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="secondary">{classItem.name}</Badge>
              <Badge variant="outline">{subject.name}</Badge>
            </div>
          </div>
          <Button type="button" onClick={() => setOpen(true)} className="sm:self-center">
            <Plus data-icon="inline-start" />
            New Unseen
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Unseen records</CardTitle>
            <CardDescription>Search, sort, paginate, edit, or delete Unseen Composition records.</CardDescription>
          </div>
          <Badge variant="outline">{records.length} records</Badge>
        </CardHeader>
        <CardContent>
          <AdminRecordDataTable
            rows={records}
            columns={columns}
            searchValue={(row) => row.title}
            searchPlaceholder="Search Unseen Composition title..."
            emptyMessage="No Unseen Composition records yet."
            initialPageSize={10}
            defaultSort={{ columnId: "updated", direction: "desc" }}
          />
        </CardContent>
      </Card>

      <ResponsiveEntityEditor
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setError(null);
            setTitle("");
          }
        }}
        title="Create Unseen Composition"
        description="Enter the title, then open the dedicated block editor."
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={isCreating || !title.trim()} onClick={createRecord}>
              {isCreating ? "Creating..." : "Create & Open Editor"}
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="unseen-title">Title</Label>
          <Input
            id="unseen-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example: The Value of Time"
            autoFocus
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </ResponsiveEntityEditor>

      <AlertDialog open={Boolean(pendingDeleteId)} onOpenChange={(nextOpen) => !nextOpen && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this Unseen Composition?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.title
                ? `“${pendingDelete.title}” and all blocks stored in this record will be permanently deleted.`
                : "This Unseen Composition record will be permanently deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRecord}
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
