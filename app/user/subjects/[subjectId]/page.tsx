import { notFound, redirect } from "next/navigation";

import { requireUser } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function LegacyUserSubjectPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const user = await requireUser();
  const { subjectId } = await params;

  const subject = await prisma.subject.findFirst({
    where: {
      id: subjectId,
      organizationId: user.organizationId,
      status: "published",
    },
    select: {
      id: true,
      classId: true,
    },
  });

  if (!subject) {
    notFound();
  }

  redirect(`/user/chapter-preparation/classes/${subject.classId}/subjects/${subject.id}`);
}
