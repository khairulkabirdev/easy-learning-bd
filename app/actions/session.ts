"use server";

import { logout } from "@/lib/app-auth";

export async function logoutAction() {
  await logout();
}
