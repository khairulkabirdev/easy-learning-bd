import { notFound } from "next/navigation";

import { SubjectTileGrid } from "@/components/app/SubjectTileGrid";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function AdminContentClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const user = await requireAdmin();
  const { classId } = await params;

  const classItem = await prisma.class.findFirst({
    where: { id: classId, organizationId: user.organizationId },
    select: {
      id: true,
      name: true,
      subjects: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          iconType: true,
          iconName: true,
          iconColor: true,
          imagePath: true,
        },
      },
    },
  });

  if (!classItem) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{classItem.name}</h1>
        <p className="text-sm text-muted-foreground">Select a subject to continue.</p>
      </div>

      {classItem.subjects.length ? (
        <SubjectTileGrid
          subjects={classItem.subjects}
          hrefBase={`/admin/content/class/${classItem.id}/subject`}
        />
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
          No subjects found for this class.
        </div>
      )}
    </div>
  );
}
