import { ProfileForm } from "@/components/app/ProfileForm";
import { requireTeacher } from "@/lib/app-auth";

export default async function TeacherProfilePage() {
  const user = await requireTeacher();

  return <ProfileForm role="teacher" user={user} />;
}
