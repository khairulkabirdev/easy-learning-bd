import AdminSubjectsClient from "@/app/admin/subjects/AdminSubjectsClient";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function AdminSubjectsPage() {
  const user = await requireAdmin();
  const classes = await prisma.class.findMany({
    where: { organizationId: user.organizationId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      iconType: true,
      iconLibrary: true,
      iconName: true,
      iconColor: true,
      imagePath: true,
    },
  });

  return <AdminSubjectsClient classes={classes} subjects={[]} total={0} />;
}
