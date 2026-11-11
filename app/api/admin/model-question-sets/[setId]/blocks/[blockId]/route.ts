import { NextResponse } from "next/server";
import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";
import { validateModelQuestionBlock } from "@/lib/model-question-set-validation";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ setId: string; blockId: string }> }) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const { setId, blockId } = await params;
  const block = await prisma.modelQuestionSetBlock.findFirst({
    where: { id: blockId, setId, organizationId: user.organizationId },
    select: { id: true, set: { select: { subject: { select: { name: true, slug: true, code: true } } } } },
  });
  if (!block) return NextResponse.json({ error: "Block not found." }, { status: 404 });
  let payload: unknown;
  try { payload = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const { data, error } = validateModelQuestionBlock(payload, block.set.subject);
  if (!data) return NextResponse.json({ error }, { status: 400 });
  // No delete/recreate: the existing block's identifier and any other blocks are preserved.
  await prisma.modelQuestionSetBlock.update({
    where: { id: blockId },
    data: { kind: data.kind, title: data.title, instructions: data.instructions, passage: data.passage,
      question: data.question, optionsJson: JSON.stringify(data.options), answer: data.answer,
      marks: data.marks, updatedBy: user.id },
  });
  await logAudit({ userId: user.id, userName: user.name, organizationId: user.organizationId,
    action: "UPDATE", entityName: "ModelQuestionSetBlock", entityId: blockId, changes: { setId, kind: data.kind } }).catch(() => undefined);
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
