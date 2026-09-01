import { ProfileForm } from "@/components/app/ProfileForm";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/app-auth";

export default async function UserProfilePage() {
  const user = await requireStudent();
  const classes = await prisma.class.findMany({
    where: { organizationId: user.organizationId, status: "published" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, code: true },
  });

  return <ProfileForm role="student" user={user} classes={classes} />;
}
