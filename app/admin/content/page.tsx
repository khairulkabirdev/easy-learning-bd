import { ClassTileGrid } from "@/components/app/ClassTileGrid";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function AdminContentPage() {
  const user = await requireAdmin();

  const classes = await prisma.class.findMany({
    where: { organizationId: user.organizationId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      iconType: true,
      iconName: true,
      iconColor: true,
      imagePath: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Content</h1>
        <p className="text-sm text-muted-foreground">
          Select a class to manage curriculum content and English 1st Paper sections.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Select class</h2>
        {classes.length ? (
          <ClassTileGrid classes={classes} hrefBase="/admin/content/class" />
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
            No classes found.
          </div>
        )}
      </div>
    </div>
  );
}
