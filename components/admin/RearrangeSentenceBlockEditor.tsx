"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { validateSentenceOrderingDraft } from "@/app/admin/content/content-block-validation";
import type { QuestionAnswerRow, SubjectSectionValidationErrors } from "@/app/admin/content/subject-section-blocks/types";
import { TiptapRichTextEditor } from "@/components/admin/TiptapRichTextEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type RearrangeFields = { title: string; instruction: string; details: string };
type RearrangeDraft = RearrangeFields & { rows: QuestionAnswerRow[] };
type RowsUpdate = (rows: QuestionAnswerRow[]) => QuestionAnswerRow[];

function normalizeRows(rows: QuestionAnswerRow[]) {
  return rows.map((row, sortOrder) => ({ ...row, sortOrder }));
}

/** Canonical rearrange-sentence fields for both subject and content block records. */
export function RearrangeSentenceBlockFields({ value, onFieldsChange, onRowsChange, onFieldsBlur, validationErrors = {}, titleRequired = false }: {
  value: RearrangeDraft;
  onFieldsChange: (patch: Partial<RearrangeFields>) => void;
  onRowsChange: (update: RowsUpdate, immediate?: boolean) => void;
  onFieldsBlur?: () => void;
  validationErrors?: SubjectSectionValidationErrors;
  titleRequired?: boolean;
}) {
  const id = useId();
  const { title, instruction, details, rows } = value;

  function addRow() {
    const rowId = crypto.randomUUID();
    onRowsChange((current) => [...current, { id: rowId, sortOrder: current.length, question: "", answer: "" }], true);
  }

  function moveRow(rowId: string, step: -1 | 1) {
    onRowsChange((current) => {
      const index = current.findIndex((row) => row.id === rowId);
      const target = index + step;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return normalizeRows(next);
    }, true);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Field data-invalid={Boolean(validationErrors.title)}>
          <FieldLabel htmlFor={`${id}-title`}>
            Title {titleRequired && <span className="text-destructive">*</span>}
          </FieldLabel>
          <Input id={`${id}-title`} value={title} onChange={(event) => onFieldsChange({ title: event.target.value })}
            onBlur={onFieldsBlur} placeholder="Rearrange Sentence" aria-invalid={Boolean(validationErrors.title)} />
          <FieldError>{validationErrors.title}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-instruction`}>Instruction</FieldLabel>
          <Textarea id={`${id}-instruction`} value={instruction} onChange={(event) => onFieldsChange({ instruction: event.target.value })}
            onBlur={onFieldsBlur} placeholder="Optional instruction for students..." rows={3} />
        </Field>
      </div>

      <div className="space-y-4 border-t pt-5">
        <FieldError>{validationErrors.document}</FieldError>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Sentences in the correct order</h3>
            <p className="text-sm text-muted-foreground">Add one sentence at a time. Students can later rearrange them into this saved order.</p>
          </div>
          <Button type="button" onClick={addRow}><Plus className="mr-2 h-4 w-4" />Add Rearrange Item</Button>
        </div>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No sentence items yet.</div>
        ) : rows.map((row, index) => (
          <Card key={row.id} className="shadow-none">
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge variant="secondary">Correct order #{index + 1}</Badge>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="icon" aria-label={`Move sentence ${index + 1} up`} disabled={index === 0} onClick={() => moveRow(row.id, -1)}><ArrowUp className="h-4 w-4" /></Button>
                  <Button type="button" variant="outline" size="icon" aria-label={`Move sentence ${index + 1} down`} disabled={index === rows.length - 1} onClick={() => moveRow(row.id, 1)}><ArrowDown className="h-4 w-4" /></Button>
                  <Button type="button" variant="outline" size="sm" className="text-destructive"
                    aria-label={`Delete sentence ${index + 1}`}
                    onClick={() => onRowsChange((current) => normalizeRows(current.filter((item) => item.id !== row.id)), true)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                </div>
              </div>
              <div className="rounded-xl border bg-background p-3">
                <TiptapRichTextEditor value={row.question}
                  onChange={(question) => onRowsChange((current) => current.map((item) => item.id === row.id ? { ...item, question } : item))}
                  minHeight={120} placeholder={`Write sentence ${index + 1}...`} />
              </div>
              <FieldError>{validationErrors[`row:${row.id}:question`]}</FieldError>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        <FieldLabel>Details / Explanation</FieldLabel>
        <div className="rounded-xl border bg-background p-3">
          <TiptapRichTextEditor value={details} onChange={(value) => onFieldsChange({ details: value })}
            minHeight={130} placeholder="Optional explanation, note, or teacher guidance..." />
        </div>
      </div>
    </div>
  );
}

/** Content/model question records reject blank rows, so keep unfinished rows local. */
export function ContentRearrangeSentenceBlockEditor({ initial, onSave }: {
  initial: RearrangeDraft;
  onSave: (draft: RearrangeFields & { rows?: QuestionAnswerRow[] }) => Promise<void>;
}) {
  const [value, setValue] = useState(initial);
  const draftRef = useRef(initial);
  const completeRowsRef = useRef<QuestionAnswerRow[] | undefined>(undefined);
  const [rowsPending, setRowsPending] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const saveRevision = useRef(0);
  const fieldSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (fieldSaveTimer.current !== null) clearTimeout(fieldSaveTimer.current);
  }, []);

  function save({ title, instruction, details }: RearrangeDraft) {
    if (fieldSaveTimer.current !== null) {
      clearTimeout(fieldSaveTimer.current);
      fieldSaveTimer.current = null;
    }
    const revision = ++saveRevision.current;
    setSaveFailed(false);
    void onSave({ title, instruction, details, rows: completeRowsRef.current }).catch(() => {
      if (saveRevision.current === revision) setSaveFailed(true);
    });
  }

  function updateFields(patch: Partial<RearrangeFields>) {
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    setValue(next);
    if (patch.details !== undefined) {
      save(next);
    } else {
      if (fieldSaveTimer.current !== null) clearTimeout(fieldSaveTimer.current);
      fieldSaveTimer.current = setTimeout(() => save(draftRef.current), 500);
    }
  }

  function updateRows(update: RowsUpdate) {
    const current = draftRef.current;
    const rows = update(current.rows);
    if (rows === current.rows) return;
    const next = { ...current, rows };
    draftRef.current = next;
    setValue(next);
    const incomplete = rows.some((row) => Boolean(validateSentenceOrderingDraft({ sentence: row.question }).sentence));
    setRowsPending(incomplete);
    if (!incomplete) {
      completeRowsRef.current = normalizeRows(rows);
      save(next);
    }
  }

  return (
    <div className="space-y-4">
      <RearrangeSentenceBlockFields
        value={value}
        onFieldsChange={updateFields}
        onRowsChange={updateRows}
        onFieldsBlur={() => { if (fieldSaveTimer.current !== null) save(draftRef.current); }}
      />
      {rowsPending && <p role="status" className="text-sm text-muted-foreground">Fill in or remove the empty sentence items to save the new order.</p>}
      {saveFailed && <Button type="button" variant="outline" onClick={() => save(draftRef.current)}>Retry saving changes</Button>}
    </div>
  );
}
