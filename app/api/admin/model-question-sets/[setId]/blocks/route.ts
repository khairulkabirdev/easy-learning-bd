import { NextResponse } from "next/server";
import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";
import { validateModelQuestionBlock } from "@/lib/model-question-set-validation";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ setId: string }> }) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const { setId } = await params;
  const set = await prisma.modelQuestionSet.findFirst({
    where: { id: setId, organizationId: user.organizationId },
    select: { id: true, subject: { select: { name: true, slug: true, code: true } } },
  });
  if (!set) return NextResponse.json({ error: "Model question set not found." }, { status: 404 });
  let payload: unknown;
  try { payload = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const { data, error } = validateModelQuestionBlock(payload, set.subject);
  if (!data) return NextResponse.json({ error }, { status: 400 });
  const block = await prisma.$transaction(async (tx) => {
    const last = await tx.modelQuestionSetBlock.findFirst({
      where: { setId, organizationId: user.organizationId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true },
    });
    return tx.modelQuestionSetBlock.create({
      data: { setId, kind: data.kind, title: data.title, instructions: data.instructions, passage: data.passage,
        question: data.question, optionsJson: JSON.stringify(data.options), answer: data.answer,
        marks: data.marks, sortOrder: (last?.sortOrder ?? -1) + 1,
        organizationId: user.organizationId, createdBy: user.id, updatedBy: user.id },
      select: { id: true },
    });
  });
  await logAudit({ userId: user.id, userName: user.name, organizationId: user.organizationId,
    action: "CREATE", entityName: "ModelQuestionSetBlock", entityId: block.id, changes: { setId, kind: data.kind } }).catch(() => undefined);
  return NextResponse.json({ success: true, id: block.id }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
