"use server";

import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export async function getBlockBoardYearOptions() {
  const user = await requireAdmin();

  const [boards, years] = await Promise.all([
    prisma.board.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: { id: true, name: true, isActive: true },
    }),
    prisma.academicYear.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ isActive: "desc" }, { year: "desc" }],
      select: { id: true, year: true, isActive: true },
    }),
  ]);

  return { boards, years };
}
