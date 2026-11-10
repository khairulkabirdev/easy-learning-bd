import { NextResponse } from "next/server";

import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";
import { deleteStoredUploadById } from "@/lib/storage/upload-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ recordId: string }> }) {
  const user = await requireAdmin();
  const { recordId } = await context.params;
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(recordId)) return NextResponse.json({ error: "Record not found." }, { status: 404 });
  const record = await prisma.modelQuestionImport.findFirst({
    where: { id: recordId, organizationId: user.organizationId },
    select: { id: true, title: true, questionCount: true, questionsJson: true },
  });
  if (!record) return NextResponse.json({ error: "Record not found." }, { status: 404 });
  return NextResponse.json({ success: true, title: record.title, questionCount: record.questionCount, questions: JSON.parse(record.questionsJson) },
    { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(_request: Request, context: { params: Promise<{ recordId: string }> }) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const { recordId } = await context.params;
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(recordId)) return NextResponse.json({ error: "Record not found." }, { status: 404 });
  const record = await prisma.modelQuestionImport.findFirst({
    where: { id: recordId, organizationId: user.organizationId },
    select: { id: true, title: true, fileId: true, classId: true, subjectId: true },
  });
  if (!record) return NextResponse.json({ error: "Record not found." }, { status: 404 });

  await prisma.modelQuestionImport.delete({ where: { id: record.id } });
  await deleteStoredUploadById(record.fileId, user.organizationId, user.id);
  await logAudit({
    userId: user.id, userName: user.name, organizationId: user.organizationId,
    action: "DELETE", entityName: "ModelQuestionImport", entityId: record.id,
    changes: record,
  }).catch(() => undefined);
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
