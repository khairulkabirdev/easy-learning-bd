"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Eye, FileUp, FolderOpen, Loader2, Plus, Search, Trash2, Upload, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { MODEL_QUESTION_TEXT_LIMIT, parseModelQuestions, type ImportedModelQuestion } from "@/lib/model-question-parser";

type Option = { id: string; name: string; isActive: boolean };
type YearOption = { id: string; year: number; isActive: boolean };
type ImportRow = {
  id: string;
  title: string;
  status: string;
  questionCount: number;
  createdAt: string;
  board: string;
  year: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  fileStatus: string;
  sizeBytes: number;
};

type Props = {
  classItem: { id: string; name: string };
  subject: { id: string; name: string };
  boards: Option[];
  years: YearOption[];
  records: ImportRow[];
  total: number;
  page: number;
  pageSize: number;
  currentFilters: { q: string; boardId: string; yearId: string };
};

const EXAMPLE = `1. Which word is a noun?\nA) Happy\nB) Teacher\nC) Quickly\nD) Beautiful\nAnswer: B\n\n2. Change into indirect speech: He said, "I am happy."\nAnswer: He said that he was happy.`;

function formatSize(value: number) {
  return value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(value / 1024))} KB`;
}

export function ModelQuestionImportWorkspace({ classItem, subject, boards, years, records, total, page, pageSize, currentFilters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(currentFilters.q);
  const [boardId, setBoardId] = useState(currentFilters.boardId);
  const [yearId, setYearId] = useState(currentFilters.yearId);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"files" | "questions">("files");
  const [fileTitle, setFileTitle] = useState("");
  const [uploadBoardId, setUploadBoardId] = useState("");
  const [uploadYearId, setUploadYearId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [questionText, setQuestionText] = useState("");
  const [fileQuestionsText, setFileQuestionsText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [previewRow, setPreviewRow] = useState<ImportRow | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<ImportedModelQuestion[]>([]);
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const draft = questionText.trim() || fileQuestionsText;
  const parsedPreview = useMemo(() => draft ? parseModelQuestions(draft) : null, [draft]);
  const canImport = mode === "questions" && !!parsedPreview && parsedPreview.questions.length > 0 && !parsedPreview.errors.length;

  useEffect(() => {
    setSearch(currentFilters.q);
    setBoardId(currentFilters.boardId);
    setYearId(currentFilters.yearId);
  }, [currentFilters.q, currentFilters.boardId, currentFilters.yearId]);

  function goTo(nextPage = 1, next = { q: search, boardId, yearId }) {
    const query = new URLSearchParams();
    if (next.q.trim()) query.set("q", next.q.trim());
    if (next.boardId && next.boardId !== "all") query.set("boardId", next.boardId);
    if (next.yearId && next.yearId !== "all") query.set("yearId", next.yearId);
    if (nextPage > 1) query.set("page", String(nextPage));
    startTransition(() => router.push(query.size ? `${pathname}?${query.toString()}` : pathname));
  }

  function resetUpload() {
    setMode("files"); setFileTitle(""); setUploadBoardId(""); setUploadYearId("");
    setFiles([]); setQuestionText(""); setFileQuestionsText(""); setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function changeMode(next: "files" | "questions") {
    setMode(next); setFiles([]); setFileQuestionsText(""); setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function selectFiles(chosen: File[]) {
    setFiles(chosen); setFileQuestionsText(""); setError("");
    if (mode === "questions" && chosen.length === 1 && /\.(txt|json)$/i.test(chosen[0].name)) {
      if (chosen[0].size > MODEL_QUESTION_TEXT_LIMIT * 4) {
        setError("TXT/JSON import file is too large. Use at most 250,000 text characters.");
        return;
      }
      try { setFileQuestionsText(await chosen[0].text()); }
      catch { setError("Could not read the selected question file."); }
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uploadBoardId || !uploadYearId || (mode === "files" ? !files.length : !canImport)) {
      setError(mode === "files" ? "Select a Board, Year and at least one source file." : "Select a Board and Year, and provide valid numbered questions or JSON.");
      return;
    }
    if (files.length > (mode === "files" ? 5 : 1) || files.some((file) => file.size > 25 * 1024 * 1024) || files.reduce((sum, file) => sum + file.size, 0) > 100 * 1024 * 1024) {
      setError("Choose up to 5 files (1 for question import), max 25 MB per file and 100 MB per upload.");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    const form = new FormData();
    form.set("classId", classItem.id);
    form.set("subjectId", subject.id);
    form.set("boardId", uploadBoardId);
    form.set("academicYearId", uploadYearId);
    form.set("title", fileTitle.trim());
    form.set("mode", mode);
    // When TXT/JSON is selected, the API reads it directly. Pasted text overrides it.
    if (mode === "questions") form.set("questionsText", questionText.trim());
    files.forEach((file) => form.append("files", file));
    try {
      const response = await fetch("/api/admin/model-question-import", { method: "POST", body: form });
      const payload = (await response.json()) as { error?: string; success?: boolean; uploaded?: number; questionCount?: number };
      if (!response.ok || !payload.success) throw new Error(payload.error || "Upload failed.");
      setModalOpen(false);
      setMessage(mode === "questions" ? `Imported ${payload.questionCount ?? 0} questions as a draft. Review them using View Questions.` : `Uploaded ${payload.uploaded ?? files.length} model-question source file(s).`);
      resetUpload();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not upload the files.");
    } finally {
      setBusy(false);
    }
  }

  async function openQuestions(row: ImportRow) {
    setPreviewRow(row); setPreviewQuestions([]); setPreviewError(""); setPreviewLoading(true);
    try {
      const response = await fetch(`/api/admin/model-question-import/${encodeURIComponent(row.id)}`, { cache: "no-store" });
      const payload = (await response.json()) as { success?: boolean; error?: string; questions?: ImportedModelQuestion[] };
      if (!response.ok || !payload.success || !Array.isArray(payload.questions)) throw new Error(payload.error || "Could not load imported questions.");
      setPreviewQuestions(payload.questions);
    } catch (cause) {
      setPreviewError(cause instanceof Error ? cause.message : "Could not load imported questions.");
    } finally { setPreviewLoading(false); }
  }

  async function remove(row: ImportRow) {
    if (!window.confirm(`Delete “${row.title}”, its ${row.questionCount} imported question(s), and its source file? This cannot be undone.`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/model-question-import/${encodeURIComponent(row.id)}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string; success?: boolean };
      if (!response.ok || !payload.success) throw new Error(payload.error || "Delete failed.");
      setMessage("The model-question record and source file were deleted.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete the file.");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 space-y-1">
          <Link href={`/admin/model-question-import/${classItem.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" /> Back to subjects</Link>
          <h2 className="text-2xl font-semibold tracking-tight">{subject.name}</h2>
          <p className="text-sm text-muted-foreground">{classItem.name} · Model Question Import · Board and year wise question library</p>
        </div>
        <Button type="button" size="lg" className="w-full sm:w-auto" onClick={() => { resetUpload(); setModalOpen(true); }}>
          <Plus className="size-4" /> Upload / Import Model Questions
        </Button>
      </div>

      {message ? <div role="status" className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground">{message}</div> : null}
      {!modalOpen && error ? <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div> : null}

      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2"><ClipboardList className="size-4 text-primary" /><h3 className="font-semibold">Model questions</h3><Badge variant="secondary">{total}</Badge></div>
          <span className="text-xs text-muted-foreground">{isPending ? "Filtering…" : `${records.length} on this page`}</span>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); goTo(1); }} className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_minmax(150px,180px)_minmax(135px,155px)_auto]">
          <label className="sr-only" htmlFor="model-import-search">Search files</label>
          <Input id="model-import-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or filename…" className="h-10" />
          <Select value={boardId} onValueChange={(value) => setBoardId(String(value || "all"))}>
            <SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Boards</SelectItem>{boards.map((board) => <SelectItem key={board.id} value={board.id}>{board.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={yearId} onValueChange={(value) => setYearId(String(value || "all"))}>
            <SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Years</SelectItem>{years.map((year) => <SelectItem key={year.id} value={year.id}>{year.year}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button type="submit" size="lg" className="flex-1 lg:flex-none" disabled={isPending}><Search className="size-4" /> Filter</Button>
            <Button type="button" size="lg" variant="outline" disabled={isPending} onClick={() => { setSearch("");setBoardId("all");setYearId("all");goTo(1,{q:"",boardId:"all",yearId:"all"}); }}>Clear</Button>
          </div>
        </form>

        {records.length ? (
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Question source</TableHead><TableHead>Board / Year</TableHead><TableHead>Questions</TableHead><TableHead>Size</TableHead><TableHead>Uploaded</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {records.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="min-w-48 max-w-72 whitespace-normal"><div className="font-medium break-words">{row.title}</div><div className="mt-1 max-w-60 truncate text-xs text-muted-foreground" title={row.fileName}>{row.fileName}</div></TableCell>
                    <TableCell><div className="text-sm">{row.board}</div><span className="text-xs text-muted-foreground">{row.year}</span></TableCell>
                    <TableCell>{row.questionCount ? <Badge variant="secondary" className="gap-1"><CheckCircle2 className="size-3.5" />{row.questionCount} imported</Badge> : <Badge variant="outline">Source only</Badge>}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatSize(row.sizeBytes)}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell><div className="flex justify-end gap-2 whitespace-nowrap">
                      {row.questionCount > 0 ? <Button type="button" size="sm" variant="outline" onClick={() => void openQuestions(row)}><Eye className="size-4" /> View Questions</Button> : null}
                      {row.fileStatus === "active" ? <a href={`/api/media/${row.fileId}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center rounded-lg border px-3 text-sm hover:bg-muted">Open</a> : <Badge variant="outline">File unavailable</Badge>}
                      <Button type="button" size="icon-sm" variant="ghost" disabled={busy} aria-label={`Delete ${row.title}`} onClick={() => void remove(row)}><Trash2 className="size-4 text-destructive" /></Button>
                    </div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center"><FolderOpen className="size-9 text-muted-foreground" /><p className="font-medium">No model questions found</p><p className="text-sm text-muted-foreground">Choose another Board/Year, upload source files, or import questions.</p></div>
        )}
        <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t pt-4 text-sm sm:flex-row">
          <span className="text-muted-foreground">Page {page} of {maxPage} · {total} total records</span>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button type="button" variant="outline" size="lg" disabled={page <= 1 || isPending} className="flex-1 sm:flex-none" onClick={() => goTo(page - 1, currentFilters)}><ChevronLeft className="size-4" /> Previous</Button>
            <Button type="button" variant="outline" size="lg" disabled={page >= maxPage || isPending} className="flex-1 sm:flex-none" onClick={() => goTo(page + 1, currentFilters)}>Next <ChevronRight className="size-4" /></Button>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={(open) => { if (!busy) { setModalOpen(open); if (!open) resetUpload(); } }}>
        <DialogContent className="w-[min(95vw,680px)] max-w-2xl gap-4 p-5 sm:max-w-2xl">
          <DialogHeader><DialogTitle className="text-lg">Upload / Import Model Questions</DialogTitle><DialogDescription>{classItem.name} → {subject.name}. Upload reference papers or import structured questions into an admin-only draft.</DialogDescription></DialogHeader>
          <div role="group" aria-label="Upload mode" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            <button type="button" aria-pressed={mode === "files"} disabled={busy} onClick={() => changeMode("files")} className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${mode === "files" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><FileUp className="mr-1.5 inline size-4" />Upload Source Files</button>
            <button type="button" aria-pressed={mode === "questions"} disabled={busy} onClick={() => changeMode("questions")} className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${mode === "questions" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><ClipboardList className="mr-1.5 inline size-4" />Import Questions</button>
          </div>
          <form className="max-h-[68vh] space-y-4 overflow-y-auto pr-1" onSubmit={(event) => void upload(event)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><label htmlFor="upload-board" className="text-sm font-medium">Board <span className="text-destructive">*</span></label>
                <Select value={uploadBoardId || undefined} onValueChange={(value) => setUploadBoardId(String(value || ""))}>
                  <SelectTrigger id="upload-board" className="h-10 w-full"><SelectValue placeholder="Select Board" /></SelectTrigger>
                  <SelectContent>{boards.filter((item) => item.isActive).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><label htmlFor="upload-year" className="text-sm font-medium">Academic Year <span className="text-destructive">*</span></label>
                <Select value={uploadYearId || undefined} onValueChange={(value) => setUploadYearId(String(value || ""))}>
                  <SelectTrigger id="upload-year" className="h-10 w-full"><SelectValue placeholder="Select Year" /></SelectTrigger>
                  <SelectContent>{years.filter((item) => item.isActive).map((item) => <SelectItem key={item.id} value={item.id}>{item.year}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {boards.every((item) => !item.isActive) || years.every((item) => !item.isActive) ? <p className="text-xs text-destructive">Create and activate a Board and Academic Year in Admin → Board first.</p> : null}
            <div className="space-y-1.5"><label htmlFor="upload-title" className="text-sm font-medium">Title <span className="font-normal text-muted-foreground">(optional)</span></label><Input id="upload-title" value={fileTitle} onChange={(event) => setFileTitle(event.target.value)} placeholder="e.g. English Model Test — Dhaka 2026" maxLength={180} className="h-10" /><p className="text-xs text-muted-foreground">{mode === "files" ? "Multiple files use their filenames as titles." : "If blank, the source filename or Model Questions is used."}</p></div>
            <div className="space-y-1.5"><label htmlFor="upload-files" className="text-sm font-medium">{mode === "questions" ? "Question file or reference paper (optional)" : "Source files *"}</label>
              <label htmlFor="upload-files" className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-primary/35 bg-primary/5 px-4 py-5 text-center hover:border-primary/60">
                <FileUp className="mb-2 size-7 text-primary" /><span className="text-sm font-medium">{mode === "questions" ? "Choose TXT/JSON for automatic structured import" : "Choose PDF, Word, image or text files"}</span><span className="mt-1 text-xs text-muted-foreground">{mode === "questions" ? "Or attach one PDF/Word/image plus pasted questions below. No OCR." : "Up to 5 files · 25 MB each · saved to active storage"}</span>
              </label>
              <Input ref={fileInputRef} id="upload-files" type="file" accept={mode === "questions" ? ".txt,.json,.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" : ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.txt,.json"} multiple={mode === "files"} className="sr-only" onChange={(event) => void selectFiles(Array.from(event.target.files || []))} />
              {files.length ? <div className="space-y-1 rounded-lg border p-2 text-xs">{files.map((file, index) => <div className="flex items-center justify-between gap-2" key={`${file.name}-${index}`}><span className="min-w-0 truncate">{file.name} ({formatSize(file.size)})</span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => {setFiles((list) => list.filter((_, i) => i !== index));setFileQuestionsText("");if (fileInputRef.current) fileInputRef.current.value = "";}}><X className="size-4" /></button></div>)}</div> : null}
            </div>
            {mode === "questions" ? <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2"><label htmlFor="question-import-text" className="text-sm font-medium">Question text (TXT / numbered questions / JSON)</label><Button size="sm" variant="ghost" type="button" onClick={() => setQuestionText(EXAMPLE)}>Use example</Button></div>
              <Textarea id="question-import-text" rows={9} className="min-h-44 resize-y font-mono text-xs leading-5" value={questionText} onChange={(event) => setQuestionText(event.target.value)} placeholder={EXAMPLE} />
              <p className="text-xs text-muted-foreground">Write each question with a number. MCQ options use A) B) C) D) or ক) খ) গ) ঘ). Use Answer: B or উত্তর: খ. Answers are optional. Supports JSON arrays with question, options, answer, explanation. Maximum 250 questions.</p>
              {parsedPreview ? <div className={`rounded-lg border p-3 text-sm ${parsedPreview.errors.length ? "border-destructive/30 bg-destructive/5" : "border-primary/20 bg-primary/5"}`}>
                <div className="font-medium">{parsedPreview.errors.length ? "Check import format" : `${parsedPreview.questions.length} questions ready to import`}</div>
                {parsedPreview.errors.length ? <ul className="mt-1 list-inside list-disc text-xs text-destructive">{parsedPreview.errors.slice(0, 4).map((err, i) => <li key={i}>{err}</li>)}</ul> : <div className="mt-1 text-xs text-muted-foreground">{parsedPreview.questions.filter((q) => q.type === "mcq").length} MCQ · {parsedPreview.questions.filter((q) => q.type === "short").length} short answer</div>}
                {parsedPreview.questions[0] ? <div className="mt-2 line-clamp-2 text-xs"><span className="font-semibold">Preview:</span> {parsedPreview.questions[0].question}</div> : null}
              </div> : <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">Paste questions above or upload a .txt/.json file to see an import preview. PDF, Word and images are saved as references only unless you also paste their questions here.</div>}
            </div> : null}
            {error ? <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div> : null}
            <DialogFooter className="sticky bottom-0 -mx-1 bg-background px-1 pt-3"><Button type="button" variant="outline" size="lg" disabled={busy} onClick={() => {setModalOpen(false);resetUpload();}}>Cancel</Button><Button type="submit" size="lg" disabled={busy || !uploadBoardId || !uploadYearId || (mode === "questions" ? !canImport : !files.length)}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{busy ? "Saving…" : mode === "questions" ? `Import ${parsedPreview?.questions.length ?? 0} Questions` : "Upload Files"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewRow} onOpenChange={(open) => { if (!open) setPreviewRow(null); }}>
        <DialogContent className="w-[min(95vw,720px)] max-w-3xl p-5 sm:max-w-3xl">
          <DialogHeader><DialogTitle>{previewRow?.title ?? "Imported questions"}</DialogTitle><DialogDescription>Saved questions are admin-only drafts. They are not automatically published as student model tests.</DialogDescription></DialogHeader>
          <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
            {previewLoading ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading questions…</div> : null}
            {previewError ? <p role="alert" className="text-sm text-destructive">{previewError}</p> : null}
            {!previewLoading && !previewError ? <><p className="text-xs text-muted-foreground">{previewQuestions.length} questions · {previewQuestions.filter((q) => q.type === "mcq").length} MCQ · {previewQuestions.filter((q) => q.type === "short").length} short answer</p>{previewQuestions.map((q) => <section key={q.number} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-2"><p className="whitespace-pre-wrap text-sm font-medium">{q.number}. {q.question}</p><Badge variant="outline">{q.type === "mcq" ? "MCQ" : "Short"}</Badge></div>
              {q.options.length ? <ol className="mt-3 grid list-none gap-1.5 text-sm sm:grid-cols-2">{q.options.map((option, i) => <li key={i} className={`rounded-lg px-2.5 py-1.5 ${q.answer === "ABCDEF"[i] ? "bg-primary/10 font-medium text-primary" : "bg-muted/40"}`}>{"ABCDEF"[i]}. {option}</li>)}</ol> : null}
              {q.answer ? <p className="mt-3 text-xs"><strong>Answer:</strong> {q.answer}</p> : <p className="mt-3 text-xs text-muted-foreground">No answer provided</p>}
              {q.explanation ? <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground"><strong>Explanation:</strong> {q.explanation}</p> : null}
            </section>)}</> : null}
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setPreviewRow(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
