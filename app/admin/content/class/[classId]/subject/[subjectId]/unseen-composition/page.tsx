import { notFound } from "next/navigation";

import { isEnglishFirstPaperSubject } from "@/app/admin/content/navigation-helpers";
import { UnseenCompositionListClient } from "@/components/admin/UnseenCompositionListClient";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function UnseenCompositionPage({
  params,
}: {
  params: Promise<{ classId: string; subjectId: string }>;
}) {
  const user = await requireAdmin();
  const { classId, subjectId } = await params;

  const subject = await prisma.subject.findFirst({
    where: {
      id: subjectId,
      classId,
      organizationId: user.organizationId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      class: { select: { id: true, name: true } },
    },
  });

  if (!subject || !isEnglishFirstPaperSubject(subject)) notFound();

  const records = await prisma.unseenComposition.findMany({
    where: {
      classId,
      subjectId,
      organizationId: user.organizationId,
    },
    orderBy: [{ updatedAt: "desc" }],
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <UnseenCompositionListClient
        classItem={subject.class}
        subject={{ id: subject.id, name: subject.name }}
        records={records.map((record) => ({
          id: record.id,
          title: record.title,
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
