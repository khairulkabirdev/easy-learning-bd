"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { readModelQuestionApiResponse } from "@/lib/read-model-question-api-response";

export function ModelQuestionNativeEditorGate({ setId, currentPath }: { setId: string; currentPath: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function begin() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/model-question-sets/${encodeURIComponent(setId)}/native-editor`, {
        method: "POST", headers: { "Content-Type": "application/json" },
      });
      const result = await readModelQuestionApiResponse<{ success?: boolean; error?: string }>(response, "Open existing question blocks");
      if (!response.ok || !result.success) throw new Error(result.error || "Could not open existing content blocks.");
      // First open automatically shows the grouped Add Content Block dialog.
      router.push(`${currentPath}?addBlock=1`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open existing block editor.");
      setBusy(false);
    }
  }
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Question blocks</CardTitle>
        <CardDescription>Use the already implemented eLesson block editors, organized by paper and question category.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button type="button" disabled={busy} onClick={() => void begin()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {busy ? "Opening editor…" : "Add block"}
        </Button>
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          Your existing imported questions are preserved. No curriculum question blocks will be copied or replaced.
        </p>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
