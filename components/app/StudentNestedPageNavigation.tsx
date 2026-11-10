"use client";

import { usePathname } from "next/navigation";
import { PageNavigation } from "@/components/app/PageNavigation";

export function StudentNestedPageNavigation() {
  const pathname = usePathname();
  if (pathname === "/user" || pathname === "/user/" || pathname === "/user/dashboard") return null;
  return <div className="mb-5"><PageNavigation /></div>;
}
