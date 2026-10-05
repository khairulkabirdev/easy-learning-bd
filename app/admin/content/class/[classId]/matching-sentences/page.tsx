import { notFound, redirect } from "next/navigation";

import { getEnglishFirstPaperContext } from "@/app/admin/content/class/[classId]/english-first-paper-context";
import { requireAdmin } from "@/lib/app-auth";

export default async function Page({ params }: { params: Promise<{ classId: string }> }) {
  const user = await requireAdmin();
  const { classId } = await params;
  const context = await getEnglishFirstPaperContext(classId, user.organizationId);
  if (!context) notFound();

  redirect(`/admin/content/class/${classId}/subject/${context.subject.id}/matching-sentences`);
}
