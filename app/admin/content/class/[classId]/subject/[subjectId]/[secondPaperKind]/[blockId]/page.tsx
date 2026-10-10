import { notFound } from "next/navigation";

import { EnglishSecondPaperSectionEditorPage } from "@/app/admin/content/english-second-paper-blocks/EnglishSecondPaperSectionEditorPage";
import { isEnglishSecondPaperKind } from "@/app/admin/content/english-second-paper-blocks/types";

export default async function Page({
  params,
}: {
  params: Promise<{ classId: string; subjectId: string; secondPaperKind: string; blockId: string }>;
}) {
  const { classId, subjectId, secondPaperKind, blockId } = await params;
  if (!isEnglishSecondPaperKind(secondPaperKind)) notFound();
  return (
    <EnglishSecondPaperSectionEditorPage
      kind={secondPaperKind}
      classId={classId}
      subjectId={subjectId}
      blockId={blockId}
    />
  );
}
