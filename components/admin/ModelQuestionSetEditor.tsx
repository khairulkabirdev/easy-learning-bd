"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, BookOpen, Check, CheckCircle2, CheckSquare, ChevronDown,
  ChevronUp, FileQuestion, FileText, FileUp, Loader2, Plus, RefreshCw,
  Save, X,
} from "lucide-react";

import { ResponsiveEntityEditor } from "@/components/admin/ResponsiveEntityEditor";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { modelQuestionBlockOptions, type ModelQuestionBlockKind } from "@/lib/model-question-block-types";
import { isEnglishFirstPaperSubject } from "@/app/admin/content/navigation-helpers";
import { MODEL_QUESTION_TEXT_LIMIT, parseModelQuestions } from "@/lib/model-question-parser";
import { readModelQuestionApiResponse } from "@/lib/read-model-question-api-response";

type Block = {
  id: string;
  kind: string;
  title: string;
  instructions: string;
  passage: string;
  question: string;
  options: string[];
  answer: string;
  marks: number;
  sortOrder: number;
};
type Draft = Omit<Block, "id" | "sortOrder">;

type Props = {
  setId: string;
  name: string;
  classItem: { id: string; name: string };
  subject: { id: string; name: string; slug: string; code: string };
  boardName: string | null;
  year: number | null;
  initialBlocks: Block[];
  legacyOnly?: boolean;
  nativeEditorReady?: boolean;
};

function createDraft(kind: string): Draft {
  return {
    kind, title: "", instructions: "", passage: "", question: "",
    options: ["", "", "", ""], answer: "", marks: 1,
  };
}

function blockToDraft(block: Block): Draft {
  return {
    kind: block.kind, title: block.title, instructions: block.instructions,
    passage: block.passage, question: block.question, answer: block.answer,
    options: block.kind === "mcq"
      ? (block.options.length >= 2 ? block.options : ["", "", "", ""])
      : [],
    marks: block.marks,
  };
}

function blockIcon(kind: string) {
  if (kind === "mcq") return <CheckSquare className="size-5" aria-hidden="true" />;
  if (kind.includes("passage") || kind.includes("comprehension") || kind === "summary") {
    return <BookOpen className="size-5" aria-hidden="true" />;
  }
  if (kind.includes("question") || kind.includes("answer")) {
    return <FileQuestion className="size-5" aria-hidden="true" />;
  }
  return <FileText className="size-5" aria-hidden="true" />;
}

/** Rich text may be HTML or legacy plain text. Either is valid; empty HTML is not. */
function hasText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|#160);/gi, " ")
    .replace(/&(?:amp|lt|gt|quot|#39);/gi, "x")
    .trim().length > 0;
}

/** Render older plain-text records safely without changing the original saved data. */
function editorContent(value: string) {
  if (!value) return "";
  if (/<(?:p|div|br|ul|ol|li|h[1-6]|strong|em|table|blockquote|span)\b/i.test(value)) return value;
  return `<p>${value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\r?\n/g, "<br />")}</p>`;
}

function validateDraft(draft: Draft): string | null {
  if (!draft.title.trim() || draft.title.trim().length > 180) return "Block title is required (maximum 180 characters).";
  if (!hasText(draft.question) || draft.question.trim().length > 20_000) return "Question / prompt is required (maximum 20,000 characters).";
  if (draft.instructions.length > 5_000 || draft.passage.length > 30_000 || draft.answer.length > 30_000) {
    return "Instructions, passage or answer exceeds the allowed length.";
  }
  if (!Number.isInteger(draft.marks) || draft.marks < 1 || draft.marks > 100) {
    return "Marks must be a whole number between 1 and 100.";
  }
  if (draft.kind === "mcq" && (
    draft.options.length < 2 || draft.options.length > 6 ||
    draft.options.some((option) => !option.trim() || option.length > 1000)
  )) return "MCQ blocks require 2–6 complete answer options.";
  return null;
}

function normalizedDraft(draft: Draft): Draft {
  return {
    ...draft,
    options: draft.kind === "mcq" ? draft.options : [],
  };
}

/** Identical field layout for both new and saved blocks; unique IDs support multiple open blocks. */
function BlockFields({
  draft, onChange, kinds, idPrefix, busy = false,
}: {
  draft: Draft;
  onChange: (changes: Partial<Draft>) => void;
  kinds: ModelQuestionBlockKind[];
  idPrefix: string;
  busy?: boolean;
}) {
  return (
    <FieldGroup className="gap-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_144px]">
        <Field>
          <FieldContent>
            <FieldLabel htmlFor={`${idPrefix}-kind`}>Block type</FieldLabel>
            <Select value={draft.kind} onValueChange={(value) => {
              const kind = String(value);
              onChange({ kind, options: kind === "mcq" && draft.options.length < 2 ? ["", "", "", ""] : draft.options });
            }} disabled={busy}>
              <SelectTrigger id={`${idPrefix}-kind`} className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {kinds.map((kind) => <SelectItem key={kind.value} value={kind.value}>{kind.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor={`${idPrefix}-marks`}>Marks *</FieldLabel>
            <Input
              id={`${idPrefix}-marks`} type="number" min={1} max={100} step={1}
              value={draft.marks} onChange={(event) => onChange({ marks: Number(event.target.value) })}
              disabled={busy}
            />
          </FieldContent>
        </Field>
      </div>
      <Field>
        <FieldContent>
          <FieldLabel htmlFor={`${idPrefix}-title`}>Block title *</FieldLabel>
          <Input
            id={`${idPrefix}-title`} value={draft.title} maxLength={180}
            placeholder="e.g. Part A — Reading Comprehension"
            onChange={(event) => onChange({ title: event.target.value })}
            disabled={busy}
          />
        </FieldContent>
      </Field>
      <Field>
        <FieldContent>
          <FieldLabel>Instructions (optional)</FieldLabel>
          <div className="min-w-0 rounded-xl border bg-background p-3">
            <SimpleEditor
              value={editorContent(draft.instructions)} onChange={(value) => onChange({ instructions: value })}
              minHeight={120} placeholder="Write instructions here..."
            />
          </div>
        </FieldContent>
      </Field>
      <Field>
        <FieldContent>
          <FieldLabel>Passage / context (optional)</FieldLabel>
          <div className="min-w-0 rounded-xl border bg-background p-3">
            <SimpleEditor
              value={editorContent(draft.passage)} onChange={(value) => onChange({ passage: value })}
              minHeight={180} placeholder="Write or paste a passage, poem or context here..."
            />
          </div>
        </FieldContent>
      </Field>
      <Field>
        <FieldContent>
          <FieldLabel>Question / prompt *</FieldLabel>
          <div className="min-w-0 rounded-xl border bg-background p-3">
            <SimpleEditor
              value={editorContent(draft.question)} onChange={(value) => onChange({ question: value })}
              minHeight={220} placeholder="Write the questions or task here..."
            />
          </div>
        </FieldContent>
      </Field>
      {draft.kind === "mcq" ? (
        <section className="space-y-4 rounded-xl border bg-muted/20 p-4">
          <div>
            <h4 className="text-sm font-semibold">Multiple-choice options</h4>
            <p className="mt-1 text-xs text-muted-foreground">Enter 2–6 options. All shown options must be complete before autosave.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {draft.options.map((option, index) => (
              <div key={index} className="flex min-w-0 items-center gap-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg border bg-background text-sm font-semibold">
                  {String.fromCharCode(65 + index)}
                </span>
                <Input
                  aria-label={`Option ${String.fromCharCode(65 + index)}`} value={option}
                  maxLength={1000} placeholder={`Option ${String.fromCharCode(65 + index)}`}
                  onChange={(event) => onChange({ options: draft.options.map((entry, itemIndex) =>
                    itemIndex === index ? event.target.value : entry) })}
                />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={busy || draft.options.length >= 6}
              onClick={() => onChange({ options: [...draft.options, ""] })}>+ Add option</Button>
            <Button type="button" size="sm" variant="outline" disabled={busy || draft.options.length <= 2}
              onClick={() => onChange({ options: draft.options.slice(0, -1) })}>− Remove last option</Button>
          </div>
        </section>
      ) : null}
      <Field>
        <FieldContent>
          <FieldLabel>Answer / answer key (optional)</FieldLabel>
          <div className="min-w-0 rounded-xl border bg-background p-3">
            <SimpleEditor
              value={editorContent(draft.answer)} onChange={(value) => onChange({ answer: value })}
              minHeight={150} placeholder={draft.kind === "mcq" ? "Correct option (A, B, C or D)..." : "Write the suggested answer here..."}
            />
          </div>
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}

const AUTO_SAVE_DELAY_MS = 1100;

/** Each card saves independently and serializes its writes to prevent stale requests overwriting newer edits. */
function EditableQuestionCard({
  block, index, kinds, setId, onSaved, onDirtyChange,
}: {
  block: Block;
  index: number;
  kinds: ModelQuestionBlockKind[];
  setId: string;
  onSaved: (block: Block) => void;
  onDirtyChange: (id: string, dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => blockToDraft(block));
  const draftRef = useRef(draft);
  const savedRef = useRef(JSON.stringify(normalizedDraft(blockToDraft(block))));
  const savingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryQueuedRef = useRef(false);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<"saved" | "editing" | "saving" | "invalid" | "error">("saved");
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    onDirtyChange(block.id, status !== "saved");
  }, [block.id, onDirtyChange, status]);

  // Keep the local editor as the source of truth while this card is mounted.
  // A server refresh must never silently replace an unsaved or in-flight edit.

  const save = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (savingRef.current) { retryQueuedRef.current = true; return; }
    const snapshot = normalizedDraft(draftRef.current);
    const serialized = JSON.stringify(snapshot);
    if (serialized === savedRef.current) {
      if (mountedRef.current) { setStatus("saved"); setError(""); }
      return;
    }
    const validationError = validateDraft(snapshot);
    if (validationError) {
      if (mountedRef.current) { setStatus("invalid"); setError(validationError); }
      return;
    }
    savingRef.current = true;
    retryQueuedRef.current = false;
    if (mountedRef.current) { setStatus("saving"); setError(""); }
    try {
      const response = await fetch(`/api/admin/model-question-sets/${encodeURIComponent(setId)}/blocks/${encodeURIComponent(block.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: serialized,
      });
      const result = await readModelQuestionApiResponse<{ success?: boolean; error?: string }>(response, "Save question block");
      if (!response.ok || !result.success) throw new Error(result.error || "Could not save this block.");
      savedRef.current = serialized;
      onSaved({ ...block, ...snapshot });
      if (mountedRef.current) setStatus("saved");
    } catch (cause) {
      if (mountedRef.current) {
        setStatus("error");
        setError(cause instanceof Error ? cause.message : "Save failed. Retry to keep your changes.");
      }
      return;
    } finally {
      savingRef.current = false;
    }
    // If edits arrived while the request was pending, save the latest snapshot next.
    if ((retryQueuedRef.current || JSON.stringify(normalizedDraft(draftRef.current)) !== savedRef.current) && mountedRef.current) {
      void save();
    }
  }, [block, onSaved, setId]);

  useEffect(() => {
    // Only cancel a scheduled save on unmount; never silently discard visible changes.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Warn if the user navigates away before all edits have been saved.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (savingRef.current || JSON.stringify(normalizedDraft(draftRef.current)) !== savedRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  function change(changes: Partial<Draft>) {
    const next = { ...draftRef.current, ...changes };
    draftRef.current = next;
    setDraft(next);
    setStatus("editing");
    setError("");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void save(); }, AUTO_SAVE_DELAY_MS);
  }

  const label = kinds.find((kind) => kind.value === draft.kind)?.label ?? draft.kind;
  return (
    <Card className="min-w-0 shadow-none">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="flex min-w-0 items-start gap-3">
          <div className="shrink-0 rounded-md border p-2">{blockIcon(draft.kind)}</div>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="break-words text-base">{draft.title || `Untitled ${label}`}</CardTitle>
              <Badge variant="secondary">#{index + 1}</Badge>
            </div>
            <CardDescription>Block type: {label}</CardDescription>
            <Badge variant="outline">{draft.marks} {draft.marks === 1 ? "mark" : "marks"}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" role="status" aria-live="polite">
            {status === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {status === "saved" ? <Check className="size-3.5 text-emerald-600" /> : null}
            {status === "saved" ? "Saved" : status === "saving" ? "Saving…" :
              status === "editing" ? "Unsaved edits" : status === "invalid" ? "Needs details" : "Save failed"}
          </span>
          <Button type="button" variant="outline" size="icon" aria-label={expanded ? "Collapse block" : "Expand block"}
            onClick={() => { if (expanded) void save(); setExpanded(!expanded); }}>
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void save()} disabled={status === "saving"}>
            {status === "error" ? <RefreshCw className="size-4" /> : <Save className="size-4" />}
            {status === "error" ? "Retry" : "Save"}
          </Button>
        </div>
      </CardHeader>
      {expanded ? (
        <CardContent className="border-t pt-5" onBlurCapture={(event) => {
          const next = event.relatedTarget;
          if (next instanceof Node && event.currentTarget.contains(next)) return;
          void save();
        }} onKeyDownCapture={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
            event.preventDefault();
            void save();
          }
        }}>
          <BlockFields draft={draft} onChange={change} kinds={kinds} idPrefix={`saved-${block.id}`} />
          {error ? <p role="alert" className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      ) : null}
    </Card>
  );
}

export function ModelQuestionSetEditor({
  setId, name, classItem, subject, boardName, year, initialBlocks, legacyOnly = false, nativeEditorReady = false,
}: Props) {
  const router = useRouter();
  const kinds = useMemo(() => modelQuestionBlockOptions(subject), [subject]);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [addingKind, setAddingKind] = useState<string | null>(null);
  const [newDraft, setNewDraft] = useState<Draft>(() => createDraft(kinds[0]?.value ?? "short-answer"));
  const [chooserOpen, setChooserOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [importError, setImportError] = useState("");
  const [message, setMessage] = useState("");
  const [dirtyBlockIds, setDirtyBlockIds] = useState<Set<string>>(() => new Set());
  const basePath = `/admin/model-question-import/${classItem.id}/${subject.id}`;
  const detailPath = `${basePath}/${setId}`;
  // The old imported-question editor is preserved for existing records and TXT/JSON
  // import. New blocks must use the native curriculum editors (no duplicates).
  const useNativeBlockPicker = legacyOnly || (
    isEnglishFirstPaperSubject(subject) &&
    /^(?:class|grade|standard|std\.?)\s*[-:]?\s*(?:6|7)\b|^(?:6|7|৬|৭)(?:th)?$|(?:ক্লাস|শ্রেণি)\s*(?:৬|৭|ষষ্ঠ|সপ্তম)/i.test(classItem.name.trim())
  );
  const [nativePickerError, setNativePickerError] = useState("");
  const totalMarks = blocks.reduce((sum, block) => sum + block.marks, 0);
  const parsedImport = useMemo(() => importText.trim() ? parseModelQuestions(importText) : null, [importText]);

  useEffect(() => { setBlocks(initialBlocks); }, [initialBlocks]);

  const handleSaved = useCallback((block: Block) => {
    setBlocks((current) => current.map((item) => item.id === block.id ? { ...item, ...block } : item));
  }, []);

  const handleDirtyChange = useCallback((id: string, dirty: boolean) => {
    setDirtyBlockIds((previous) => {
      if (previous.has(id) === dirty) return previous;
      const updated = new Set(previous);
      if (dirty) updated.add(id);
      else updated.delete(id);
      return updated;
    });
  }, []);

  useEffect(() => {
    if (!addingKind) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [addingKind]);

  async function openNativeBlockPicker() {
    if (busy) return;
    setNativePickerError("");
    if (nativeEditorReady) {
      // Opens the categorized dialog in the already-mounted native editor.
      window.dispatchEvent(new Event("elesson:model-question:open-add-block"));
      return;
    }
    // If the set has not yet been linked, use the existing additive linking API.
    // It preserves all legacy model question blocks.
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/model-question-sets/${encodeURIComponent(setId)}/native-editor`, {
        method: "POST", headers: { "Content-Type": "application/json" },
      });
      const result = await readModelQuestionApiResponse<{ success?: boolean; error?: string }>(response, "Open question block editor");
      if (!response.ok || !result.success) throw new Error(result.error || "Could not open question blocks.");
      router.push(`${detailPath}?addBlock=1`);
      router.refresh();
    } catch (cause) {
      setNativePickerError(cause instanceof Error ? cause.message : "Could not open question blocks.");
    } finally {
      setBusy(false);
    }
  }

  function chooseBlock(kind: string) {
    if (addingKind && !window.confirm("Replace the unsaved new block?")) return;
    setNewDraft(createDraft(kind));
    setAddingKind(kind);
    setError("");
    setMessage("");
    setChooserOpen(false);
  }

  async function addBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const validationError = validateDraft(newDraft);
    if (validationError) { setError(validationError); return; }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/model-question-sets/${encodeURIComponent(setId)}/blocks`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(normalizedDraft(newDraft)),
      });
      const result = await readModelQuestionApiResponse<{ success?: boolean; error?: string; id?: string }>(response, "Create question block");
      if (!response.ok || !result.success || !result.id) throw new Error(result.error || "Could not create the question block.");
      const newBlock: Block = {
        ...normalizedDraft(newDraft), id: result.id,
        sortOrder: Math.max(-1, ...blocks.map((item) => item.sortOrder)) + 1,
      };
      setBlocks((current) => [...current, newBlock]);
      setAddingKind(null);
      setMessage("New block created. You can edit it directly below; subsequent changes auto-save.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the question block.");
    } finally {
      setBusy(false);
    }
  }

  async function importQuestions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!parsedImport || parsedImport.errors.length || !parsedImport.questions.length) {
      setImportError("Enter valid numbered questions or JSON before importing.");
      return;
    }
    setBusy(true);
    setImportError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/model-question-sets/${encodeURIComponent(setId)}/blocks/import`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionsText: importText }),
      });
      const result = await readModelQuestionApiResponse<{ success?: boolean; imported?: number; error?: string }>(response, "Import TXT/JSON questions");
      if (!response.ok || !result.success) throw new Error(result.error || "Question import failed.");
      setImportOpen(false);
      setImportText("");
      setMessage(`Imported ${result.imported ?? 0} question blocks. Existing blocks were preserved.`);
      router.refresh();
    } catch (cause) {
      setImportError(cause instanceof Error ? cause.message : "Could not import questions.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full min-w-0 space-y-6 pb-12">
      {!legacyOnly ? <nav aria-label="Breadcrumb" className="text-sm">
        <Link href={basePath} onClick={(event) => {
          if ((addingKind || dirtyBlockIds.size > 0) && !window.confirm("Some changes are not saved yet. Leave this editor anyway?")) {
            event.preventDefault();
          }
        }} className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to Model Questions
        </Link>
      </nav> : null}

      {!legacyOnly ? <Card className="shadow-none">
        <CardHeader className="space-y-3">
          <CardTitle className="break-words text-xl sm:text-2xl">{name || "Manage Content Blocks"}</CardTitle>
          <CardDescription>Model Question · {classItem.name} · {subject.name}</CardDescription>
          <CardDescription>Existing blocks auto-save after a short pause, on blur, or with Ctrl/Cmd+S. Edits remain visible while saving, and every block also has a Save button.</CardDescription>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="secondary">{classItem.name}</Badge>
            <Badge variant="secondary">{subject.name}</Badge>
            <Badge variant="outline">{boardName || "All boards"}</Badge>
            <Badge variant="outline">{year ?? "All years"}</Badge>
            <Badge variant="outline">{blocks.length} blocks</Badge>
            <Badge variant="outline">{totalMarks} total marks</Badge>
          </div>
        </CardHeader>
      </Card> : null}

      {message ? (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>{message}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" disabled={busy}
          onClick={() => { setImportError(""); setImportOpen(true); }}>
          <FileUp className="size-4" aria-hidden="true" /> Import TXT / JSON
        </Button>
        <Button type="button" disabled={busy} onClick={() => {
          if (useNativeBlockPicker) void openNativeBlockPicker();
          else setChooserOpen(true);
        }}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
          Add Content Block
        </Button>
      </div>

      {nativePickerError ? <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{nativePickerError}</p> : null}

      {blocks.length === 0 && !addingKind && !legacyOnly ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No blocks yet</EmptyTitle>
            <EmptyDescription>Add the first content block for this model question set.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" onClick={() => {
              if (useNativeBlockPicker) void openNativeBlockPicker();
              else setChooserOpen(true);
            }}>Add Content Block</Button>
          </EmptyContent>
        </Empty>
      ) : null}

      <div className="space-y-6">
        {addingKind ? (
          <Card className="min-w-0 border-primary/40 shadow-none">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div className="flex min-w-0 items-start gap-3">
                <div className="rounded-md border p-2">{blockIcon(newDraft.kind)}</div>
                <div className="min-w-0 space-y-2">
                  <CardTitle className="break-words text-base">New {kinds.find((item) => item.value === newDraft.kind)?.label ?? "question"} block</CardTitle>
                  <Badge variant="outline">Unsaved</Badge>
                  <CardDescription>Complete the required fields, then save this new block.</CardDescription>
                </div>
              </div>
              <Button type="button" size="icon" variant="outline" aria-label="Cancel new block" disabled={busy}
                onClick={() => { if (window.confirm("Discard this unsaved new block?")) { setAddingKind(null); setError(""); } }}><X className="size-4" /></Button>
            </CardHeader>
            <CardContent className="border-t pt-5">
              <form className="space-y-5" onSubmit={(event) => void addBlock(event)}>
                <BlockFields draft={newDraft} onChange={(changes) => setNewDraft((current) => ({ ...current, ...changes }))}
                  kinds={kinds} idPrefix="new-model-block" busy={busy} />
                {error ? <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}
                <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                  <Button type="button" variant="outline" disabled={busy} onClick={() => { if (window.confirm("Discard this unsaved new block?")) setAddingKind(null); }}>Cancel</Button>
                  <Button type="submit" disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    {busy ? "Saving…" : "Save block"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {blocks.map((block, index) => (
          <EditableQuestionCard key={block.id} block={block} index={index} kinds={kinds}
            setId={setId} onSaved={handleSaved} onDirtyChange={handleDirtyChange} />
        ))}
      </div>

      <ResponsiveEntityEditor
        open={!useNativeBlockPicker && chooserOpen} onOpenChange={setChooserOpen} title="Add Content Block"
        description={`Choose a question block type for ${subject.name}.`} className="sm:max-w-6xl"
      >
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {kinds.map((item) => (
              <Card key={item.value} className="shadow-none">
                <CardHeader>
                  <div className="flex size-12 items-center justify-center rounded-xl border bg-muted">
                    {blockIcon(item.value)}
                  </div>
                  <CardTitle>{item.label}</CardTitle>
                  <CardDescription>{item.help}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button type="button" className="w-full" onClick={() => chooseBlock(item.value)}>Use {item.label}</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </ResponsiveEntityEditor>

      <ResponsiveEntityEditor
        open={importOpen} onOpenChange={(open) => { if (!busy) setImportOpen(open); }}
        title="Import Questions" description="Import numbered English/Bangla questions or JSON into this set. Existing blocks are preserved."
        className="sm:max-w-4xl"
      >
        <form onSubmit={(event) => void importQuestions(event)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="model-question-import-file" className="text-sm font-medium">TXT or JSON file (optional)</label>
            <Input id="model-question-import-file" type="file" accept=".txt,.json" disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > MODEL_QUESTION_TEXT_LIMIT * 4) {
                  setImportError("The file is too large."); return;
                }
                void file.text().then((text) => { setImportText(text); setImportError(""); })
                  .catch(() => setImportError("Could not read this file."));
              }} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="model-question-import-text" className="text-sm font-medium">Question text / JSON</label>
            <Textarea id="model-question-import-text" rows={10} className="font-mono text-xs"
              maxLength={MODEL_QUESTION_TEXT_LIMIT} value={importText}
              placeholder={'1. Which word is a noun?\nA) Happy\nB) Teacher\nC) Quickly\nD) Beautiful\nAnswer: B'}
              onChange={(event) => setImportText(event.target.value)} />
          </div>
          {parsedImport ? (
            <div className="rounded-lg border bg-muted/20 p-3 text-sm">
              <p className="font-medium">{parsedImport.questions.length} question(s) detected</p>
              {parsedImport.errors.length > 0 ?
                <p className="mt-1 text-destructive">{parsedImport.errors.slice(0, 3).join(" ")}</p> :
                <p className="mt-1 text-muted-foreground">Ready to add as draft blocks</p>}
            </div>
          ) : null}
          {importError ? <p role="alert" className="text-sm text-destructive">{importError}</p> : null}
          <p className="text-xs text-muted-foreground">PDF, Word, and image OCR is not available here. Use TXT, JSON, or pasted text.</p>
          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy || !parsedImport?.questions.length || !!parsedImport.errors.length}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
              {busy ? "Importing…" : "Import questions"}
            </Button>
          </div>
        </form>
      </ResponsiveEntityEditor>
    </div>
  );
}
