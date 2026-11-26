"use client";

import { useActionState } from "react";
import { saveModelPaperDuration, setModelPaperVisibility } from "@/app/admin/model-question-import/publish-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ModelPaperVisibility({ id, published, durationMinutes }: { id: string; published: boolean; durationMinutes: number | null }) {
  const [state, action, pending] = useActionState(setModelPaperVisibility, {});
  const [durationState, durationAction, durationPending] = useActionState(saveModelPaperDuration, {});
  return (
    <div className="space-y-3">
      <form action={durationAction} className="space-y-2 border-t pt-3">
        <label htmlFor="paper-duration" className="text-sm font-medium">Exam duration (minutes)</label>
        <input type="hidden" name="id" value={id} />
        <div className="flex flex-wrap items-center gap-2">
          <Input key={`${id}:${durationMinutes ?? ""}`} id="paper-duration" name="durationMinutes" type="number" min={1} max={1440} step={1} defaultValue={durationMinutes ?? ""} placeholder="e.g. 90" className="w-36" disabled={durationPending} />
          <Button type="submit" variant="outline" disabled={durationPending}>{durationPending ? "Saving…" : "Save duration"}</Button>
        </div>
        <p className="text-xs text-muted-foreground">Leave blank if no exam duration is specified. This is displayed on the paper, not a countdown limit.</p>
        {durationState.error && <p className="text-sm text-destructive" role="alert">{durationState.error}</p>}
        {durationState.success && <p className="text-sm text-primary" role="status">Exam duration saved.</p>}
      </form>
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
    </div>
  );
}
