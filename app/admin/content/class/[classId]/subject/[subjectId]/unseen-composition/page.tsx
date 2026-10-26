import { notFound } from "next/navigation";

import { isEnglishFirstPaperSubject } from "@/app/admin/content/navigation-helpers";
import { UnseenCompositionListClient } from "@/components/admin/UnseenCompositionListClient";
import { getAdminPagedRecords } from "@/lib/admin/paged-records";
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

  const result = await getAdminPagedRecords(user.organizationId, {
    resource: "unseen-composition",
    page: 1,
    pageSize: 10,
    sort: "updated",
    direction: "desc",
    filters: { classId, subjectId },
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <UnseenCompositionListClient
        classItem={subject.class}
        subject={{ id: subject.id, name: subject.name }}
        records={result.rows}
        total={result.total}
      />
    </div>
  );
}
