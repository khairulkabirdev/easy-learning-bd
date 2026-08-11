import "server-only";

import { prisma } from "@/lib/db";

type AuditInput = {
  userId?: string | null;
  userName: string;
  action: string;
  entityName: string;
  entityId: string;
  changes: unknown;
  organizationId: string;
};

export async function logAudit(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId || null,
      userName: input.userName,
      action: input.action,
      entityName: input.entityName,
      entityId: input.entityId,
      changes: JSON.stringify(input.changes ?? null),
      organizationId: input.organizationId,
    },
  });
}
