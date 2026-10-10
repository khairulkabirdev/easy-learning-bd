import { notFound } from "next/navigation";

import { EnglishSecondPaperSectionPage } from "@/app/admin/content/english-second-paper-blocks/EnglishSecondPaperSectionPage";
import { isEnglishSecondPaperKind } from "@/app/admin/content/english-second-paper-blocks/types";

export default async function Page({
  params,
}: {
  params: Promise<{ classId: string; subjectId: string; secondPaperKind: string }>;
}) {
  const { classId, subjectId, secondPaperKind } = await params;
  if (!isEnglishSecondPaperKind(secondPaperKind)) notFound();
  return <EnglishSecondPaperSectionPage kind={secondPaperKind} classId={classId} subjectId={subjectId} />;
}
