import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTeacher } from "@/lib/app-auth";

export default async function TeacherDashboardPage() {
  const user = await requireTeacher();

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-6 sm:px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Teacher account created</CardTitle>
          <CardDescription>Welcome, {user.name}. Your teacher workspace is ready.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Teaching tools can be connected here when the teacher workflow is added.
        </CardContent>
      </Card>
    </div>
  );
}
