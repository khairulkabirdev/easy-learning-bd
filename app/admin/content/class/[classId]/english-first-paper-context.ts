import { isEnglishFirstPaperSubject } from "@/app/admin/content/navigation-helpers";
import { prisma } from "@/lib/db";

export async function getEnglishFirstPaperContext(classId: string, organizationId: string) {
  const classItem = await prisma.class.findFirst({
    where: { id: classId, organizationId },
    select: { id: true, name: true },
  });
  if (!classItem) return null;

  const subjects = await prisma.subject.findMany({
    where: { classId, organizationId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, code: true },
  });
  const subject = subjects.find(isEnglishFirstPaperSubject);
  if (!subject) return null;

  return { classItem, subject };
}
