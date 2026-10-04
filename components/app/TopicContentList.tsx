"use client";

import { useState } from "react";

import { StudentContentViewer, type StudentContentRecord } from "@/app/user/lessons/student-content";
import type { ContentBlockKind } from "@/app/admin/content/content-types";
import { Button } from "@/components/ui/button";
import { ContentComponentGrid, type ContentComponentGridItem } from "@/components/app/ContentComponentGrid";
import { Separator } from "@/components/ui/separator";

const contentTypeLabels: Partial<Record<ContentBlockKind, string>> = {
  paragraph: "Paragraph",
  vocabulary: "Vocabulary",
  "synonyms-antonyms": "Synonyms / Antonyms",
  "gap-fill": "Fill in the Gap",
  "gap-fill-first-paper": "Fill in the Blanks",
  "gap-fill-second-paper": "Gap Filling",
  mcq: "MCQ",
  "true-false": "True / False",
  "question-answer": "Question Answer",
  "table-completion": "Table Completion",
  "column-matching": "Column Matching",
  "sentence-ordering": "Rearrange Sentence",
  "information-transfer": "Information Transfer",
  "substitution-table": "Substitution Table",
  "right-form-of-verb": "Right Form of Verb",
  narration: "Narration",
  "changing-sentence": "Changing Sentence",
  "punctuation-and-capitalization": "Punctuation and Capitalization",
  preposition: "Preposition",
  "suffix-and-prefix": "Suffix and Prefix",
  "tag-question": "Tag Question",
  connector: "Connector",
};

function getContentTypeLabel(kind: string) {
  return contentTypeLabels[kind as ContentBlockKind] || "Content";
}

export function TopicContentList({
  contents,
  viewerTitle = "کন্টেন্ট দেখুন",
  viewerDescription = "এই টপিকের কন্টেন্ট পড়ুন।",
}: {
  contents: StudentContentRecord[];
  viewerTitle?: string;
  viewerDescription?: string;
}) {
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const contentItems = contents.flatMap((content) =>
    content.blocks.map((block) => ({
      id: `${content.id}-${block.id}`,
      content,
      block,
      label: getContentTypeLabel(block.kind),
      href:
        block.kind === "mcq"
          ? `/user/mcq/chapter/${content.id}`
          : block.kind === "question-answer"
            ? `/user/question-answer/chapter/${content.id}`
            : undefined,
    })),
  );
  const selectedItem = contentItems.find((item) => item.id === selectedContentId) ?? null;
  const selectedContent = selectedItem ? { ...selectedItem.content, blocks: [selectedItem.block] } : null;

  if (selectedContent) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{viewerTitle}</h2>
            <p className="text-sm text-muted-foreground">{viewerDescription}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setSelectedContentId(null)}>
            ফিরে যান
          </Button>
        </div>
        <Separator />
        <StudentContentViewer content={selectedContent} />
      </div>
    );
  }

  return (
    <ContentComponentGrid
      items={contentItems as ContentComponentGridItem[]}
      onItemClick={(item) => setSelectedContentId(item.id)}
    />
  );
}