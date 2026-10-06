"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpenText,
  Check,
  FileText,
  GripVertical,
  ListChecks,
  Plus,
  Save,
  TableProperties,
  Trash2,
} from "lucide-react";
import { saveUnseenComposition } from "@/app/admin/content/unseen-composition/actions";
import {
  createUnseenCompositionBlock,
  parseUnseenCompositionDocument,
  type InformationTransferBlock,
  type UnseenCompositionBlock,
  type UnseenCompositionBlockKind,
  type UnseenCompositionDocument,
  type UnseenTrueFalseBlock,
  type WritingSummaryBlock,
} from "@/app/admin/content/unseen-composition/types";
import { ResponsiveEntityEditor } from "@/components/admin/ResponsiveEntityEditor";
import { TiptapRichTextEditor } from "@/components/admin/TiptapRichTextEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

const BLOCK_META: Array<{
  kind: UnseenCompositionBlockKind;
  title: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    kind: "unseen-passage",
    title: "Unseen Passage",
    description: "Add a passage that belongs only to this Unseen Composition record.",
    icon: <BookOpenText className="h-5 w-5" />,
  },
  {
    kind: "writing-summary",
    title: "Writing Summary",
    description: "Add a summary-writing instruction and model answer.",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    kind: "information-transfer",
    title: "Information Transfer",
    description: "Create Information Transfer with Tiptap blanks and matching answer fields.",
    icon: <TableProperties className="h-5 w-5" />,
  },
  {
    kind: "true-false",
    title: "True / False",
    description: "Add True / False statements with correction support.",
    icon: <ListChecks className="h-5 w-5" />,
  },
];

const BLOCK_META_BY_KIND = Object.fromEntries(BLOCK_META.map((item) => [item.kind, item])) as Record<
  UnseenCompositionBlockKind,
  (typeof BLOCK_META)[number]
>;

type Props = {
  record: {
    id: string;
    title: string;
    documentJson: string;
  };
  classItem: { id: string; name: string };
  subject: { id: string; name: string };
};

function reindexBlocks(blocks: UnseenCompositionBlock[]) {
  return [...blocks]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((block, index) => ({ ...block, sortOrder: index }) as UnseenCompositionBlock);
}

const FILL_BLANK_MARKER = "____";

function fillBlankQuestionToText(value: string) {
  return value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function countFillBlankMarkers(value: string) {
  return fillBlankQuestionToText(value).match(/_{2,}/g)?.length ?? 0;
}

function resizeInformationTransferBlanks(
  blanks: InformationTransferBlock["blanks"],
  count: number,
) {
  return Array.from({ length: count }, (_, index) =>
    blanks[index] || {
      id: crypto.randomUUID(),
      sortOrder: index,
      answer: "",
    },
  ).map((item, index) => ({ ...item, sortOrder: index }));
}

function removeFillBlankMarkerAt(value: string, targetIndex: number) {
  const removeFromPlainText = (text: string) => {
    let currentIndex = -1;
    return text.replace(/_{2,}/g, (blank) => {
      currentIndex += 1;
      return currentIndex === targetIndex ? "" : blank;
    });
  };

  if (typeof DOMParser === "undefined") return removeFromPlainText(value);

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div data-fill-blank-root>${value}</div>`, "text/html");
  const root = doc.querySelector<HTMLElement>("[data-fill-blank-root]");
  if (!root) return value;

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Array<{ node: Text; start: number; end: number; text: string }> = [];
  let fullText = "";
  let node = walker.nextNode();

  while (node) {
    const textNode = node as Text;
    const text = textNode.data;
    const start = fullText.length;
    fullText += text;
    textNodes.push({ node: textNode, start, end: start + text.length, text });
    node = walker.nextNode();
  }

  const matches = Array.from(fullText.matchAll(/_{2,}/g));
  const match = matches[targetIndex];
  if (!match || match.index == null) return value;

  const removeStart = match.index;
  const removeEnd = removeStart + match[0].length;

  for (const entry of textNodes) {
    const overlapStart = Math.max(removeStart, entry.start);
    const overlapEnd = Math.min(removeEnd, entry.end);
    if (overlapStart >= overlapEnd) continue;

    const localStart = overlapStart - entry.start;
    const localEnd = overlapEnd - entry.start;
    entry.node.data = entry.text.slice(0, localStart) + entry.text.slice(localEnd);
  }

  return root.innerHTML;
}

export function UnseenCompositionEditorClient({ record, classItem, subject }: Props) {
  const [title, setTitle] = useState(record.title);
  const [document, setDocument] = useState<UnseenCompositionDocument>(() =>
    parseUnseenCompositionDocument(record.documentJson),
  );
  const [isChooserOpen, setIsChooserOpen] = useState(false);
  const [pendingDeleteBlockId, setPendingDeleteBlockId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const documentRef = useRef(document);
  const titleRef = useRef(record.title);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingSaveCountRef = useRef(0);
  const saveRequestIdRef = useRef(0);
  const latestSaveRequestIdRef = useRef(0);
  const mutationRevisionRef = useRef(0);
  const lastSavedKeyRef = useRef(
    `${record.title.trim()}\n${JSON.stringify({ version: 1, blocks: reindexBlocks(document.blocks) })}`,
  );

  const sortedBlocks = useMemo(() => reindexBlocks(document.blocks), [document.blocks]);
  const pendingDeleteBlock = useMemo(
    () => sortedBlocks.find((block) => block.id === pendingDeleteBlockId) ?? null,
    [pendingDeleteBlockId, sortedBlocks],
  );

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  function normalizeDocument(value: UnseenCompositionDocument): UnseenCompositionDocument {
    return {
      version: 1,
      blocks: reindexBlocks(value.blocks),
    };
  }

  function setDocumentState(nextDocument: UnseenCompositionDocument) {
    documentRef.current = nextDocument;
    setDocument(nextDocument);
  }

  function markChanged() {
    setMessage(null);
    setError(null);
  }

  function cancelScheduledAutosave() {
    if (!autosaveTimerRef.current) return;
    clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = null;
  }

  async function persistSnapshot(
    snapshotTitle: string,
    snapshotDocument: UnseenCompositionDocument,
    options?: { successMessage?: string; failureMessage?: string },
  ) {
    const normalizedTitle = snapshotTitle.trim();
    const normalizedDocument = normalizeDocument(snapshotDocument);

    if (!normalizedTitle) {
      setError("Record title is required before changes can be saved.");
      return false;
    }

    const documentJson = JSON.stringify(normalizedDocument);
    const saveKey = `${normalizedTitle}\n${documentJson}`;

    if (saveKey === lastSavedKeyRef.current) {
      if (options?.successMessage) setMessage(options.successMessage);
      return true;
    }

    const requestId = ++saveRequestIdRef.current;
    latestSaveRequestIdRef.current = requestId;
    pendingSaveCountRef.current += 1;
    setIsSaving(true);

    const operation = async () => {
      await saveUnseenComposition({
        id: record.id,
        title: normalizedTitle,
        documentJson,
      });
      lastSavedKeyRef.current = saveKey;
    };

    const queuedSave = saveQueueRef.current.then(operation, operation);
    saveQueueRef.current = queuedSave.then(
      () => undefined,
      () => undefined,
    );

    try {
      await queuedSave;
      if (requestId === latestSaveRequestIdRef.current) {
        setError(null);
        setMessage(options?.successMessage ?? "Saved.");
      }
      return true;
    } catch (cause) {
      if (requestId === latestSaveRequestIdRef.current) {
        setError(cause instanceof Error ? cause.message : options?.failureMessage ?? "Failed to save Unseen Composition.");
      }
      return false;
    } finally {
      pendingSaveCountRef.current = Math.max(0, pendingSaveCountRef.current - 1);
      if (pendingSaveCountRef.current === 0) setIsSaving(false);
    }
  }

  function scheduleAutosave() {
    cancelScheduledAutosave();
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      void persistSnapshot(titleRef.current, documentRef.current, {
        successMessage: "Saved automatically.",
        failureMessage: "Failed to autosave Unseen Composition.",
      });
    }, 700);
  }

  function updateBlock<T extends UnseenCompositionBlockKind>(
    id: string,
    kind: T,
    updater: (block: Extract<UnseenCompositionBlock, { kind: T }>) => Extract<UnseenCompositionBlock, { kind: T }>,
  ) {
    const currentDocument = documentRef.current;
    const nextDocument: UnseenCompositionDocument = {
      ...currentDocument,
      blocks: currentDocument.blocks.map((block) => {
        if (block.id !== id || block.kind !== kind) return block;
        return updater(block as Extract<UnseenCompositionBlock, { kind: T }>);
      }),
    };

    markChanged();
    mutationRevisionRef.current += 1;
    setDocumentState(nextDocument);
    scheduleAutosave();
  }

  function persistStructuralChange(
    previousDocument: UnseenCompositionDocument,
    nextDocument: UnseenCompositionDocument,
    revision: number,
    successMessage: string,
    failureMessage: string,
  ) {
    cancelScheduledAutosave();
    void persistSnapshot(titleRef.current, nextDocument, { successMessage, failureMessage }).then((saved) => {
      if (!saved && mutationRevisionRef.current === revision) {
        setDocumentState(previousDocument);
      }
    });
  }

  function addBlock(kind: UnseenCompositionBlockKind) {
    const previousDocument = documentRef.current;
    const blocks = reindexBlocks(previousDocument.blocks);
    const nextDocument: UnseenCompositionDocument = {
      version: 1,
      blocks: [...blocks, createUnseenCompositionBlock(kind, blocks.length)],
    };

    markChanged();
    const revision = ++mutationRevisionRef.current;
    setDocumentState(nextDocument);
    setIsChooserOpen(false);
    persistStructuralChange(previousDocument, nextDocument, revision, "Block added.", "Failed to add block.");
  }

  function deleteBlock(blockId: string) {
    const previousDocument = documentRef.current;
    const nextDocument: UnseenCompositionDocument = {
      version: 1,
      blocks: reindexBlocks(previousDocument.blocks.filter((block) => block.id !== blockId)),
    };

    if (nextDocument.blocks.length === previousDocument.blocks.length) return;

    markChanged();
    const revision = ++mutationRevisionRef.current;
    setDocumentState(nextDocument);
    persistStructuralChange(previousDocument, nextDocument, revision, "Block deleted.", "Failed to delete block.");
  }

  function moveBlock(blockId: string, direction: "up" | "down") {
    const previousDocument = documentRef.current;
    const blocks = reindexBlocks(previousDocument.blocks);
    const currentIndex = blocks.findIndex((block) => block.id === blockId);
    if (currentIndex < 0) return;

    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= blocks.length) return;

    const nextBlocks = [...blocks];
    [nextBlocks[currentIndex], nextBlocks[nextIndex]] = [nextBlocks[nextIndex], nextBlocks[currentIndex]];
    const nextDocument: UnseenCompositionDocument = {
      version: 1,
      blocks: reindexBlocks(nextBlocks.map((block, index) => ({ ...block, sortOrder: index }))),
    };

    markChanged();
    const revision = ++mutationRevisionRef.current;
    setDocumentState(nextDocument);
    persistStructuralChange(previousDocument, nextDocument, revision, "Block order saved.", "Failed to reorder blocks.");
  }

  function save() {
    cancelScheduledAutosave();
    const normalizedDocument = normalizeDocument(documentRef.current);
    mutationRevisionRef.current += 1;
    setDocumentState(normalizedDocument);
    setMessage(null);
    setError(null);
    void persistSnapshot(titleRef.current, normalizedDocument, {
      successMessage: "Saved.",
      failureMessage: "Failed to save Unseen Composition.",
    });
  }

  function changeTitle(nextTitle: string) {
    markChanged();
    titleRef.current = nextTitle;
    setTitle(nextTitle);
    mutationRevisionRef.current += 1;
    scheduleAutosave();
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-12">
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
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Manage Unseen Composition Blocks</CardTitle>
          <CardDescription>
            {classItem.name} / {subject.name} / {title || "Untitled Unseen Composition"}
          </CardDescription>
          <CardDescription>
            Only Unseen Composition block types are available here. Add, move, delete, and field edits are saved automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Record title</Label>
            <Input
              value={title}
              onChange={(event) => changeTitle(event.target.value)}
              placeholder="Unseen Composition title"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="button" onClick={() => setIsChooserOpen(true)} disabled={isSaving}>
          <Plus className="mr-2 h-4 w-4" />
          Add block
        </Button>
      </div>

      {sortedBlocks.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <div className="rounded-xl border bg-muted p-3">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium">No Unseen Composition blocks yet</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Add only the blocks you need for this Unseen Composition.
              </div>
            </div>
            <Button type="button" onClick={() => setIsChooserOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add block
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedBlocks.map((block, index) => {
            const meta = BLOCK_META_BY_KIND[block.kind];
            return (
              <Card key={block.id} className="overflow-hidden shadow-none">
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 border-b bg-muted/20">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="rounded-md border bg-background p-2">{meta.icon}</div>
                      <CardTitle className="text-base">{meta.title}</CardTitle>
                      <Badge variant="secondary">#{index + 1}</Badge>
                    </div>
                    <CardDescription>Block type: {block.kind}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" aria-label="Block handle">
                      <GripVertical className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => moveBlock(block.id, "up")}
                      disabled={index === 0}
                      aria-label={`Move ${meta.title} up`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => moveBlock(block.id, "down")}
                      disabled={index === sortedBlocks.length - 1}
                      aria-label={`Move ${meta.title} down`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setPendingDeleteBlockId(block.id)}
                      disabled={isSaving}
                      aria-label={`Delete ${meta.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 pt-5">
                  {block.kind === "unseen-passage" ? (
                    <div className="space-y-2">
                      <Label>Passage</Label>
                      <TiptapRichTextEditor
                        value={block.body}
                        onChange={(body) =>
                          updateBlock(block.id, "unseen-passage", (current) => ({ ...current, body }))
                        }
                        minHeight={260}
                        placeholder="Write or paste the unseen passage..."
                      />
                    </div>
                  ) : null}

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
                    <TrueFalseEditor
                      block={block}
                      onChange={(next) => updateBlock(block.id, "true-false", () => next)}
                    />
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={Boolean(pendingDeleteBlockId)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteBlockId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete this block?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteBlock
                ? `${BLOCK_META_BY_KIND[pendingDeleteBlock.kind].title} will be permanently removed from this Unseen Composition. This change is saved immediately.`
                : "This block will be permanently removed from this Unseen Composition."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={isSaving || !pendingDeleteBlockId}
              onClick={() => {
                const blockId = pendingDeleteBlockId;
                setPendingDeleteBlockId(null);
                if (blockId) deleteBlock(blockId);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isSaving ? "Deleting..." : "Delete block"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ResponsiveEntityEditor
        open={isChooserOpen}
        onOpenChange={setIsChooserOpen}
        title="Add Unseen Composition Block"
        description="Choose a block type. Only blocks designed for Unseen Composition are shown here."
        className="sm:max-w-5xl"
      >
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="grid gap-4 md:grid-cols-2">
            {BLOCK_META.map((item) => (
              <Card key={item.kind} className="shadow-none">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-muted">
                    {item.icon}
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button type="button" className="w-full" onClick={() => addBlock(item.kind)}>
                    Use {item.title}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </ResponsiveEntityEditor>
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
  const editorRef = useRef<Editor | null>(null);
  const [blankCount, setBlankCount] = useState(() => countFillBlankMarkers(block.question));

  useEffect(() => {
    setBlankCount(countFillBlankMarkers(block.question));
  }, [block.question]);

  const handleEditorReady = useCallback((editor: Editor | null) => {
    editorRef.current = editor;
  }, []);

  const handleQuestionChange = useCallback(
    (question: string) => {
      const count = countFillBlankMarkers(question);
      setBlankCount(count);
      onChange({
        ...block,
        question,
        blanks: resizeInformationTransferBlanks(block.blanks, count),
      });
    },
    [block, onChange],
  );

  function insertBlank() {
    const editor = editorRef.current;
    if (!editor) return;

    editor.chain().focus().insertContent(FILL_BLANK_MARKER).run();
    const question = editor.getHTML();
    handleQuestionChange(question);
  }

  function updateAnswer(blankId: string, answer: string) {
    onChange({
      ...block,
      blanks: block.blanks.map((blank) => (blank.id === blankId ? { ...blank, answer } : blank)),
    });
  }

  function deleteBlank(blankId: string) {
    const blankIndex = block.blanks.findIndex((blank) => blank.id === blankId);
    if (blankIndex < 0) return;

    const question = removeFillBlankMarkerAt(block.question, blankIndex);
    const blanks = block.blanks
      .filter((blank) => blank.id !== blankId)
      .map((blank, index) => ({ ...blank, sortOrder: index }));

    setBlankCount(countFillBlankMarkers(question));
    onChange({ ...block, question, blanks });
  }

  return (
    <div className="space-y-6">
      <div className="min-w-0 overflow-hidden rounded-2xl border bg-background shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-4 py-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">Question / Information</div>
            <p className="text-xs text-muted-foreground">
              Write and format the Information Transfer text with Tiptap. Put the cursor where a student answer field should appear, then click Add blank.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {blankCount} field{blankCount === 1 ? "" : "s"}
            </Badge>
            <Button
              type="button"
              size="sm"
              onMouseDown={(event) => event.preventDefault()}
              onClick={insertBlank}
            >
              <Plus className="mr-2 h-4 w-4" /> Add blank
            </Button>
          </div>
        </div>

        <div className="min-w-0 p-3">
          <TiptapRichTextEditor
            value={block.question}
            onChange={handleQuestionChange}
            onEditorReady={handleEditorReady}
            minHeight={260}
            placeholder="Write the information here, place the cursor at each transfer point, and click Add blank."
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-4 py-3">
          <div className="space-y-1">
            <h3 className="text-sm font-medium">Answer</h3>
            <p className="text-sm text-muted-foreground">
              Each blank in the Information Transfer question automatically creates one answer field here.
            </p>
          </div>
          <Badge variant="secondary">
            {block.blanks.length} answer{block.blanks.length === 1 ? "" : "s"}
          </Badge>
        </div>

        <div className="p-4">
          {block.blanks.length === 0 ? (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              No transfer blanks yet. In the <strong>Question / Information</strong> box, place the cursor where needed and click <strong>Add blank</strong>.
            </div>
          ) : (
            <div className="rounded-2xl border bg-muted/10 p-4">
              <div className="flex flex-wrap gap-4">
                {block.blanks.map((blank, index) => (
                  <div
                    key={blank.id}
                    className="min-w-[220px] flex-1 space-y-2 rounded-xl border bg-background p-3 md:max-w-[260px]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={`unseen-information-transfer-blank-${blank.id}`}>
                        Blank #{index + 1}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => deleteBlank(blank.id)}
                        aria-label={`Delete Information Transfer blank ${index + 1}`}
                        title={`Delete blank ${index + 1} from question and answer`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      id={`unseen-information-transfer-blank-${blank.id}`}
                      value={blank.answer}
                      onChange={(event) => updateAnswer(blank.id, event.target.value)}
                      placeholder={`Answer for blank ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Details / Instruction</Label>
        <div className="rounded-xl border bg-background p-3">
          <TiptapRichTextEditor
            value={block.details}
            onChange={(details) => onChange({ ...block, details })}
            minHeight={140}
            placeholder="Optional source details, instruction, or explanation for students..."
          />
        </div>
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
