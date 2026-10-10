import { notFound } from "next/navigation";

import { EnglishSecondPaperSectionAddPage } from "@/app/admin/content/english-second-paper-blocks/EnglishSecondPaperSectionAddPage";
import { isEnglishSecondPaperKind } from "@/app/admin/content/english-second-paper-blocks/types";

export default async function Page({
  params,
}: {
  params: Promise<{ classId: string; subjectId: string; secondPaperKind: string }>;
}) {
  const { classId, subjectId, secondPaperKind } = await params;
  if (!isEnglishSecondPaperKind(secondPaperKind)) notFound();
  return <EnglishSecondPaperSectionAddPage kind={secondPaperKind} classId={classId} subjectId={subjectId} />;
}
