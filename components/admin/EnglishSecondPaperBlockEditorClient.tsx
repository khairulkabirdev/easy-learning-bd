"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import {
  createEnglishSecondPaperBlock,
  updateEnglishSecondPaperBlock,
} from "@/app/admin/content/english-second-paper-blocks/actions";
import {
  ENGLISH_SECOND_PAPER_META,
  countBlankMarkers,
  extractSuffixPrefixWords,
  normalizeEnglishSecondPaperDocument,
  parseEnglishSecondPaperDocument,
  validateEnglishSecondPaperDraft,
  type BlankExerciseDocument,
  type EnglishSecondPaperDocument,
  type EnglishSecondPaperKind,
  type EnglishSecondPaperRecord,
  type EnglishSecondPaperValidationErrors,
  type QuestionAnswerItemsDocument,
  type SimpleQuestionAnswerDocument,
  type SubstitutionTableDocument,
  type SuffixPrefixDocument,
  type TagQuestionDocument,
} from "@/app/admin/content/english-second-paper-blocks/types";
import { BlockBoardYearFields } from "@/components/admin/BlockBoardYearFields";
import { TiptapRichTextEditor } from "@/components/admin/TiptapRichTextEditor";
import { TableCompletionChoiceCombobox } from "@/components/app/TableCompletionChoiceCombobox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FILL_BLANK_MARKER = "____";

type EditorState = {
  boardId: string | null;
  academicYearId: string | null;
  title: string;
  instruction: string;
  details: string;
  document: EnglishSecondPaperDocument;
};

function escapeHtmlText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function removeNthBlankMarker(value: string, targetIndex: number) {
  let index = -1;
  return value.replace(/_{2,}/g, (match) => {
    index += 1;
    return index === targetIndex ? "" : match;
  });
}

function removeNthUnderline(value: string, targetIndex: number) {
  let index = -1;
  return value.replace(/<u(?:\s[^>]*)?>([\s\S]*?)<\/u>/gi, (match) => {
    index += 1;
    return index === targetIndex ? "" : match;
  });
}

function normalizeRows(document: QuestionAnswerItemsDocument): QuestionAnswerItemsDocument {
  return {
    version: 1,
    rows: document.rows.map((row, index) => ({ ...row, sortOrder: index })),
  };
}

function substitutionColumnLabel(index: number) {
  return index < 26 ? `Column ${String.fromCharCode(65 + index)}` : `Column ${index + 1}`;
}

function normalizeSubstitution(document: SubstitutionTableDocument): SubstitutionTableDocument {
  const columns = document.columns.map((column, index) => ({ ...column, sortOrder: index }));
  const rows = document.rows.map((row, rowIndex) => ({
    ...row,
    sortOrder: rowIndex,
    cells: columns.map((column, columnIndex) => {
      const source = row.cells.find((cell) => cell.columnId === column.id) || row.cells[columnIndex];
      return source
        ? { ...source, columnId: column.id }
        : { id: crypto.randomUUID(), columnId: column.id, text: "" };
    }),
  }));
  const answers = document.answers.map((answer, answerIndex) => ({
    ...answer,
    sortOrder: answerIndex,
    selections: columns.map((column) => ({
      columnId: column.id,
      cellId: answer.selections.find((item) => item.columnId === column.id)?.cellId || "",
    })),
  }));
  return { version: 1, columns, rows, answers };
}

export function EnglishSecondPaperBlockEditorClient({
  kind,
  classItem,
  subject,
  record,
  mode = "edit",
}: {
  kind: EnglishSecondPaperKind;
  classItem: { id: string; name: string };
  subject: { id: string; name: string };
  record: EnglishSecondPaperRecord;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const meta = ENGLISH_SECOND_PAPER_META[kind];
  const isCreate = mode === "create";
  const basePath = `/admin/content/class/${classItem.id}/subject/${subject.id}/${kind}`;
  const [state, setState] = useState<EditorState>(() => ({
    boardId: record.boardId ?? null,
    academicYearId: record.academicYearId ?? null,
    title: record.title,
    instruction: record.instruction,
    details: record.details,
    document: parseEnglishSecondPaperDocument(kind, record.documentJson, record.id),
  }));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<EnglishSecondPaperValidationErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const stateRef = useRef(state);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingSavesRef = useRef(0);
  const latestSaveIdRef = useRef(0);
  const mutationRevisionRef = useRef(0);
  const initialDocument = JSON.stringify(normalizeEnglishSecondPaperDocument(kind, state.document, record.id));
  const lastSavedKeyRef = useRef(
    isCreate
      ? ""
      : `${record.boardId ?? ""}\n${record.academicYearId ?? ""}\n${record.title}\n${record.instruction}\n${record.details}\n${initialDocument}`,
  );

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  function normalizedState(value: EditorState): EditorState {
    return {
      ...value,
      document: normalizeEnglishSecondPaperDocument(kind, value.document, record.id),
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

  async function persist(
    snapshot: EditorState,
    successMessage = "Saved.",
    validationMode: "draft" | "final" = "draft",
  ) {
    if (isCreate) return false;
    const normalized = normalizedState(snapshot);
    const currentValidationErrors = validateEnglishSecondPaperDraft(kind, normalized);
    setValidationErrors(currentValidationErrors);
    if (validationMode === "final" && Object.keys(currentValidationErrors).length > 0) {
      setMessage(null);
      setError(null);
      return false;
    }
    const documentJson = JSON.stringify(normalized.document);
    const saveKey = `${normalized.boardId ?? ""}\n${normalized.academicYearId ?? ""}\n${normalized.title}\n${normalized.instruction}\n${normalized.details}\n${documentJson}`;
    if (saveKey === lastSavedKeyRef.current) {
      setMessage(successMessage);
      return true;
    }

    const saveId = ++latestSaveIdRef.current;
    pendingSavesRef.current += 1;
    setIsSaving(true);
    const operation = async () => {
      await updateEnglishSecondPaperBlock({
        kind,
        id: record.id,
        classId: classItem.id,
        subjectId: subject.id,
        boardId: normalized.boardId,
        academicYearId: normalized.academicYearId,
        title: normalized.title,
        instruction: normalized.instruction,
        details: normalized.details,
        documentJson,
        validationMode,
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

  function patchDocument(document: EnglishSecondPaperDocument, immediate = false) {
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
        if (!saved && mutationRevisionRef.current === revision) setEditorState(previous);
      });
    } else {
      scheduleAutosave();
    }
  }

  async function saveNow() {
    cancelAutosave();
    const normalized = normalizedState(stateRef.current);
    const errors = validateEnglishSecondPaperDraft(kind, normalized);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setMessage(null);
      setError(null);
      return;
    }

    setValidationErrors({});
    if (!isCreate) {
      await persist(normalized, "Saved.", "final");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const created = await createEnglishSecondPaperBlock({
        kind,
        classId: classItem.id,
        subjectId: subject.id,
        boardId: normalized.boardId,
        academicYearId: normalized.academicYearId,
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
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void saveNow();
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">{classItem.name} • {subject.name}</div>
          <h1 className="text-2xl font-bold tracking-tight">{isCreate ? "Add" : "Edit"} {meta.title}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {isCreate
              ? "Complete the required fields and create the block. No database row is created until validation passes."
              : "This block belongs directly to English 2nd Paper and has no Unit, Lesson, or Topic assignment."}
          </p>
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
              {[...new Set(Object.values(validationErrors))].map((item) => <li key={item}>{item}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{meta.title}</CardTitle>
          <CardDescription>{meta.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BlockBoardYearFields
            boardId={state.boardId}
            academicYearId={state.academicYearId}
            onChange={(value) => patchState(value)}
            disabled={isSaving}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <Field data-invalid={Boolean(validationErrors.title)}>
              <FieldLabel htmlFor="second-paper-title">Title <span className="text-destructive">*</span></FieldLabel>
              <Input
                id="second-paper-title"
                value={state.title}
                onChange={(event) => patchState({ title: event.target.value })}
                placeholder={meta.title}
                aria-invalid={Boolean(validationErrors.title)}
              />
              <FieldError>{validationErrors.title}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="second-paper-instruction">Instruction</FieldLabel>
              <Textarea
                id="second-paper-instruction"
                value={state.instruction}
                onChange={(event) => patchState({ instruction: event.target.value })}
                placeholder="Optional instruction for students..."
                rows={3}
              />
            </Field>
          </div>

          {(kind === "gap-filling" || kind === "right-form-of-verb" || kind === "preposition" || kind === "connector") ? (
            <BlankExerciseEditor
              kind={kind}
              document={state.document as BlankExerciseDocument}
              onChange={patchDocument}
              validationErrors={validationErrors}
            />
          ) : null}

          {(kind === "narration" || kind === "punctuation-and-capitalization") ? (
            <SimpleQuestionAnswerEditor
              kind={kind}
              document={state.document as SimpleQuestionAnswerDocument}
              onChange={patchDocument}
              validationErrors={validationErrors}
            />
          ) : null}

          {kind === "changing-sentence" ? (
            <QuestionAnswerItemsEditor
              document={state.document as QuestionAnswerItemsDocument}
              onChange={patchDocument}
              validationErrors={validationErrors}
            />
          ) : null}

          {kind === "substitution-table" ? (
            <SubstitutionTableEditor
              document={state.document as SubstitutionTableDocument}
              onChange={patchDocument}
              validationErrors={validationErrors}
            />
          ) : null}

          {kind === "suffix-and-prefix" ? (
            <SuffixPrefixEditor
              document={state.document as SuffixPrefixDocument}
              onChange={patchDocument}
              validationErrors={validationErrors}
            />
          ) : null}

          {kind === "tag-question" ? (
            <TagQuestionEditor
              document={state.document as TagQuestionDocument}
              onChange={patchDocument}
              validationErrors={validationErrors}
            />
          ) : null}

          <div className="space-y-2 border-t pt-5">
            <Label>Details / Explanation</Label>
            <div className="rounded-xl border bg-background p-3">
              <TiptapRichTextEditor
                value={state.details}
                onChange={(value) => patchState({ details: value })}
                minHeight={140}
                placeholder="Optional explanation, note, or teacher guidance..."
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function FillBlankQuestionEditor({
  value,
  onChange,
  title = "Question",
  description = "Write the passage and add blanks at the current cursor position.",
  maxBlanks,
}: {
  value: string;
  onChange: (value: string) => void;
  title?: string;
  description?: string;
  maxBlanks?: number;
}) {
  const editorRef = useRef<Editor | null>(null);
  const count = countBlankMarkers(value);
  const handleEditorReady = useCallback((editor: Editor | null) => {
    editorRef.current = editor;
  }, []);

  function insertBlank() {
    const editor = editorRef.current;
    if (!editor) return;
    if (maxBlanks !== undefined && count >= maxBlanks) return;
    editor.chain().focus().insertContent(FILL_BLANK_MARKER).run();
    onChange(editor.getHTML());
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-background">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-4 py-3">
        <div>
          <div className="font-medium">{title}</div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{count} blank{count === 1 ? "" : "s"}</Badge>
          <Button
            type="button"
            size="sm"
            onMouseDown={(event) => event.preventDefault()}
            onClick={insertBlank}
            disabled={maxBlanks !== undefined && count >= maxBlanks}
          >
            <Plus data-icon="inline-start" /> Add blank
          </Button>
        </div>
      </div>
      <div className="p-3">
        <TiptapRichTextEditor
          value={value}
          onChange={onChange}
          onEditorReady={handleEditorReady}
          minHeight={230}
          placeholder="Write the question here and add ____ blanks where answers belong."
        />
      </div>
    </div>
  );
}

function BlankExerciseEditor({
  kind,
  document,
  onChange,
  validationErrors,
}: {
  kind: "gap-filling" | "right-form-of-verb" | "preposition" | "connector";
  document: BlankExerciseDocument;
  onChange: (document: EnglishSecondPaperDocument, immediate?: boolean) => void;
  validationErrors: EnglishSecondPaperValidationErrors;
}) {
  const title = ENGLISH_SECOND_PAPER_META[kind].title;

  function patchQuestion(question: string) {
    const count = countBlankMarkers(question);
    const blanks = Array.from({ length: count }, (_, index) => document.blanks[index] || {
      id: crypto.randomUUID(),
      sortOrder: index,
      answer: "",
    }).map((blank, index) => ({ ...blank, sortOrder: index }));
    onChange({ version: 1, question, blanks });
  }

  function deleteBlank(index: number) {
    const question = removeNthBlankMarker(document.question, index);
    const blanks = document.blanks.filter((_, blankIndex) => blankIndex !== index).map((blank, sortOrder) => ({ ...blank, sortOrder }));
    onChange({ version: 1, question, blanks }, true);
  }

  return (
    <div className="space-y-5 border-t pt-5">
      <FillBlankQuestionEditor
        value={document.question}
        onChange={patchQuestion}
        title={`${title} Question`}
        description="Use the rich-text editor, place the cursor where an answer should go, then click Add blank."
      />
      <FieldError>{validationErrors.question || validationErrors.document}</FieldError>

      <div className="overflow-hidden rounded-2xl border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
          <div>
            <div className="font-medium">Answers</div>
            <p className="text-sm text-muted-foreground">Every inline blank has one matching answer.</p>
          </div>
          <Badge variant="secondary">{document.blanks.length} answers</Badge>
        </div>
        <div className="p-4">
          {document.blanks.length === 0 ? (
            <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No blanks yet.</div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {document.blanks.map((blank, index) => (
                <div key={blank.id} className="min-w-[220px] flex-1 space-y-2 rounded-xl border p-3 md:max-w-[300px]">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`blank-${blank.id}`}>Blank #{index + 1}</Label>
                    <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" onClick={() => deleteBlank(index)}>
                      <Trash2 />
                    </Button>
                  </div>
                  <Input
                    id={`blank-${blank.id}`}
                    value={blank.answer}
                    onChange={(event) => onChange({
                      ...document,
                      blanks: document.blanks.map((item) => item.id === blank.id ? { ...item, answer: event.target.value } : item),
                    })}
                    placeholder={`Answer for blank ${index + 1}`}
                    aria-invalid={Boolean(validationErrors[`blank:${blank.id}`])}
                  />
                  <FieldError>{validationErrors[`blank:${blank.id}`]}</FieldError>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SimpleQuestionAnswerEditor({
  kind,
  document,
  onChange,
  validationErrors,
}: {
  kind: "narration" | "punctuation-and-capitalization";
  document: SimpleQuestionAnswerDocument;
  onChange: (document: EnglishSecondPaperDocument, immediate?: boolean) => void;
  validationErrors: EnglishSecondPaperValidationErrors;
}) {
  const meta = ENGLISH_SECOND_PAPER_META[kind];
  return (
    <div className="grid gap-5 border-t pt-5 lg:grid-cols-2">
      <div className="space-y-2">
        <Label>Question</Label>
        <div className="rounded-xl border p-3">
          <TiptapRichTextEditor
            value={document.question}
            onChange={(question) => onChange({ ...document, question })}
            minHeight={220}
            placeholder={`Write the ${meta.title.toLowerCase()} question...`}
          />
        </div>
        <FieldError>{validationErrors.question}</FieldError>
      </div>
      <div className="space-y-2">
        <Label>Answer</Label>
        <div className="rounded-xl border p-3">
          <TiptapRichTextEditor
            value={document.answer}
            onChange={(answer) => onChange({ ...document, answer })}
            minHeight={220}
            placeholder="Write the correct answer..."
          />
        </div>
        <FieldError>{validationErrors.answer}</FieldError>
      </div>
    </div>
  );
}

function QuestionAnswerItemsEditor({
  document,
  onChange,
  validationErrors,
}: {
  document: QuestionAnswerItemsDocument;
  onChange: (document: EnglishSecondPaperDocument, immediate?: boolean) => void;
  validationErrors: EnglishSecondPaperValidationErrors;
}) {
  const normalized = normalizeRows(document);
  function addRow() {
    onChange(normalizeRows({
      version: 1,
      rows: [...normalized.rows, { id: crypto.randomUUID(), sortOrder: normalized.rows.length, question: "", answer: "" }],
    }), true);
  }
  function deleteRow(id: string) {
    onChange(normalizeRows({ version: 1, rows: normalized.rows.filter((row) => row.id !== id) }), true);
  }
  function moveRow(id: string, direction: "up" | "down") {
    const index = normalized.rows.findIndex((row) => row.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= normalized.rows.length) return;
    const rows = [...normalized.rows];
    const [moved] = rows.splice(index, 1);
    rows.splice(target, 0, moved);
    onChange(normalizeRows({ version: 1, rows }), true);
  }
  return (
    <div className="space-y-4 border-t pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Changing Sentence Items</h3>
          <p className="text-sm text-muted-foreground">Add every transformation as its own Question + Answer item.</p>
        </div>
        <Button type="button" onClick={addRow}><Plus data-icon="inline-start" /> Add item</Button>
      </div>
      <FieldError>{validationErrors.document}</FieldError>
      {normalized.rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No items yet.</div>
      ) : normalized.rows.map((row, index) => (
        <Card key={row.id} className="shadow-none">
          <CardContent className="space-y-5 pt-6">
            <div className="flex items-center justify-between gap-3">
              <Badge variant="secondary">Question #{index + 1}</Badge>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="icon-sm" disabled={index === 0} onClick={() => moveRow(row.id, "up")}><ArrowUp /></Button>
                <Button type="button" variant="outline" size="icon-sm" disabled={index === normalized.rows.length - 1} onClick={() => moveRow(row.id, "down")}><ArrowDown /></Button>
                <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={() => deleteRow(row.id)}><Trash2 data-icon="inline-start" /> Delete</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Question</Label>
              <div className="rounded-xl border p-3">
                <TiptapRichTextEditor
                  value={row.question}
                  onChange={(question) => onChange({ ...normalized, rows: normalized.rows.map((item) => item.id === row.id ? { ...item, question } : item) })}
                  minHeight={140}
                  placeholder={`Write changing sentence question ${index + 1}...`}
                />
              </div>
              <FieldError>{validationErrors[`row:${row.id}:question`]}</FieldError>
            </div>
            <div className="space-y-2">
              <Label>Answer</Label>
              <div className="rounded-xl border p-3">
                <TiptapRichTextEditor
                  value={row.answer}
                  onChange={(answer) => onChange({ ...normalized, rows: normalized.rows.map((item) => item.id === row.id ? { ...item, answer } : item) })}
                  minHeight={140}
                  placeholder={`Write transformed answer ${index + 1}...`}
                />
              </div>
              <FieldError>{validationErrors[`row:${row.id}:answer`]}</FieldError>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SubstitutionTableEditor({
  document,
  onChange,
  validationErrors,
}: {
  document: SubstitutionTableDocument;
  onChange: (document: EnglishSecondPaperDocument, immediate?: boolean) => void;
  validationErrors: EnglishSecondPaperValidationErrors;
}) {
  const normalized = useMemo(() => normalizeSubstitution(document), [document]);

  function addColumn() {
    const columnId = crypto.randomUUID();
    const column = { id: columnId, label: substitutionColumnLabel(normalized.columns.length), sortOrder: normalized.columns.length };
    onChange(normalizeSubstitution({
      ...normalized,
      columns: [...normalized.columns, column],
      rows: normalized.rows.map((row) => ({ ...row, cells: [...row.cells, { id: crypto.randomUUID(), columnId, text: "" }] })),
      answers: normalized.answers.map((answer) => ({ ...answer, selections: [...answer.selections, { columnId, cellId: "" }] })),
    }), true);
  }

  function deleteColumn(columnId: string) {
    if (normalized.columns.length <= 2) return;
    onChange(normalizeSubstitution({
      ...normalized,
      columns: normalized.columns.filter((column) => column.id !== columnId),
      rows: normalized.rows.map((row) => ({ ...row, cells: row.cells.filter((cell) => cell.columnId !== columnId) })),
      answers: normalized.answers.map((answer) => ({ ...answer, selections: answer.selections.filter((selection) => selection.columnId !== columnId) })),
    }), true);
  }

  function addRow() {
    onChange(normalizeSubstitution({
      ...normalized,
      rows: [...normalized.rows, {
        id: crypto.randomUUID(),
        sortOrder: normalized.rows.length,
        cells: normalized.columns.map((column) => ({ id: crypto.randomUUID(), columnId: column.id, text: "" })),
      }],
    }), true);
  }

  function deleteRow(rowId: string) {
    const row = normalized.rows.find((item) => item.id === rowId);
    if (!row) return;
    const removedCellIds = new Set(row.cells.map((cell) => cell.id));
    onChange(normalizeSubstitution({
      ...normalized,
      rows: normalized.rows.filter((item) => item.id !== rowId),
      answers: normalized.answers.map((answer) => ({
        ...answer,
        selections: answer.selections.map((selection) => removedCellIds.has(selection.cellId) ? { ...selection, cellId: "" } : selection),
      })),
    }), true);
  }

  function addCombination() {
    onChange(normalizeSubstitution({
      ...normalized,
      answers: [...normalized.answers, {
        id: crypto.randomUUID(),
        sortOrder: normalized.answers.length,
        selections: normalized.columns.map((column) => ({ columnId: column.id, cellId: "" })),
        sentence: "",
      }],
    }), true);
  }

  function updateCombinationSentence(answerId: string, selections: Array<{ columnId: string; cellId: string }>) {
    const sentence = normalized.columns
      .map((column) => {
        const cellId = selections.find((item) => item.columnId === column.id)?.cellId;
        return normalized.rows.flatMap((row) => row.cells).find((cell) => cell.id === cellId)?.text.trim() || "";
      })
      .filter(Boolean)
      .join(" ");
    return normalized.answers.map((answer) => answer.id === answerId ? { ...answer, selections, sentence } : answer);
  }

  return (
    <div className="space-y-6 border-t pt-5">
      <FieldError>{validationErrors.document || validationErrors.rows || validationErrors.answers}</FieldError>
      <div className="overflow-hidden rounded-2xl border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
          <div>
            <h3 className="font-semibold">Substitution Table Builder</h3>
            <p className="text-sm text-muted-foreground">Add sentence parts under columns, then define valid sentence combinations.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{normalized.columns.length} columns × {normalized.rows.length} rows</Badge>
            <Button type="button" variant="outline" size="sm" onClick={addColumn}><Plus data-icon="inline-start" /> Add column</Button>
            <Button type="button" size="sm" onClick={addRow}><Plus data-icon="inline-start" /> Add row</Button>
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
                          onChange={(event) => onChange({ ...normalized, columns: normalized.columns.map((item) => item.id === column.id ? { ...item, label: event.target.value } : item) })}
                          placeholder={substitutionColumnLabel(columnIndex)}
                        />
                        <FieldError className="mt-1">{validationErrors[`column:${column.id}`]}</FieldError>
                      </div>
                      {normalized.columns.length > 2 ? (
                        <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" onClick={() => deleteColumn(column.id)}><Trash2 /></Button>
                      ) : null}
                    </div>
                  </th>
                ))}
                <th className="w-24 border-b p-2 text-center text-xs text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {normalized.rows.length === 0 ? (
                <tr><td colSpan={normalized.columns.length + 2} className="p-8 text-center text-sm text-muted-foreground">No rows yet.</td></tr>
              ) : normalized.rows.map((row, rowIndex) => (
                <tr key={row.id}>
                  <td className="border-b border-r p-3 text-center font-medium">{rowIndex + 1}</td>
                  {normalized.columns.map((column, columnIndex) => {
                    const cell = row.cells.find((item) => item.columnId === column.id) || row.cells[columnIndex];
                    return (
                      <td key={column.id} className="border-b border-r p-3 last:border-r-0">
                        <Input
                          value={cell?.text || ""}
                          onChange={(event) => cell && onChange({
                            ...normalized,
                            rows: normalized.rows.map((item) => item.id === row.id
                              ? { ...item, cells: item.cells.map((source) => source.id === cell.id ? { ...source, text: event.target.value } : source) }
                              : item),
                          })}
                          placeholder={`${column.label || substitutionColumnLabel(columnIndex)} - row ${rowIndex + 1}`}
                        />
                      </td>
                    );
                  })}
                  <td className="border-b p-2 text-center">
                    <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" onClick={() => deleteRow(row.id)}><Trash2 /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Valid sentence combinations</h3>
            <p className="text-sm text-muted-foreground">Choose one row value from each column for every valid sentence.</p>
          </div>
          <Button type="button" variant="outline" onClick={addCombination}><Plus data-icon="inline-start" /> Add combination</Button>
        </div>
        {normalized.answers.length === 0 ? (
          <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No combinations yet.</div>
        ) : normalized.answers.map((answer, answerIndex) => (
          <div key={answer.id} className="space-y-4 rounded-xl border bg-muted/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <Badge variant="secondary">Combination #{answerIndex + 1}</Badge>
              <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" onClick={() => onChange({ ...normalized, answers: normalized.answers.filter((item) => item.id !== answer.id) }, true)}><Trash2 /></Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {normalized.columns.map((column, columnIndex) => {
                const value = answer.selections.find((item) => item.columnId === column.id)?.cellId || "";
                const options = normalized.rows.map((row, rowIndex) => {
                  const cell = row.cells.find((item) => item.columnId === column.id) || row.cells[columnIndex];
                  return { id: cell?.id || "", label: `Row ${rowIndex + 1}${cell?.text ? ` — ${cell.text}` : ""}` };
                }).filter((item) => item.id && item.label.includes("—"));
                return (
                  <div key={column.id} className="space-y-1.5">
                    <Label>{column.label || substitutionColumnLabel(columnIndex)}</Label>
                    <TableCompletionChoiceCombobox
                      value={value}
                      options={options}
                      placeholder="Choose item"
                      onChange={(cellId) => {
                        const selections = answer.selections.map((selection) => selection.columnId === column.id ? { ...selection, cellId } : selection);
                        onChange({ ...normalized, answers: updateCombinationSentence(answer.id, selections) }, true);
                      }}
                    />
                    <FieldError>{validationErrors[`answer:${answer.id}:${column.id}`]}</FieldError>
                  </div>
                );
              })}
            </div>
            {answer.sentence ? <div className="rounded-lg bg-background px-3 py-2 text-sm"><span className="font-medium">Sentence:</span> {answer.sentence}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function SuffixPrefixEditor({
  document,
  onChange,
  validationErrors,
}: {
  document: SuffixPrefixDocument;
  onChange: (document: EnglishSecondPaperDocument, immediate?: boolean) => void;
  validationErrors: EnglishSecondPaperValidationErrors;
}) {
  const editorRef = useRef<Editor | null>(null);
  const [word, setWord] = useState("");

  function patchQuestion(question: string) {
    const words = extractSuffixPrefixWords(question);
    const items = words.map((targetWord, index) => ({
      id: document.items[index]?.id || crypto.randomUUID(),
      sortOrder: index,
      word: targetWord,
      answer: document.items[index]?.answer || "",
    }));
    onChange({ version: 1, question, items });
  }

  function insertWord() {
    const editor = editorRef.current;
    const trimmed = word.trim();
    if (!editor || !trimmed) return;
    editor.chain().focus().insertContent(`<u>${escapeHtmlText(trimmed)}</u>`).run();
    patchQuestion(editor.getHTML());
    setWord("");
  }

  function deleteItem(index: number) {
    const question = removeNthUnderline(document.question, index);
    const items = document.items.filter((_, itemIndex) => itemIndex !== index).map((item, sortOrder) => ({ ...item, sortOrder }));
    onChange({ version: 1, question, items }, true);
  }

  return (
    <div className="space-y-5 border-t pt-5">
      <div className="overflow-hidden rounded-2xl border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
          <div>
            <div className="font-medium">Question</div>
            <p className="text-sm text-muted-foreground">Write the question, place the cursor, type a root word below, then insert it as a Suffix / Prefix target.</p>
          </div>
          <Badge variant="outline">{document.items.length} word{document.items.length === 1 ? "" : "s"}</Badge>
        </div>
        <div className="space-y-3 p-3">
          <TiptapRichTextEditor
            value={document.question}
            onChange={patchQuestion}
            onEditorReady={(editor) => { editorRef.current = editor; }}
            minHeight={230}
            placeholder="Write the Suffix / Prefix question here..."
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={word} onChange={(event) => setWord(event.target.value)} placeholder="Root word, e.g. happy" />
            <Button type="button" onMouseDown={(event) => event.preventDefault()} onClick={insertWord} disabled={!word.trim()}>
              <Plus data-icon="inline-start" /> Insert root word
            </Button>
          </div>
        </div>
      </div>
      <FieldError>{validationErrors.question || validationErrors.document}</FieldError>

      <div className="flex flex-wrap gap-4">
        {document.items.map((item, index) => (
          <div key={item.id} className="min-w-[230px] flex-1 space-y-3 rounded-xl border p-3 md:max-w-[320px]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Label>Answer #{index + 1}</Label>
                <div className="mt-1 text-sm text-muted-foreground">Root word: <span className="font-medium text-foreground underline">{item.word}</span></div>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" onClick={() => deleteItem(index)}><Trash2 /></Button>
            </div>
            <Input
              value={item.answer}
              onChange={(event) => onChange({ ...document, items: document.items.map((source) => source.id === item.id ? { ...source, answer: event.target.value } : source) })}
              placeholder={`Completed word for ${item.word}`}
            />
            <FieldError>{validationErrors[`suffix:${item.id}`]}</FieldError>
          </div>
        ))}
      </div>
    </div>
  );
}

function TagQuestionEditor({
  document,
  onChange,
  validationErrors,
}: {
  document: TagQuestionDocument;
  onChange: (document: EnglishSecondPaperDocument, immediate?: boolean) => void;
  validationErrors: EnglishSecondPaperValidationErrors;
}) {
  function addRow() {
    onChange({
      ...document,
      rows: [...document.rows, { id: crypto.randomUUID(), sortOrder: document.rows.length, question: "", answer: "" }],
    }, true);
  }

  function patchParagraph(question: string) {
    const count = countBlankMarkers(question);
    const blanks = Array.from({ length: count }, (_, index) => document.blanks[index] || {
      id: crypto.randomUUID(),
      sortOrder: index,
      answer: "",
    }).map((blank, index) => ({ ...blank, sortOrder: index }));
    onChange({ ...document, question, blanks });
  }

  return (
    <div className="space-y-5 border-t pt-5">
      <div className="overflow-hidden rounded-2xl border">
        <div className="border-b bg-muted/30 px-4 py-3">
          <div className="font-semibold">Tag Question mode</div>
          <p className="text-sm text-muted-foreground">Use separate Question + Answer items or one paragraph with multiple blanks.</p>
        </div>
        <div className="flex flex-col gap-3 p-4 sm:flex-row">
          <Button type="button" className="sm:flex-1" variant={document.mode === "items" ? "default" : "outline"} onClick={() => onChange({ ...document, mode: "items" }, true)}>Per item</Button>
          <Button type="button" className="sm:flex-1" variant={document.mode === "paragraph" ? "default" : "outline"} onClick={() => onChange({ ...document, mode: "paragraph" }, true)}>Paragraph / passage</Button>
        </div>
      </div>

      {document.mode === "paragraph" ? (
        <>
          <FillBlankQuestionEditor
            value={document.question}
            onChange={patchParagraph}
            title="Paragraph / Passage"
            description="Place the cursor after each sentence and click Add blank."
          />
          <FieldError>{validationErrors.question || validationErrors.document}</FieldError>
          <div className="flex flex-wrap gap-4">
            {document.blanks.map((blank, index) => (
              <div key={blank.id} className="min-w-[220px] flex-1 space-y-2 rounded-xl border p-3 md:max-w-[300px]">
                <div className="flex items-center justify-between gap-2">
                  <Label>Blank #{index + 1}</Label>
                  <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" onClick={() => {
                    const question = removeNthBlankMarker(document.question, index);
                    const blanks = document.blanks.filter((_, blankIndex) => blankIndex !== index).map((item, sortOrder) => ({ ...item, sortOrder }));
                    onChange({ ...document, question, blanks }, true);
                  }}><Trash2 /></Button>
                </div>
                <Input
                  value={blank.answer}
                  onChange={(event) => onChange({ ...document, blanks: document.blanks.map((item) => item.id === blank.id ? { ...item, answer: event.target.value } : item) })}
                  placeholder="Tag answer"
                />
                <FieldError>{validationErrors[`blank:${blank.id}`]}</FieldError>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Tag Question items</h3>
              <p className="text-sm text-muted-foreground">Each item must contain exactly one blank.</p>
            </div>
            <Button type="button" onClick={addRow}><Plus data-icon="inline-start" /> Add item</Button>
          </div>
          <FieldError>{validationErrors.document}</FieldError>
          {document.rows.map((row, index) => (
            <TagQuestionItem
              key={row.id}
              index={index}
              row={row}
              total={document.rows.length}
              validationErrors={validationErrors}
              onPatch={(patch) => onChange({ ...document, rows: document.rows.map((item) => item.id === row.id ? { ...item, ...patch } : item) })}
              onDelete={() => onChange({ ...document, rows: document.rows.filter((item) => item.id !== row.id).map((item, sortOrder) => ({ ...item, sortOrder })) }, true)}
              onMove={(direction) => {
                const target = direction === "up" ? index - 1 : index + 1;
                if (target < 0 || target >= document.rows.length) return;
                const rows = [...document.rows];
                const [moved] = rows.splice(index, 1);
                rows.splice(target, 0, moved);
                onChange({ ...document, rows: rows.map((item, sortOrder) => ({ ...item, sortOrder })) }, true);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TagQuestionItem({
  row,
  index,
  total,
  validationErrors,
  onPatch,
  onDelete,
  onMove,
}: {
  row: { id: string; question: string; answer: string };
  index: number;
  total: number;
  validationErrors: EnglishSecondPaperValidationErrors;
  onPatch: (patch: { question?: string; answer?: string }) => void;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="secondary">Item #{index + 1}</Badge>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="icon-sm" disabled={index === 0} onClick={() => onMove("up")}><ArrowUp /></Button>
            <Button type="button" variant="outline" size="icon-sm" disabled={index === total - 1} onClick={() => onMove("down")}><ArrowDown /></Button>
            <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={onDelete}><Trash2 data-icon="inline-start" /> Delete</Button>
          </div>
        </div>
        <FillBlankQuestionEditor
          value={row.question}
          onChange={(question) => onPatch({ question })}
          title={`Question #${index + 1}`}
          description="Insert exactly one blank where the tag answer belongs."
          maxBlanks={1}
        />
        <FieldError>{validationErrors[`row:${row.id}:question`] || validationErrors[`row:${row.id}:blank`]}</FieldError>
        <Field>
          <FieldLabel>Answer</FieldLabel>
          <Input value={row.answer} onChange={(event) => onPatch({ answer: event.target.value })} placeholder="Example: aren't you?" />
          <FieldError>{validationErrors[`row:${row.id}:answer`]}</FieldError>
        </Field>
      </CardContent>
    </Card>
  );
}
