import { notFound, redirect } from "next/navigation";

import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function Page({
  params,
}: {
  params: Promise<{ classId: string; unseenId: string }>;
}) {
  const user = await requireAdmin();
  const { classId, unseenId } = await params;
  const record = await prisma.unseenComposition.findFirst({
    where: { id: unseenId, classId, organizationId: user.organizationId },
    select: { subjectId: true },
  });
  if (!record) notFound();

  redirect(
    `/admin/content/class/${classId}/subject/${record.subjectId}/unseen-composition/${unseenId}`,
  );
}
