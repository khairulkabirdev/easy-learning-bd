import { StudentWorkspaceShell } from "@/components/app/StudentWorkspaceShell";
import { StudentNestedPageNavigation } from "@/components/app/StudentNestedPageNavigation";
import { requireStudent } from "@/lib/app-auth";
import { prisma } from "@/lib/db";
import "./student-workspace.css";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStudent();
  const [classItem, subjects] = await Promise.all([
    user.classId
      ? prisma.class.findFirst({
          where: { id: user.classId, organizationId: user.organizationId },
          select: { name: true },
        })
      : Promise.resolve(null),
    user.classId
      ? prisma.subject.findMany({
          where: {
            classId: user.classId,
            organizationId: user.organizationId,
            status: "published",
          },
          select: { id: true, name: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  return (
    <StudentWorkspaceShell
      userName={user.name}
      userEmail={user.email}
      className={classItem?.name ?? null}
      subjects={subjects}
    >
      <StudentNestedPageNavigation />
      {children}
    </StudentWorkspaceShell>
  );
}

