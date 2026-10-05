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

const firstPaperChapterSlugs: Partial<Record<ContentBlockKind, string>> = {
  paragraph: "paragraph",
  vocabulary: "vocabulary",
  mcq: "mcq",
  "gap-fill-first-paper": "fill-in-the-blanks",
  "table-completion": "table-completion",
  "question-answer": "question-answer",
  "sentence-ordering": "rearrange-sentence",
  "synonyms-antonyms": "synonyms-antonyms",
  "information-transfer": "information-transfer",
  "true-false": "true-false",
};

function getChapterHref(kind: string, contentId: string) {
  const slug = firstPaperChapterSlugs[kind as ContentBlockKind];
  return slug ? `/user/${slug}/chapter/${contentId}` : undefined;
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

  // Show only one card for each block kind inside a Content record.
  // Example: three Vocabulary blocks in the same content produce one
  // Vocabulary card; opening it renders all three Vocabulary blocks.
  const contentItems = contents.flatMap((content) => {
    const groupedByKind = new Map<
      string,
      {
        id: string;
        content: StudentContentRecord;
        blocks: StudentContentRecord["blocks"];
        label: string;
        href?: string;
      }
    >();

    for (const block of content.blocks) {
      const groupId = `${content.id}-${block.kind}`;
      const existing = groupedByKind.get(block.kind);

      if (existing) {
        existing.blocks.push(block);
        continue;
      }

      groupedByKind.set(block.kind, {
        id: groupId,
        content,
        blocks: [block],
        label: getContentTypeLabel(block.kind),
        href: getChapterHref(block.kind, content.id),
      });
    }

    return Array.from(groupedByKind.values());
  });

  const selectedItem = contentItems.find((item) => item.id === selectedContentId) ?? null;
  const selectedContent = selectedItem
    ? { ...selectedItem.content, blocks: selectedItem.blocks }
    : null;

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