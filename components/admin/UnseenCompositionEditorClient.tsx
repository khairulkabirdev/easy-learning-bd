"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, Check, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { saveUnseenComposition } from "@/app/admin/content/unseen-composition/actions";
import {
  createDefaultUnseenCompositionDocument,
  parseUnseenCompositionDocument,
  type InformationTransferBlock,
  type UnseenCompositionBlock,
  type UnseenCompositionDocument,
  type UnseenTrueFalseBlock,
  type WritingSummaryBlock,
} from "@/app/admin/content/unseen-composition/types";
import { TiptapRichTextEditor } from "@/components/admin/TiptapRichTextEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const BLOCK_LABELS: Record<UnseenCompositionBlock["kind"], string> = {
  "unseen-passage": "Unseen Passage",
  "writing-summary": "Writing Summary",
  "information-transfer": "Information Transfer",
  "true-false": "True / False",
};

type Props = {
  record: {
    id: string;
    title: string;
    documentJson: string;
  };
  classItem: { id: string; name: string };
  subject: { id: string; name: string };
};

function ensureRequiredBlocks(document: UnseenCompositionDocument) {
  const fresh = createDefaultUnseenCompositionDocument();
  const existingKinds = new Set(document.blocks.map((block) => block.kind));
  const missing = fresh.blocks.filter((block) => !existingKinds.has(block.kind));
  return {
    version: 1 as const,
    blocks: [...document.blocks, ...missing]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((block, index) => ({ ...block, sortOrder: index } as UnseenCompositionBlock)),
  };
}

export function UnseenCompositionEditorClient({ record, classItem, subject }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(record.title);
  const [document, setDocument] = useState<UnseenCompositionDocument>(() =>
    ensureRequiredBlocks(parseUnseenCompositionDocument(record.documentJson)),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  const passageBlock = useMemo(
    () => document.blocks.find((block) => block.kind === "unseen-passage") ?? null,
    [document.blocks],
  );
  const sortedBlocks = useMemo(
    () =>
      document.blocks
        .filter((block) => block.kind !== "unseen-passage")
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [document.blocks],
  );

  function updateBlock<T extends UnseenCompositionBlock["kind"]>(
    id: string,
    kind: T,
    updater: (block: Extract<UnseenCompositionBlock, { kind: T }>) => Extract<UnseenCompositionBlock, { kind: T }>,
  ) {
    setDocument((current) => ({
      ...current,
      blocks: current.blocks.map((block) => {
        if (block.id !== id || block.kind !== kind) return block;
        return updater(block as Extract<UnseenCompositionBlock, { kind: T }>);
      }),
    }));
  }

  function save() {
    setMessage(null);
    setError(null);
    startSaveTransition(async () => {
      try {
        await saveUnseenComposition({
          id: record.id,
          title,
          documentJson: JSON.stringify(document),
        });
        setMessage("Saved.");
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed to save Unseen Composition.");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Link
            href={`/admin/content/class/${classItem.id}/subject/${subject.id}/unseen-composition`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Unseen Composition
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Unseen Composition Editor</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">{classItem.name}</Badge>
              <Badge variant="outline">{subject.name}</Badge>
            </div>
          </div>
        </div>
        <Button type="button" onClick={save} disabled={isSaving || !title.trim()}>
          {isSaving ? <Save className="mr-2 h-4 w-4 animate-pulse" /> : <Save className="mr-2 h-4 w-4" />}
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>

      {message ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          <Check className="h-4 w-4" /> {message}
        </div>
      ) : null}
      {error ? <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div> : null}

      <Card>
        <CardHeader>
          <CardTitle>Record title</CardTitle>
          <CardDescription>This title appears in the Unseen Composition list.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Unseen Composition title" />
        </CardContent>
      </Card>

      {passageBlock && passageBlock.kind === "unseen-passage" ? (
        <Card>
          <CardHeader>
            <CardTitle>Passage</CardTitle>
            <CardDescription>Main unseen passage for this record.</CardDescription>
          </CardHeader>
          <CardContent>
            <TiptapRichTextEditor
              value={passageBlock.body}
              onChange={(body) =>
                updateBlock(passageBlock.id, "unseen-passage", (current) => ({ ...current, body }))
              }
              minHeight={260}
              placeholder="Write or paste the unseen passage..."
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-5">
        {sortedBlocks.map((block, index) => (
          <Card key={block.id} className="overflow-hidden">
            <CardHeader className="border-b bg-muted/20">
              <div className="flex items-start gap-3">
                <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-primary/10 px-2 text-xs font-bold text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="space-y-1">
                  <CardTitle>{BLOCK_LABELS[block.kind]}</CardTitle>
                  <CardDescription>
                    {block.kind === "unseen-passage" && "Main unseen passage for this record."}
                    {block.kind === "writing-summary" && "Summary writing instruction and model answer."}
                    {block.kind === "information-transfer" && "Information Transfer question and ordered answer key."}
                    {block.kind === "true-false" && "True / False statements with correction support."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 pt-5">
              {block.kind === "writing-summary" ? (
                <WritingSummaryEditor
                  block={block}
                  onChange={(next) => updateBlock(block.id, "writing-summary", () => next)}
                />
              ) : null}

              {block.kind === "information-transfer" ? (
                <InformationTransferEditor
                  block={block}
                  onChange={(next) => updateBlock(block.id, "information-transfer", () => next)}
                />
              ) : null}

              {block.kind === "true-false" ? (
                <TrueFalseEditor block={block} onChange={(next) => updateBlock(block.id, "true-false", () => next)} />
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function WritingSummaryEditor({
  block,
  onChange,
}: {
  block: WritingSummaryBlock;
  onChange: (block: WritingSummaryBlock) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Instruction</Label>
        <Input value={block.instruction} onChange={(event) => onChange({ ...block, instruction: event.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Model summary / answer</Label>
        <TiptapRichTextEditor
          value={block.modelAnswer}
          onChange={(modelAnswer) => onChange({ ...block, modelAnswer })}
          minHeight={180}
          placeholder="Write the model summary..."
        />
      </div>
    </div>
  );
}

function InformationTransferEditor({
  block,
  onChange,
}: {
  block: InformationTransferBlock;
  onChange: (block: InformationTransferBlock) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Question / table prompt</Label>
        <TiptapRichTextEditor
          value={block.question}
          onChange={(question) => onChange({ ...block, question })}
          minHeight={180}
          placeholder="Write the Information Transfer question..."
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label>Answer key</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onChange({ ...block, answers: [...block.answers, { id: crypto.randomUUID(), answer: "" }] })}
          >
            <Plus className="mr-2 h-4 w-4" /> Add answer
          </Button>
        </div>
        {block.answers.map((item, index) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-sm text-muted-foreground">Answer {index + 1}</span>
            <Input
              value={item.answer}
              onChange={(event) =>
                onChange({
                  ...block,
                  answers: block.answers.map((answer) =>
                    answer.id === item.id ? { ...answer, answer: event.target.value } : answer,
                  ),
                })
              }
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={block.answers.length <= 1}
              onClick={() => onChange({ ...block, answers: block.answers.filter((answer) => answer.id !== item.id) })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrueFalseEditor({
  block,
  onChange,
}: {
  block: UnseenTrueFalseBlock;
  onChange: (block: UnseenTrueFalseBlock) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Instruction</Label>
        <Input value={block.instruction} onChange={(event) => onChange({ ...block, instruction: event.target.value })} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label>Statements</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              onChange({
                ...block,
                rows: [
                  ...block.rows,
                  { id: crypto.randomUUID(), statement: "", expectedAnswer: true, correction: "" },
                ],
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" /> Add statement
          </Button>
        </div>

        {block.rows.map((row, index) => (
          <div key={row.id} className="space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">Statement {index + 1}</div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                disabled={block.rows.length <= 1}
                onClick={() => onChange({ ...block, rows: block.rows.filter((item) => item.id !== row.id) })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Input
              value={row.statement}
              onChange={(event) =>
                onChange({
                  ...block,
                  rows: block.rows.map((item) =>
                    item.id === row.id ? { ...item, statement: event.target.value } : item,
                  ),
                })
              }
              placeholder="Statement"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Switch
                checked={row.expectedAnswer}
                onCheckedChange={(expectedAnswer) =>
                  onChange({
                    ...block,
                    rows: block.rows.map((item) =>
                      item.id === row.id ? { ...item, expectedAnswer } : item,
                    ),
                  })
                }
              />
              <span className="text-sm font-medium">{row.expectedAnswer ? "True" : "False"}</span>
            </div>
            {!row.expectedAnswer ? (
              <Input
                value={row.correction}
                onChange={(event) =>
                  onChange({
                    ...block,
                    rows: block.rows.map((item) =>
                      item.id === row.id ? { ...item, correction: event.target.value } : item,
                    ),
                  })
                }
                placeholder="Correction for the false statement"
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
