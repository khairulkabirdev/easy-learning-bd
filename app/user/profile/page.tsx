import { ProfileForm } from "@/components/app/ProfileForm";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/app-auth";

export default async function UserProfilePage() {
  const sessionUser = await requireStudent();

  const [classes, user] = await Promise.all([
    prisma.class.findMany({
      where: { organizationId: sessionUser.organizationId, status: "published" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, code: true },
    }),
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        class: {
          select: { id: true, name: true, code: true },
        },
      },
    }),
  ]);

  if (!user) {
    throw new Error("User profile not found.");
  }

  return <ProfileForm role="student" user={user} classes={classes} />;
}
