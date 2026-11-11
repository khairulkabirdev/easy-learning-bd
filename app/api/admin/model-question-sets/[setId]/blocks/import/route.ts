import { NextResponse } from "next/server";
import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";
import { MODEL_QUESTION_TEXT_LIMIT, parseModelQuestions } from "@/lib/model-question-parser";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ setId: string }> }) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const { setId } = await params;
  const set = await prisma.modelQuestionSet.findFirst({
    where: { id: setId, organizationId: user.organizationId }, select: { id: true },
  });
  if (!set) return NextResponse.json({ error: "Model question set not found." }, { status: 404 });
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const source = typeof body.questionsText === "string" ? body.questionsText : "";
  if (source.length > MODEL_QUESTION_TEXT_LIMIT) return NextResponse.json({ error: "Question text exceeds the 250,000-character limit." }, { status: 413 });
  const parsed = parseModelQuestions(source);
  if (parsed.errors.length || !parsed.questions.length) {
    return NextResponse.json({ error: parsed.errors.slice(0, 3).join(" ") || "No questions found." }, { status: 400 });
  }
  await prisma.$transaction(async (tx) => {
    const last = await tx.modelQuestionSetBlock.findFirst({
      where: { setId, organizationId: user.organizationId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true },
    });
    await tx.modelQuestionSetBlock.createMany({ data: parsed.questions.map((q, index) => ({
      setId, organizationId: user.organizationId,
      kind: q.type === "mcq" ? "mcq" : "short-answer",
      title: `${q.type === "mcq" ? "MCQ" : "Short Answer"} ${q.number}`,
      instructions: q.explanation ? `Explanation: ${q.explanation}` : "",
      passage: "", question: q.question, optionsJson: JSON.stringify(q.options), answer: q.answer,
      marks: 1, sortOrder: (last?.sortOrder ?? -1) + index + 1,
      createdBy: user.id, updatedBy: user.id,
    })) });
  });
  await logAudit({ userId: user.id, userName: user.name, organizationId: user.organizationId,
    action: "IMPORT", entityName: "ModelQuestionSet", entityId: setId,
    changes: { questionCount: parsed.questions.length },
  }).catch(() => undefined);
  return NextResponse.json({ success: true, imported: parsed.questions.length }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
