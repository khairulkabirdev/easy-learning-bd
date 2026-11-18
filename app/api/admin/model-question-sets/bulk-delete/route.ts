import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { assertTrustedMutationOrigin, getCurrentUser } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const recordId = z.string().trim().min(1).max(128);
const deleteInput = z.object({
  classId: recordId,
  subjectId: recordId,
  ids: z.array(recordId).min(1).max(100).refine((ids) => new Set(ids).size === ids.length),
});

class DeletionConflict extends Error {}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try {
    await assertTrustedMutationOrigin();
  } catch {
    return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  }
  const parsed = deleteInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Select valid model question sets to delete." }, { status: 400 });
  }

  const { classId, subjectId, ids } = parsed.data;
  const { organizationId } = user;
  const scope = { organizationId, classId, subjectId };
  const setWhere = { ...scope, id: { in: ids } };

  try {
    const deletedSets = await prisma.$transaction(async (tx) => {
      const sets = await tx.modelQuestionSet.findMany({
        where: setWhere,
        select: { id: true, name: true, editorContentId: true },
      });
      if (sets.length !== ids.length) {
        throw new DeletionConflict("Some selected sets are missing or do not belong to this subject. Refresh and try again.");
      }

      const contentIds = sets.flatMap((set) => set.editorContentId ? [set.editorContentId] : []);
      if (new Set(contentIds).size !== contentIds.length) {
        throw new DeletionConflict("Two selected sets share an editor. No sets were deleted.");
      }
      if (contentIds.length > 0) {
        // A model-question editor belongs to the draft lesson created for
        // that set. Never delete ordinary curriculum or another set's editor.
        const [contents, otherSet] = await Promise.all([
          tx.content.findMany({
            where: { ...scope, id: { in: contentIds } },
            select: {
              id: true,
              unitId: true,
              unit: { select: { slug: true, status: true, organizationId: true, classId: true, subjectId: true } },
              lesson: { select: { slug: true, status: true, organizationId: true, unitId: true } },
            },
          }),
          tx.modelQuestionSet.findFirst({
            where: { editorContentId: { in: contentIds }, id: { notIn: ids } },
            select: { id: true },
          }),
        ]);
        const contentsById = new Map(contents.map((content) => [content.id, content]));
        const ownsEveryEditor = sets.every((set) => {
          if (!set.editorContentId) return true;
          const content = contentsById.get(set.editorContentId);
          return content?.lesson.slug === `elesson-model-question-set-${set.id}-lesson` &&
            content.lesson.status === "draft" && content.lesson.organizationId === organizationId &&
            content.lesson.unitId === content.unitId &&
            content.unit.slug === `elesson-model-questions-${subjectId}-unit` &&
            content.unit.status === "draft" && content.unit.organizationId === organizationId &&
            content.unit.classId === classId && content.unit.subjectId === subjectId;
        });
        if (otherSet || !ownsEveryEditor) {
          throw new DeletionConflict("A selected set has a missing or unexpected editor link. No sets were deleted.");
        }
      }

      // Keep source uploads and curriculum untouched. Removing the selected
      // native Content roots cascades to their ContentBlocks and block payloads.
      // Removing the sets also cascades to legacy TXT/JSON question blocks.
      const removed = await tx.modelQuestionSet.deleteMany({ where: setWhere });
      if (removed.count !== sets.length) {
        throw new DeletionConflict("The selection changed. Refresh and try again.");
      }
      if (contentIds.length > 0) {
        const editors = await tx.content.deleteMany({ where: { ...scope, id: { in: contentIds } } });
        if (editors.count !== contentIds.length) {
          throw new DeletionConflict("The linked editor selection changed. Refresh and try again.");
        }
      }
      return sets;
    });

    await Promise.allSettled(deletedSets.map((set) => logAudit({
      userId: user.id,
      userName: user.name,
      organizationId,
      action: "DELETE",
      entityName: "ModelQuestionSet",
      entityId: set.id,
      changes: { name: set.name, classId, subjectId, editorContentId: set.editorContentId },
    })));

    const subjectPath = `/admin/model-question-import/${classId}/${subjectId}`;
    revalidatePath(subjectPath);
    for (const set of deletedSets) {
      revalidatePath(`${subjectPath}/${set.id}`);
      if (set.editorContentId) revalidatePath(`/admin/content/${set.editorContentId}`);
    }
    return NextResponse.json({ success: true, deletedCount: deletedSets.length });
  } catch (cause) {
    if (cause instanceof DeletionConflict) {
      return NextResponse.json({ error: cause.message }, { status: 409 });
    }
    console.error("Could not bulk-delete model question sets", cause);
    return NextResponse.json({ error: "Could not delete the selected model question sets." }, { status: 500 });
  }
}
