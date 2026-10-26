"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import {
  parseMatchingDocument,
  parseQuestionAnswerDocument,
  parseRearrangeSentenceDocument,
  type SubjectSectionKind,
} from "@/app/admin/content/subject-section-blocks/types";
import { parseUnseenCompositionDocument } from "@/app/admin/content/unseen-composition/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";

type RecordData = {
  id: string;
  title: string;
  instruction?: string;
  details?: string;
  documentJson: string;
};

function RichText({ value }: { value?: string }) {
  if (!value?.trim()) return null;
  return (
    <div
      className="prose prose-sm max-w-none overflow-x-auto dark:prose-invert [&_table]:w-full [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2"
      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(value) }}
    />
  );
}

function AnswerToggle({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} className="min-h-10">
      {open ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      {open ? "Hide answer" : "Show answer"}
    </Button>
  );
}

function QuestionAnswerViewer({ record }: { record: RecordData }) {
  const [showAnswers, setShowAnswers] = useState(false);
  const document = useMemo(() => parseQuestionAnswerDocument(record.documentJson, record.id), [record]);

  return (
    <div className="space-y-4">
      {record.instruction ? <RichText value={record.instruction} /> : null}
      {record.details ? <RichText value={record.details} /> : null}
      <div className="flex justify-end"><AnswerToggle open={showAnswers} onClick={() => setShowAnswers((value) => !value)} /></div>
      <div className="space-y-3">
        {document.rows.map((row, index) => (
          <Card key={row.id}>
            <CardContent className="space-y-3 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="shrink-0">{index + 1}</Badge>
                <div className="min-w-0 flex-1"><RichText value={row.question} /></div>
              </div>
              {showAnswers ? (
                <div className="rounded-xl border border-primary/15 bg-primary/5 p-3">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Answer</div>
                  <RichText value={row.answer} />
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MatchingViewer({ record }: { record: RecordData }) {
  const [showAnswers, setShowAnswers] = useState(false);
  const document = useMemo(() => parseMatchingDocument(record.documentJson, record.id), [record]);
  const cellText = useMemo(() => {
    const map = new Map<string, string>();
    document.rows.forEach((row) => row.cells.forEach((cell) => map.set(cell.id, cell.text)));
    return map;
  }, [document]);

  return (
    <div className="space-y-4">
      {record.instruction ? <RichText value={record.instruction} /> : null}
      {record.details ? <RichText value={record.details} /> : null}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>{document.columns.map((column) => <th key={column.id} className="border-b p-3 text-left font-semibold">{column.label}</th>)}</tr>
          </thead>
          <tbody>
            {document.rows.map((row) => (
              <tr key={row.id} className="border-b last:border-b-0">
                {document.columns.map((column) => {
                  const cell = row.cells.find((item) => item.columnId === column.id);
                  return <td key={column.id} className="p-3 align-top">{cell?.text || "—"}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end"><AnswerToggle open={showAnswers} onClick={() => setShowAnswers((value) => !value)} /></div>
      {showAnswers ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Correct matching</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {document.answers.map((answer, index) => (
              <div key={answer.id} className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                <span className="mr-2 font-semibold">{index + 1}.</span>
                {answer.selections.map((selection) => cellText.get(selection.cellId) || "—").join(" → ")}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function RearrangeViewer({ record }: { record: RecordData }) {
  const [showAnswers, setShowAnswers] = useState(false);
  const document = useMemo(() => parseRearrangeSentenceDocument(record.documentJson, record.id), [record]);
  const rowMap = useMemo(() => new Map(document.rows.map((row) => [row.id, row])), [document]);
  const labelFor = (index: number) => String.fromCharCode(97 + index);

  return (
    <div className="space-y-4">
      {record.instruction ? <RichText value={record.instruction} /> : null}
      {record.details ? <RichText value={record.details} /> : null}
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-5">
          {document.rows.map((row, index) => (
            <div key={row.id} className="grid grid-cols-[2rem_1fr] gap-2 text-sm leading-7">
              <span className="font-semibold">({labelFor(index)})</span>
              <RichText value={row.question} />
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="flex justify-end"><AnswerToggle open={showAnswers} onClick={() => setShowAnswers((value) => !value)} /></div>
      {showAnswers ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="space-y-3 p-4 sm:p-5">
            <div className="text-sm font-semibold text-primary">Correct order</div>
            <div className="flex flex-wrap gap-2">
              {document.correctOrder.map((id, index) => {
                const originalIndex = document.rows.findIndex((row) => row.id === id);
                return <Badge key={`${id}-${index}`} variant="secondary">{originalIndex >= 0 ? labelFor(originalIndex) : "?"}</Badge>;
              })}
            </div>
            <div className="space-y-2 pt-2">
              {document.correctOrder.map((id, index) => {
                const row = rowMap.get(id);
                return row ? <div key={id} className="text-sm leading-7"><span className="mr-2 font-semibold">{index + 1}.</span><span dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(row.question) }} /></div> : null;
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function UnseenViewer({ record }: { record: RecordData }) {
  const [showAnswers, setShowAnswers] = useState(false);
  const document = useMemo(() => parseUnseenCompositionDocument(record.documentJson), [record]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><AnswerToggle open={showAnswers} onClick={() => setShowAnswers((value) => !value)} /></div>
      {document.blocks.map((block, index) => (
        <Card key={block.id}>
          <CardHeader className="pb-3"><CardTitle className="text-base">{index + 1}. {block.kind.replaceAll("-", " ")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {block.kind === "unseen-passage" ? <RichText value={block.body} /> : null}
            {block.kind === "writing-summary" ? (
              <>
                <RichText value={block.instruction} />
                {showAnswers ? <div className="rounded-xl border border-primary/15 bg-primary/5 p-3"><RichText value={block.modelAnswer} /></div> : null}
              </>
            ) : null}
            {block.kind === "information-transfer" ? (
              <>
                <RichText value={block.question} />
                <RichText value={block.details} />
                {showAnswers ? (
                  <div className="flex flex-wrap gap-2">{block.blanks.map((blank, blankIndex) => <Badge key={blank.id} variant="secondary">{blankIndex + 1}. {blank.answer}</Badge>)}</div>
                ) : null}
              </>
            ) : null}
            {block.kind === "true-false" ? (
              <div className="space-y-3">
                <RichText value={block.instruction} />
                {block.rows.map((row, rowIndex) => (
                  <div key={row.id} className="rounded-xl border p-3 text-sm">
                    <div><span className="mr-2 font-semibold">{rowIndex + 1}.</span>{row.statement}</div>
                    {showAnswers ? <div className="mt-2 text-muted-foreground"><span className="font-medium text-foreground">{row.expectedAnswer ? "True" : "False"}</span>{row.correction ? ` — ${row.correction}` : ""}</div> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function UserFirstPaperPracticeViewer({
  kind,
  record,
}: {
  kind: SubjectSectionKind | "unseen-composition";
  record: RecordData;
}) {
  if (kind === "unseen-composition") return <UnseenViewer record={record} />;
  if (kind === "matching-sentences") return <MatchingViewer record={record} />;
  if (kind === "rearrange-sentence") return <RearrangeViewer record={record} />;
  return <QuestionAnswerViewer record={record} />;
}
