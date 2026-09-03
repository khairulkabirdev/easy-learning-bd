import { ProfileForm } from "@/components/app/ProfileForm";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/app-auth";

export default async function TeacherProfilePage() {
  const sessionUser = await requireTeacher();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      class: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  if (!user) {
    throw new Error("Teacher profile not found.");
  }

  return <ProfileForm role="teacher" user={user} />;
}
