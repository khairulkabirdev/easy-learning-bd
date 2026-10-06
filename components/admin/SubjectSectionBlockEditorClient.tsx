"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowDown, ArrowLeft, ArrowUp, Plus, Save, Trash2 } from "lucide-react";

import {
  createSubjectSectionBlock,
  updateSubjectSectionBlock,
} from "@/app/admin/content/subject-section-blocks/actions";
import {
  SUBJECT_SECTION_META,
  parseMatchingDocument,
  parseQuestionAnswerDocument,
  validateSubjectSectionDraft,
  type MatchingDocument,
  type QuestionAnswerDocument,
  type SubjectSectionKind,
  type SubjectSectionRecord,
  type SubjectSectionValidationErrors,
} from "@/app/admin/content/subject-section-blocks/types";
import { TiptapRichTextEditor } from "@/components/admin/TiptapRichTextEditor";
import { TableCompletionChoiceCombobox } from "@/components/app/TableCompletionChoiceCombobox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type EditorState = {
  title: string;
  instruction: string;
  details: string;
  document: MatchingDocument | QuestionAnswerDocument;
};

type Props = {
  kind: SubjectSectionKind;
  classItem: { id: string; name: string };
  subject: { id: string; name: string };
  record: SubjectSectionRecord;
  mode?: "create" | "edit";
};

function normalizeQuestionRows(document: QuestionAnswerDocument): QuestionAnswerDocument {
  return {
    version: 1,
    rows: document.rows.map((row, index) => ({ ...row, sortOrder: index })),
  };
}

function normalizeMatching(document: MatchingDocument): MatchingDocument {
  const columns = document.columns.map((column, index) => ({ ...column, sortOrder: index }));
  const rows = document.rows.map((row, index) => ({
    ...row,
    sortOrder: index,
    cells: columns.map((column, columnIndex) => {
      const source = row.cells.find((cell) => cell.columnId === column.id) || row.cells[columnIndex];
      return source
        ? { ...source, columnId: column.id }
        : { id: crypto.randomUUID(), columnId: column.id, text: "" };
    }),
  }));
  const answers = rows.map((_, index) => {
    const source = document.answers[index];
    return {
      id: source?.id || crypto.randomUUID(),
      sortOrder: index,
      selections: columns.map((column) => ({
        columnId: column.id,
        cellId: source?.selections.find((item) => item.columnId === column.id)?.cellId || "",
      })),
    };
  });
  return { version: 2, columns, rows, answers };
}

export function SubjectSectionBlockEditorClient({
  kind,
  classItem,
  subject,
  record,
  mode = "edit",
}: Props) {
  const router = useRouter();
  const meta = SUBJECT_SECTION_META[kind];
  const isCreate = mode === "create";
  const basePath = `/admin/content/class/${classItem.id}/subject/${subject.id}/${kind}`;
  const [state, setState] = useState<EditorState>(() => ({
    title: record.title,
    instruction: record.instruction,
    details: record.details,
    document:
      kind === "matching-sentences"
        ? parseMatchingDocument(record.documentJson, record.id)
        : parseQuestionAnswerDocument(record.documentJson, record.id),
  }));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<SubjectSectionValidationErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const stateRef = useRef(state);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingSavesRef = useRef(0);
  const latestSaveIdRef = useRef(0);
  const mutationRevisionRef = useRef(0);
  const lastSavedKeyRef = useRef(
    isCreate ? "" : `${record.title}\n${record.instruction}\n${record.details}\n${record.documentJson}`,
  );

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  function normalizedState(value: EditorState): EditorState {
    return {
      ...value,
      document:
        kind === "matching-sentences"
          ? normalizeMatching(value.document as MatchingDocument)
          : normalizeQuestionRows(value.document as QuestionAnswerDocument),
    };
  }

  function setEditorState(next: EditorState) {
    stateRef.current = next;
    setState(next);
  }

  function cancelAutosave() {
    if (!autosaveTimerRef.current) return;
    clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = null;
  }

  async function persist(snapshot: EditorState, successMessage = "Saved.") {
    if (isCreate) return false;
    const normalized = normalizedState(snapshot);
    const documentJson = JSON.stringify(normalized.document);
    const saveKey = `${normalized.title}\n${normalized.instruction}\n${normalized.details}\n${documentJson}`;
    if (saveKey === lastSavedKeyRef.current) {
      setMessage(successMessage);
      return true;
    }

    const saveId = ++latestSaveIdRef.current;
    pendingSavesRef.current += 1;
    setIsSaving(true);

    const operation = async () => {
      await updateSubjectSectionBlock({
        kind,
        id: record.id,
        classId: classItem.id,
        subjectId: subject.id,
        title: normalized.title,
        instruction: normalized.instruction,
        details: normalized.details,
        documentJson,
      });
      lastSavedKeyRef.current = saveKey;
    };

    const queued = saveQueueRef.current.then(operation, operation);
    saveQueueRef.current = queued.then(() => undefined, () => undefined);

    try {
      await queued;
      if (saveId === latestSaveIdRef.current) {
        setError(null);
        setMessage(successMessage);
      }
      return true;
    } catch (cause) {
      if (saveId === latestSaveIdRef.current) {
        setError(cause instanceof Error ? cause.message : "Failed to save block.");
      }
      return false;
    } finally {
      pendingSavesRef.current = Math.max(0, pendingSavesRef.current - 1);
      if (pendingSavesRef.current === 0) setIsSaving(false);
    }
  }

  function scheduleAutosave() {
    if (isCreate) return;
    cancelAutosave();
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      void persist(stateRef.current, "Saved automatically.");
    }, 700);
  }

  function patchState(patch: Partial<Omit<EditorState, "document">>) {
    mutationRevisionRef.current += 1;
    const next = { ...stateRef.current, ...patch };
    setEditorState(next);
    setMessage(null);
    setError(null);
    setValidationErrors({});
    scheduleAutosave();
  }

  function patchDocument(document: MatchingDocument | QuestionAnswerDocument, immediate = false) {
    const previous = stateRef.current;
    const next = { ...previous, document };
    const revision = ++mutationRevisionRef.current;
    setEditorState(next);
    setMessage(null);
    setError(null);
    setValidationErrors({});
    if (isCreate) return;
    if (immediate) {
      cancelAutosave();
      void persist(next, "Saved.").then((saved) => {
        if (!saved && mutationRevisionRef.current === revision) {
          setEditorState(previous);
        }
      });
    } else {
      scheduleAutosave();
    }
  }

  async function saveNow() {
    cancelAutosave();
    const normalized = normalizedState(stateRef.current);
    const nextValidationErrors = validateSubjectSectionDraft(kind, normalized);
    if (Object.keys(nextValidationErrors).length > 0) {
      setValidationErrors(nextValidationErrors);
      setMessage(null);
      setError(null);
      return;
    }

    setValidationErrors({});
    if (!isCreate) {
      await persist(normalized, "Saved.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const created = await createSubjectSectionBlock({
        kind,
        classId: classItem.id,
        subjectId: subject.id,
        title: normalized.title,
        instruction: normalized.instruction,
        details: normalized.details,
        documentJson: JSON.stringify(normalized.document),
      });
      router.replace(`${basePath}/${created.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Failed to create ${meta.singular}.`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void saveNow();
      }}
      noValidate
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2"
            render={<Link href={basePath} />}
          >
            <ArrowLeft data-icon="inline-start" />
            Back to {meta.title}
          </Button>
          <div>
            <div className="text-sm text-muted-foreground">
              {classItem.name} • {subject.name}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{isCreate ? "Add" : "Edit"} {meta.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isCreate
                ? "Complete the required fields, then create the block. Nothing is written to the database until validation passes."
                : "This block belongs directly to the subject. It has no Unit, Lesson, or Topic assignment."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isSaving ? <span className="text-sm text-muted-foreground">{isCreate ? "Creating…" : "Saving…"}</span> : null}
          <Button type="submit" disabled={isSaving}>
            <Save data-icon="inline-start" />
            {isCreate ? "Create block" : "Save"}
          </Button>
        </div>
      </div>

      {message ? <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">{message}</div> : null}
      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Unable to {isCreate ? "create" : "save"} block</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {Object.keys(validationErrors).length > 0 ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Please fix the required fields</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-5">
              {[...new Set(Object.values(validationErrors))].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{meta.title}</CardTitle>
          <CardDescription>{isCreate ? "Fill in the required exercise fields before creating the block." : "Edit the same fields used by this exercise block."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field data-invalid={Boolean(validationErrors.title)}>
              <FieldLabel htmlFor="section-title">
                Title <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="section-title"
                value={state.title}
                onChange={(event) => patchState({ title: event.target.value })}
                placeholder={meta.title}
                aria-invalid={Boolean(validationErrors.title)}
              />
              <FieldError>{validationErrors.title}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="section-instruction">Instruction</FieldLabel>
              <Textarea
                id="section-instruction"
                value={state.instruction}
                onChange={(event) => patchState({ instruction: event.target.value })}
                placeholder="Optional instruction for students..."
                rows={3}
              />
            </Field>
          </div>

          {kind === "matching-sentences" ? (
            <MatchingSentencesEditor
              document={state.document as MatchingDocument}
              onChange={patchDocument}
              validationErrors={validationErrors}
            />
          ) : kind === "rearrange-sentence" ? (
            <RearrangeSentenceEditor
              document={state.document as QuestionAnswerDocument}
              onChange={patchDocument}
              validationErrors={validationErrors}
            />
          ) : (
            <QuestionAnswerEditor
              kind={kind}
              document={state.document as QuestionAnswerDocument}
              onChange={patchDocument}
              validationErrors={validationErrors}
            />
          )}

          <div className="space-y-2">
            <Label>Details / Explanation</Label>
            <div className="rounded-xl border bg-background p-3">
              <TiptapRichTextEditor
                value={state.details}
                onChange={(value) => patchState({ details: value })}
                minHeight={130}
                placeholder="Optional explanation, note, or teacher guidance..."
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function MatchingSentencesEditor({
  document,
  onChange,
  validationErrors,
}: {
  document: MatchingDocument;
  onChange: (document: MatchingDocument, immediate?: boolean) => void;
  validationErrors: SubjectSectionValidationErrors;
}) {
  const normalized = useMemo(() => normalizeMatching(document), [document]);

  function addColumn() {
    const columnId = crypto.randomUUID();
    const index = normalized.columns.length;
    const column = {
      id: columnId,
      label: `Column ${String.fromCharCode(65 + Math.min(index, 25))}`,
      sortOrder: index,
    };
    onChange(
      normalizeMatching({
        ...normalized,
        columns: [...normalized.columns, column],
        rows: normalized.rows.map((row) => ({
          ...row,
          cells: [...row.cells, { id: crypto.randomUUID(), columnId, text: "" }],
        })),
        answers: normalized.answers.map((answer) => ({
          ...answer,
          selections: [...answer.selections, { columnId, cellId: "" }],
        })),
      }),
      true,
    );
  }

  function deleteColumn(columnId: string) {
    if (normalized.columns.length <= 2) return;
    onChange(
      normalizeMatching({
        ...normalized,
        columns: normalized.columns.filter((column) => column.id !== columnId),
        rows: normalized.rows.map((row) => ({
          ...row,
          cells: row.cells.filter((cell) => cell.columnId !== columnId),
        })),
        answers: normalized.answers.map((answer) => ({
          ...answer,
          selections: answer.selections.filter((selection) => selection.columnId !== columnId),
        })),
      }),
      true,
    );
  }

  function addRow() {
    const rowId = crypto.randomUUID();
    const row = {
      id: rowId,
      sortOrder: normalized.rows.length,
      cells: normalized.columns.map((column) => ({
        id: crypto.randomUUID(),
        columnId: column.id,
        text: "",
      })),
    };
    const answer = {
      id: crypto.randomUUID(),
      sortOrder: normalized.answers.length,
      selections: normalized.columns.map((column) => ({ columnId: column.id, cellId: "" })),
    };
    onChange(normalizeMatching({ ...normalized, rows: [...normalized.rows, row], answers: [...normalized.answers, answer] }), true);
  }

  function deleteRow(rowId: string) {
    const index = normalized.rows.findIndex((row) => row.id === rowId);
    if (index < 0) return;
    const removedCellIds = new Set(normalized.rows[index].cells.map((cell) => cell.id));
    const rows = normalized.rows.filter((row) => row.id !== rowId);
    const answers = normalized.answers
      .filter((_, answerIndex) => answerIndex !== index)
      .map((answer) => ({
        ...answer,
        selections: answer.selections.map((selection) => ({
          ...selection,
          cellId: removedCellIds.has(selection.cellId) ? "" : selection.cellId,
        })),
      }));
    onChange(normalizeMatching({ ...normalized, rows, answers }), true);
  }

  function moveRow(rowId: string, direction: "up" | "down") {
    const index = normalized.rows.findIndex((row) => row.id === rowId);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= normalized.rows.length) return;
    const rows = [...normalized.rows];
    const [movedRow] = rows.splice(index, 1);
    rows.splice(target, 0, movedRow);
    const answers = [...normalized.answers];
    const [movedAnswer] = answers.splice(index, 1);
    answers.splice(target, 0, movedAnswer);
    onChange(normalizeMatching({ ...normalized, rows, answers }), true);
  }

  function patchColumn(columnId: string, label: string) {
    onChange({
      ...normalized,
      columns: normalized.columns.map((column) => (column.id === columnId ? { ...column, label } : column)),
    });
  }

  function patchCell(rowId: string, cellId: string, text: string) {
    onChange({
      ...normalized,
      rows: normalized.rows.map((row) =>
        row.id === rowId
          ? { ...row, cells: row.cells.map((cell) => (cell.id === cellId ? { ...cell, text } : cell)) }
          : row,
      ),
    });
  }

  function selectAnswer(answerId: string, columnId: string, cellId: string) {
    onChange(
      {
        ...normalized,
        answers: normalized.answers.map((answer) =>
          answer.id === answerId
            ? {
                ...answer,
                selections: answer.selections.map((selection) =>
                  selection.columnId === columnId ? { ...selection, cellId } : selection,
                ),
              }
            : answer,
        ),
      },
      true,
    );
  }

  return (
    <div className="space-y-6">
      {validationErrors.document || validationErrors.answers ? (
        <FieldError>{validationErrors.document || validationErrors.answers}</FieldError>
      ) : null}
      <div className="overflow-hidden rounded-2xl border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
          <div>
            <div className="font-semibold">Matching Columns Builder</div>
            <p className="text-sm text-muted-foreground">Column A and Column B are always available. Add Column C or more whenever needed.</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">{normalized.columns.length} columns × {normalized.rows.length} rows</Badge>
            <Button type="button" variant="outline" size="sm" onClick={addColumn}>
              <Plus className="mr-2 h-4 w-4" /> Add column
            </Button>
            <Button type="button" size="sm" onClick={addRow}>
              <Plus className="mr-2 h-4 w-4" /> Add row
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 rounded-xl border">
            <thead>
              <tr className="bg-muted/40">
                <th className="w-14 border-b border-r p-2 text-center text-xs text-muted-foreground">#</th>
                {normalized.columns.map((column, columnIndex) => (
                  <th key={column.id} className="min-w-[210px] border-b border-r p-2 last:border-r-0">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <Input
                          value={column.label}
                          onChange={(event) => patchColumn(column.id, event.target.value)}
                          placeholder={`Column ${String.fromCharCode(65 + columnIndex)}`}
                          aria-invalid={Boolean(validationErrors[`column:${column.id}`])}
                        />
                        <FieldError className="mt-1">{validationErrors[`column:${column.id}`]}</FieldError>
                      </div>
                      {normalized.columns.length > 2 ? (
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => deleteColumn(column.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </th>
                ))}
                <th className="w-32 border-b p-2 text-center text-xs text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {normalized.rows.length === 0 ? (
                <tr>
                  <td colSpan={normalized.columns.length + 2} className="p-8 text-center text-sm text-muted-foreground">
                    No rows yet. Click Add row.
                  </td>
                </tr>
              ) : (
                normalized.rows.map((row, rowIndex) => (
                  <tr key={row.id}>
                    <td className="border-b border-r p-3 text-center font-medium">{rowIndex + 1}</td>
                    {normalized.columns.map((column, columnIndex) => {
                      const cell = row.cells.find((item) => item.columnId === column.id) || row.cells[columnIndex];
                      return (
                        <td key={column.id} className="border-b border-r p-3 last:border-r-0">
                          <Input
                            value={cell?.text || ""}
                            onChange={(event) => cell && patchCell(row.id, cell.id, event.target.value)}
                            placeholder={`${column.label || `Column ${String.fromCharCode(65 + columnIndex)}`} - row ${rowIndex + 1}`}
                            aria-invalid={Boolean(cell && validationErrors[`cell:${cell.id}`])}
                          />
                          {cell ? <FieldError className="mt-1">{validationErrors[`cell:${cell.id}`]}</FieldError> : null}
                        </td>
                      );
                    })}
                    <td className="border-b p-2">
                      <div className="flex justify-center gap-1">
                        <Button type="button" variant="ghost" size="icon" disabled={rowIndex === 0} onClick={() => moveRow(row.id, "up")}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" disabled={rowIndex === normalized.rows.length - 1} onClick={() => moveRow(row.id, "down")}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => deleteRow(row.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {normalized.rows.length > 0 ? (
        <div className="space-y-4 rounded-2xl border p-4">
          <div>
            <h3 className="font-semibold">Correct sentence connections</h3>
            <p className="text-sm text-muted-foreground">For each answer, choose one cell from every column.</p>
          </div>
          {normalized.answers.map((answer, answerIndex) => (
            <div key={answer.id} className="rounded-xl border p-4">
              <div className="mb-3 font-medium">Answer #{answerIndex + 1}</div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {normalized.columns.map((column, columnIndex) => {
                  const value = answer.selections.find((item) => item.columnId === column.id)?.cellId || "";
                  const usedByOthers = new Set(
                    normalized.answers
                      .filter((item) => item.id !== answer.id)
                      .map((item) => item.selections.find((selection) => selection.columnId === column.id)?.cellId || "")
                      .filter(Boolean),
                  );
                  const options = normalized.rows.map((row, rowIndex) => {
                    const cell = row.cells.find((item) => item.columnId === column.id) || row.cells[columnIndex];
                    return {
                      id: cell?.id || "",
                      label: `Row ${rowIndex + 1}${cell?.text ? ` — ${cell.text}` : ""}`,
                      disabled: Boolean(cell?.id && usedByOthers.has(cell.id)),
                    };
                  }).filter((item) => item.id);
                  return (
                    <div key={column.id} className="space-y-1.5">
                      <Label>{column.label || `Column ${String.fromCharCode(65 + columnIndex)}`}</Label>
                      <TableCompletionChoiceCombobox
                        value={value}
                        options={options}
                        placeholder="Choose row"
                        onChange={(cellId) => selectAnswer(answer.id, column.id, cellId)}
                      />
                      <FieldError>{validationErrors[`answer:${answer.id}:${column.id}`]}</FieldError>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RearrangeSentenceEditor({
  document,
  onChange,
  validationErrors,
}: {
  document: QuestionAnswerDocument;
  onChange: (document: QuestionAnswerDocument, immediate?: boolean) => void;
  validationErrors: SubjectSectionValidationErrors;
}) {
  const normalized = normalizeQuestionRows(document);

  function addRow() {
    onChange(
      normalizeQuestionRows({
        ...normalized,
        rows: [
          ...normalized.rows,
          { id: crypto.randomUUID(), sortOrder: normalized.rows.length, question: "", answer: "" },
        ],
      }),
      true,
    );
  }

  function patchRow(id: string, question: string) {
    onChange({
      ...normalized,
      rows: normalized.rows.map((row) => (row.id === id ? { ...row, question } : row)),
    });
  }

  function deleteRow(id: string) {
    onChange(normalizeQuestionRows({ ...normalized, rows: normalized.rows.filter((row) => row.id !== id) }), true);
  }

  function moveRow(id: string, direction: "up" | "down") {
    const index = normalized.rows.findIndex((row) => row.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= normalized.rows.length) return;
    const rows = [...normalized.rows];
    const [moved] = rows.splice(index, 1);
    rows.splice(target, 0, moved);
    onChange(normalizeQuestionRows({ ...normalized, rows }), true);
  }

  return (
    <div className="space-y-4 border-t pt-5">
      {validationErrors.document ? <FieldError>{validationErrors.document}</FieldError> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Sentences in the correct order</h3>
          <p className="text-sm text-muted-foreground">Add one sentence at a time. Students can later rearrange them into this saved order.</p>
        </div>
        <Button type="button" onClick={addRow}><Plus className="mr-2 h-4 w-4" />Add Rearrange Item</Button>
      </div>

      {normalized.rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No sentence items yet.</div>
      ) : (
        normalized.rows.map((row, index) => (
          <Card key={row.id} className="shadow-none">
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="secondary">Correct order #{index + 1}</Badge>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="icon" disabled={index === 0} onClick={() => moveRow(row.id, "up")}><ArrowUp className="h-4 w-4" /></Button>
                  <Button type="button" variant="outline" size="icon" disabled={index === normalized.rows.length - 1} onClick={() => moveRow(row.id, "down")}><ArrowDown className="h-4 w-4" /></Button>
                  <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={() => deleteRow(row.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                </div>
              </div>
              <div className="rounded-xl border bg-background p-3">
                <TiptapRichTextEditor
                  value={row.question}
                  onChange={(value) => patchRow(row.id, value)}
                  minHeight={120}
                  placeholder={`Write sentence ${index + 1}...`}
                />
              </div>
              <FieldError>{validationErrors[`row:${row.id}:question`]}</FieldError>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function QuestionAnswerEditor({
  kind,
  document,
  onChange,
  validationErrors,
}: {
  kind: "question-from-poems" | "question-from-story";
  document: QuestionAnswerDocument;
  onChange: (document: QuestionAnswerDocument, immediate?: boolean) => void;
  validationErrors: SubjectSectionValidationErrors;
}) {
  const normalized = normalizeQuestionRows(document);

  function addRow() {
    onChange(
      normalizeQuestionRows({
        ...normalized,
        rows: [
          ...normalized.rows,
          { id: crypto.randomUUID(), sortOrder: normalized.rows.length, question: "", answer: "" },
        ],
      }),
      true,
    );
  }

  function patchRow(id: string, patch: { question?: string; answer?: string }) {
    onChange({
      ...normalized,
      rows: normalized.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    });
  }

  function deleteRow(id: string) {
    onChange(normalizeQuestionRows({ ...normalized, rows: normalized.rows.filter((row) => row.id !== id) }), true);
  }

  function moveRow(id: string, direction: "up" | "down") {
    const index = normalized.rows.findIndex((row) => row.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= normalized.rows.length) return;
    const rows = [...normalized.rows];
    const [moved] = rows.splice(index, 1);
    rows.splice(target, 0, moved);
    onChange(normalizeQuestionRows({ ...normalized, rows }), true);
  }

  const label = kind === "question-from-poems" ? "Poem Question Answer" : "Story Question Answer";

  return (
    <div className="space-y-4 border-t pt-5">
      {validationErrors.document ? <FieldError>{validationErrors.document}</FieldError> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Question Answer items</h3>
          <p className="text-sm text-muted-foreground">No Passage field is used. Add each question together with its own answer.</p>
        </div>
        <Button type="button" onClick={addRow}><Plus className="mr-2 h-4 w-4" />Add {label}</Button>
      </div>

      {normalized.rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No question-answer items yet.</div>
      ) : (
        normalized.rows.map((row, index) => (
          <Card key={row.id} className="shadow-none">
            <CardContent className="space-y-5 pt-6">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="secondary">Question #{index + 1}</Badge>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="icon" disabled={index === 0} onClick={() => moveRow(row.id, "up")}><ArrowUp className="h-4 w-4" /></Button>
                  <Button type="button" variant="outline" size="icon" disabled={index === normalized.rows.length - 1} onClick={() => moveRow(row.id, "down")}><ArrowDown className="h-4 w-4" /></Button>
                  <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={() => deleteRow(row.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Question</Label>
                <div className="rounded-xl border bg-background p-3">
                  <TiptapRichTextEditor
                    value={row.question}
                    onChange={(value) => patchRow(row.id, { question: value })}
                    minHeight={120}
                    placeholder={`Write question ${index + 1}...`}
                  />
                </div>
                <FieldError>{validationErrors[`row:${row.id}:question`]}</FieldError>
              </div>
              <div className="space-y-2">
                <Label>Answer</Label>
                <div className="rounded-xl border bg-background p-3">
                  <TiptapRichTextEditor
                    value={row.answer}
                    onChange={(value) => patchRow(row.id, { answer: value })}
                    minHeight={140}
                    placeholder={`Write answer ${index + 1}...`}
                  />
                </div>
                <FieldError>{validationErrors[`row:${row.id}:answer`]}</FieldError>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
