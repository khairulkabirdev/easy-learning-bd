import AdminUnitsClient from "@/app/admin/units/AdminUnitsClient";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function AdminUnitsPage() {
  const user = await requireAdmin();
  const [classes, subjects] = await Promise.all([
    prisma.class.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, iconType: true, iconLibrary: true, iconName: true, iconColor: true, imagePath: true },
    }),
    prisma.subject.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ class: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, classId: true, name: true, iconType: true, iconLibrary: true, iconName: true, iconColor: true, imagePath: true },
    }),
  ]);

  return <AdminUnitsClient classes={classes} subjects={subjects} units={[]} total={0} />;
}
