"use client";

import { useActionState } from "react";
import { setModelPaperVisibility } from "@/app/admin/model-question-import/publish-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ModelPaperVisibility({ id, published }: { id: string; published: boolean }) {
  const [state, action, pending] = useActionState(setModelPaperVisibility, {});
  return (
    <form action={action} className="space-y-2 border-t pt-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="intent" value={published ? "unpublish" : "publish"} />
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={published ? "default" : "outline"}>{published ? "Published for students" : "Private draft"}</Badge>
        <Button type="submit" size="sm" variant={published ? "outline" : "default"} disabled={pending}>
          {pending ? "Saving…" : published ? "Unpublish" : "Publish to students"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Published papers appear under Model Questions for students in this class.</p>
      {state.error && <p className="text-sm text-destructive" role="alert">{state.error}</p>}
    </form>
  );
}
