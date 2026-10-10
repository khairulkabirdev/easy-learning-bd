"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateContentTitle } from "@/app/admin/content/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Props = {
  contentId: string;
  initialTitle: string;
};

export function SeenCompositionTitleEditor({ contentId, initialTitle }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [savedTitle, setSavedTitle] = useState(initialTitle);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();

  const trimmedTitle = title.trim();
  const isDirty = trimmedTitle !== savedTitle.trim();

  function saveTitle() {
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const result = await updateContentTitle({ id: contentId, title: trimmedTitle });
        setTitle(result.title);
        setSavedTitle(result.title);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed to save title.");
      }
    });
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Seen Composition</CardTitle>
        <CardDescription>Update the title shown in the Seen Composition list.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field className="flex-1" data-invalid={Boolean(error) || !trimmedTitle}>
            <FieldLabel htmlFor="seen-composition-record-title">Title</FieldLabel>
            <Input
              id="seen-composition-record-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
                  event.preventDefault();
                  saveTitle();
                }
              }}
              placeholder="Enter Seen Composition title"
              maxLength={200}
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
          <Button type="button" onClick={saveTitle} disabled={isSaving || !trimmedTitle || !isDirty}>
            {isSaving ? "Saving..." : "Save title"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
