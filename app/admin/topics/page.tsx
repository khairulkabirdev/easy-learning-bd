import AdminTopicsClient from "@/app/admin/topics/AdminTopicsClient";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function AdminTopicsPage() {
  const user = await requireAdmin();
  const [classes, subjects, units, lessons] = await Promise.all([
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
    prisma.unit.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ class: { sortOrder: "asc" } }, { subject: { sortOrder: "asc" } }, { sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, classId: true, subjectId: true, title: true, iconType: true, iconLibrary: true, iconName: true, iconColor: true, imagePath: true },
    }),
    prisma.lesson.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ unit: { class: { sortOrder: "asc" } } }, { unit: { subject: { sortOrder: "asc" } } }, { unit: { sortOrder: "asc" } }, { sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, unitId: true, title: true, iconType: true, iconLibrary: true, iconName: true, iconColor: true, imagePath: true },
    }),
  ]);

  return <AdminTopicsClient classes={classes} subjects={subjects} units={units} lessons={lessons} topics={[]} total={0} />;
}
