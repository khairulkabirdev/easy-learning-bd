import { NextResponse } from "next/server";
import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const classId = typeof body.classId === "string" ? body.classId : "";
  const subjectId = typeof body.subjectId === "string" ? body.subjectId : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const boardId = typeof body.boardId === "string" && body.boardId !== "none" ? body.boardId : "";
  const academicYearId = typeof body.academicYearId === "string" && body.academicYearId !== "none" ? body.academicYearId : "";
  if (!name || name.length > 180) return NextResponse.json({ error: "Name is required (maximum 180 characters)." }, { status: 400 });
  if (!classId || !subjectId) return NextResponse.json({ error: "Class and Subject are required." }, { status: 400 });

  const [subject, board, year] = await Promise.all([
    prisma.subject.findFirst({ where: { id: subjectId, classId, organizationId: user.organizationId }, select: { id: true } }),
    boardId ? prisma.board.findFirst({ where: { id: boardId, organizationId: user.organizationId, isActive: true }, select: { id: true } }) : Promise.resolve(null),
    academicYearId ? prisma.academicYear.findFirst({ where: { id: academicYearId, organizationId: user.organizationId, isActive: true }, select: { id: true } }) : Promise.resolve(null),
  ]);
  if (!subject || (boardId && !board) || (academicYearId && !year)) {
    return NextResponse.json({ error: "Invalid Class, Subject, Board or Year." }, { status: 400 });
  }

  const created = await prisma.modelQuestionSet.create({
    data: {
      classId, subjectId, name,
      boardId: boardId || null, academicYearId: academicYearId || null,
      organizationId: user.organizationId, createdBy: user.id, updatedBy: user.id,
    },
    select: { id: true },
  });
  await logAudit({ userId: user.id, userName: user.name, organizationId: user.organizationId,
    action: "CREATE", entityName: "ModelQuestionSet", entityId: created.id,
    changes: { name, classId, subjectId, boardId: boardId || null, academicYearId: academicYearId || null },
  }).catch(() => undefined);
  return NextResponse.json({ success: true, id: created.id }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
