import { RegisterForm } from "@/app/auth/register/RegisterForm";
import { prisma } from "@/lib/db";

const DEFAULT_ORGANIZATION_ID = "default-org";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const classes = await prisma.class.findMany({
    where: {
      organizationId: DEFAULT_ORGANIZATION_ID,
      status: "published",
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      code: true,
    },
  });

  return <RegisterForm classes={classes} />;
}
