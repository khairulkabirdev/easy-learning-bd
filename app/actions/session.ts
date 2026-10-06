"use server";

import { assertTrustedMutationOrigin, logout } from "@/lib/app-auth";

export async function logoutAction() {
  await assertTrustedMutationOrigin();
  await logout();
}
