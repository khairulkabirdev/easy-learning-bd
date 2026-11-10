import { StudentDashboardHome } from "@/components/app/StudentDashboardHome";
import { requireStudent } from "@/lib/app-auth";
import { getStudentDashboardData } from "@/lib/user/student-dashboard";

export default async function StudentDashboardPage() {
  const user = await requireStudent();
  const data = await getStudentDashboardData(user);
  return <StudentDashboardHome data={data} />;
}
