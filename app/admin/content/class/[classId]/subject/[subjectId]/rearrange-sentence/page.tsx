import { notFound } from "next/navigation";

import { isEnglishFirstPaperSubject } from "@/app/admin/content/navigation-helpers";
import { EnglishFirstPaperSectionShell } from "@/components/admin/EnglishFirstPaperSectionShell";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function Page({
  params,
}: {
  params: Promise<{ classId: string; subjectId: string }>;
}) {
  const user = await requireAdmin();
  const { classId, subjectId } = await params;

  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, classId, organizationId: user.organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      class: { select: { id: true, name: true } },
    },
  });

  if (!subject || !isEnglishFirstPaperSubject(subject)) notFound();

  return (
    <EnglishFirstPaperSectionShell
      classItem={subject.class}
      subject={{ id: subject.id, name: subject.name }}
      title="Rearrange Sentence"
      description="Rearrange and sentence-ordering content will use this section."
    />
  );
}
