"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  createUnseenComposition,
  deleteUnseenComposition,
} from "@/app/admin/content/unseen-composition/actions";
import { ResponsiveEntityEditor } from "@/components/admin/ResponsiveEntityEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  classItem: { id: string; name: string };
  subject: { id: string; name: string };
  records: Array<{
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  }>;
};

export function UnseenCompositionListClient({ classItem, subject, records }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, startCreateTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

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

  function deleteRecord(id: string) {
    if (!window.confirm("Delete this Unseen Composition?")) return;
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
            <Plus className="mr-2 h-4 w-4" />
            New Unseen
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Unseen records</CardTitle>
            <CardDescription>Open a record to edit its passage and exercise blocks.</CardDescription>
          </div>
          <Badge variant="outline">{records.length} records</Badge>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              No Unseen Composition records yet. Click <strong>New Unseen</strong> to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex flex-col gap-4 rounded-xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-semibold">{record.title}</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Updated {new Date(record.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/admin/content/class/${classItem.id}/subject/${subject.id}/unseen-composition/${record.id}`}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      Open Editor
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={isDeleting}
                      onClick={() => deleteRecord(record.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
        description="Enter the title. The editor contains a Passage field plus only Writing Summary, Information Transfer, and True / False exercise blocks."
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
    </div>
  );
}
