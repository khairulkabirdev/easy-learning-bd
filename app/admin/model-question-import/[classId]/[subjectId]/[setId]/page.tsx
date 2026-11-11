import Link from "next/link";
import { notFound } from "next/navigation";
import { ModelQuestionSetEditor } from "@/components/admin/ModelQuestionSetEditor";
import { ModelQuestionNativeEditorGate } from "@/components/admin/ModelQuestionNativeEditorGate";
import AdminContentBlocksPage from "@/app/admin/content/[contentId]/page";
import { isEnglishSecondPaperSubject, isEnglishFirstPaperSubject } from "@/app/admin/content/navigation-helpers";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function ModelQuestionSetPage({ params, searchParams }: {
  params: Promise<{ classId: string; subjectId: string; setId: string }>;
  searchParams: Promise<{ addBlock?: string }>;
}) {
  const user = await requireAdmin();
  const { classId, subjectId, setId } = await params;
  const set = await prisma.modelQuestionSet.findFirst({
    where: { id: setId, classId, subjectId, organizationId: user.organizationId },
    select: {
      id: true, name: true, editorContentId: true,
      class: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true, slug: true, code: true } },
      board: { select: { name: true } }, academicYear: { select: { year: true } },
      blocks: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: {
        id: true, kind: true, title: true, instructions: true, passage: true, question: true,
        optionsJson: true, answer: true, marks: true, sortOrder: true,
      } },
    },
  });
  if (!set) notFound();
  const currentPath = `/admin/model-question-import/${classId}/${subjectId}/${setId}`;
  const paper = isEnglishSecondPaperSubject(set.subject)
    ? "English 2nd Paper"
    : isEnglishFirstPaperSubject(set.subject) ? "English 1st Paper" : set.subject.name;
  const editor = set.editorContentId
    ? await AdminContentBlocksPage({
        params: Promise.resolve({ contentId: set.editorContentId }),
        searchParams: Promise.resolve({ editorMode: "model-question", addBlock: (await searchParams).addBlock }),
      })
    : <ModelQuestionNativeEditorGate setId={set.id} currentPath={currentPath} />;
  const legacyBlocks = set.blocks.map((block) => {
      let options: string[] = [];
      try {
        const parsed: unknown = JSON.parse(block.optionsJson);
        if (Array.isArray(parsed)) options = parsed.filter((item): item is string => typeof item === "string").slice(0, 6);
      } catch { /* Preserve the original record if options are not valid JSON. */ }
      return { id: block.id, kind: block.kind, title: block.title, instructions: block.instructions,
        passage: block.passage, question: block.question, options, answer: block.answer, marks: block.marks,
        sortOrder: block.sortOrder };
    });
  return (
    <div className="space-y-6 pb-12">
      <Link href={`/admin/model-question-import/${classId}/${subjectId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Model Questions
      </Link>
      <header className="space-y-3 rounded-xl border p-5">
        <h1 className="text-2xl font-semibold tracking-tight">{set.name}</h1>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{set.class.name}</Badge>
          <Badge variant="secondary">{paper}</Badge>
          <Badge variant="outline">{set.board?.name ?? "All boards"}</Badge>
          <Badge variant="outline">{set.academicYear?.year ?? "All years"}</Badge>
        </div>
      </header>
      {editor}
      <details className="space-y-3 border-t pt-6" open={legacyBlocks.length > 0}>
        <summary className="cursor-pointer text-base font-semibold">Previous question blocks & TXT/JSON import {legacyBlocks.length > 0 ? `(${legacyBlocks.length})` : ""}</summary>
        <p className="text-sm text-muted-foreground">Previous blocks remain editable in their original format. TXT/JSON import is also available here; imported text stays in the original question-block table.</p>
        <ModelQuestionSetEditor
            setId={set.id} name={set.name} classItem={set.class} subject={set.subject}
            boardName={set.board?.name ?? null} year={set.academicYear?.year ?? null}
            initialBlocks={legacyBlocks} legacyOnly nativeEditorReady={Boolean(set.editorContentId)}
          />
      </details>
    </div>
  );
}
