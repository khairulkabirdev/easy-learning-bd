import { notFound } from "next/navigation";
import { requireStudent } from "@/lib/app-auth";
import { getModelPaper, modelPaperEntryKey, modelPaperPromptOnly } from "@/lib/model-question-papers";
import { ModelPaperTest } from "./ModelPaperTest";

export default async function ModelTestPage({ params }: { params: Promise<{ subjectId: string; setId: string }> }) {
  const user = await requireStudent();
  const { subjectId, setId } = await params;
  if (!user.classId) notFound();
  const paper = await getModelPaper({ organizationId: user.organizationId, classId: user.classId, subjectId }, setId, "student");
  if (!paper) notFound();
  return <ModelPaperTest key={paper.id} promptPaper={modelPaperPromptOnly(paper)} entryKey={modelPaperEntryKey(paper)} />;
}
