import AdminClassesClient from "@/app/admin/classes/AdminClassesClient";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function AdminClassesPage() {
  const user = await requireAdmin();
  const classes = await prisma.class.findMany({
    where: { organizationId: user.organizationId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      description: true,
      sortOrder: true,
      _count: {
        select: {
          subjects: true,
          units: true,
        },
      },
    },
  });

  return (
    <AdminClassesClient
      classes={classes.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        code: item.code,
        description: item.description,
        sortOrder: item.sortOrder,
        subjectsCount: item._count.subjects,
        unitsCount: item._count.units,
      }))}
    />
  );
}
