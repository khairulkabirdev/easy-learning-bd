"use server";

import { requireAdmin } from "@/lib/app-auth";
import { getAdminPagedRecords } from "@/lib/admin/paged-records";
import type { AdminPagedRequest } from "@/lib/admin/pagination-types";

export async function loadAdminPagedRecords(input: AdminPagedRequest) {
  const user = await requireAdmin();
  return getAdminPagedRecords(user.organizationId, input);
}
