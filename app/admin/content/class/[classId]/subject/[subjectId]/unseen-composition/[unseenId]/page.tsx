import { notFound } from "next/navigation";

import { isEnglishFirstPaperSubject } from "@/app/admin/content/navigation-helpers";
import { UnseenCompositionEditorClient } from "@/components/admin/UnseenCompositionEditorClient";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function UnseenCompositionEditorPage({
  params,
}: {
  params: Promise<{ classId: string; subjectId: string; unseenId: string }>;
}) {
  const user = await requireAdmin();
  const { classId, subjectId, unseenId } = await params;

  const record = await prisma.unseenComposition.findFirst({
    where: {
      id: unseenId,
      classId,
      subjectId,
      organizationId: user.organizationId,
    },
    select: {
      id: true,
      title: true,
      documentJson: true,
      class: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true, slug: true, code: true } },
    },
  });

  if (!record || !isEnglishFirstPaperSubject(record.subject)) notFound();

  return (
    <UnseenCompositionEditorClient
      record={{ id: record.id, title: record.title, documentJson: record.documentJson }}
      classItem={record.class}
      subject={{ id: record.subject.id, name: record.subject.name }}
    />
  );
}
