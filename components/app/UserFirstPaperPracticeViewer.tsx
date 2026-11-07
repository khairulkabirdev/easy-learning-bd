"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import {
  parseQuestionAnswerDocument,
  type SubjectSectionKind,
} from "@/app/admin/content/subject-section-blocks/types";
import { UserUnseenCompositionViewer } from "@/components/app/UserUnseenCompositionViewer";
import { UserMatchingSentencesViewer } from "@/components/app/UserMatchingSentencesViewer";
import { UserRearrangeSentenceViewer } from "@/components/app/UserRearrangeSentenceViewer";
import { UserPoemQuestionsViewer } from "@/components/app/UserPoemQuestionsViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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


export function UserFirstPaperPracticeViewer({
  kind,
  record,
}: {
  kind: SubjectSectionKind | "unseen-composition";
  record: RecordData;
}) {
  if (kind === "unseen-composition") return <UserUnseenCompositionViewer key={record.id} documentJson={record.documentJson} />;
  if (kind === "matching-sentences") return <UserMatchingSentencesViewer key={record.id} record={record} />;
  if (kind === "rearrange-sentence") return <UserRearrangeSentenceViewer key={record.id} record={record} />;
  if (kind === "question-from-poems" || kind === "question-from-story") {
    return (
      <UserPoemQuestionsViewer
        key={record.id}
        record={record}
        kind={kind === "question-from-story" ? "story" : "poems"}
      />
    );
  }
  return <QuestionAnswerViewer record={record} />;
}
