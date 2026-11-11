import { NextResponse } from "next/server";

import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * One-time, additive bridge from a ModelQuestionSet to the *existing* Content
 * editor. No previous ModelQuestionSetBlock rows are moved or rewritten.
 * The draft unit/lesson keep editor content out of published student lessons.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ setId: string }> }) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const { setId } = await params;

  const set = await prisma.modelQuestionSet.findFirst({
    where: { id: setId, organizationId: user.organizationId },
    select: {
      id: true, name: true, classId: true, subjectId: true, editorContentId: true,
    },
  });
  if (!set) return NextResponse.json({ error: "Model question set not found." }, { status: 404 });

  if (set.editorContentId) {
    const existing = await prisma.content.findFirst({
      where: { id: set.editorContentId, organizationId: user.organizationId, classId: set.classId, subjectId: set.subjectId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "The linked content editor is missing. No records were modified; restore its content before proceeding." }, { status: 409 });
    }
    return NextResponse.json({ success: true, contentId: existing.id });
  }

  try {
    const contentId = await prisma.$transaction(async (tx) => {
      // Idempotent shared draft curriculum context per subject. Existing real
      // lessons and published content are never altered or repurposed.
      const slugBase = `elesson-model-questions-${set.subjectId}`;
      const unit = await tx.unit.upsert({
        where: { slug: `${slugBase}-unit` },
        create: {
          classId: set.classId, subjectId: set.subjectId,
          title: "Model Questions — Internal Workspace", slug: `${slugBase}-unit`,
          status: "draft", organizationId: user.organizationId,
          createdBy: user.id, updatedBy: user.id,
        },
        update: {},
        select: { id: true, classId: true, subjectId: true, organizationId: true },
      });
      if (unit.classId !== set.classId || unit.subjectId !== set.subjectId || unit.organizationId !== user.organizationId) {
        throw new Error("Internal model-question unit belongs to a different subject or organization.");
      }
      // Each set has its own draft lesson, so even databases with the old
      // unique Content-path index never collide across question sets.
      const lessonSlug = `elesson-model-question-set-${set.id}-lesson`;
      const lesson = await tx.lesson.upsert({
        where: { slug: lessonSlug },
        create: {
          unitId: unit.id, title: `Model Question — ${set.name}`,
          slug: lessonSlug, status: "draft", organizationId: user.organizationId,
          createdBy: user.id, updatedBy: user.id,
        },
        update: {},
        select: { id: true, unitId: true, organizationId: true },
      });
      if (lesson.unitId !== unit.id || lesson.organizationId !== user.organizationId) {
        throw new Error("Internal model-question lesson does not match its unit.");
      }

      const content = await tx.content.create({
        data: {
          title: set.name, classId: set.classId, subjectId: set.subjectId,
          unitId: unit.id, lessonId: lesson.id,
          organizationId: user.organizationId, createdBy: user.id, updatedBy: user.id,
        },
        select: { id: true },
      });
      // Compare-and-set ensures simultaneous initialization cannot overwrite an
      // earlier link. A losing transaction rolls back its new Content record.
      const linked = await tx.modelQuestionSet.updateMany({
        where: { id: set.id, organizationId: user.organizationId, editorContentId: null },
        data: { editorContentId: content.id, updatedBy: user.id },
      });
      if (linked.count !== 1) throw new Error("This model-question editor was initialized by another request. Refresh and retry.");
      return content.id;
    });

    await logAudit({ userId: user.id, userName: user.name, organizationId: user.organizationId,
      action: "CREATE", entityName: "ModelQuestionSharedContentEditor", entityId: contentId,
      changes: { setId, contentId },
    }).catch(() => undefined);
    return NextResponse.json({ success: true, contentId }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not initialize existing block editor. No existing question data was changed." }, { status: 409 });
  }
}
