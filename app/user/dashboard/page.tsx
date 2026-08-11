import { requireUser } from "@/lib/app-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function UserDashboardPage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Student Dashboard</CardTitle>
          <CardDescription>Signed in as {user.email}.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The student workspace now uses the same shared dashboard shell and sidebar pattern as the admin area.
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progress</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Learning progress widgets can go here.</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Lessons</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Recent lesson activity can go here.</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assignments</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Assignment shortcuts can go here.</CardContent>
        </Card>
      </div>
    </div>
  );
}
