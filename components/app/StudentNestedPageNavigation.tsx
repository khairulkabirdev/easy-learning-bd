"use client";

import { usePathname } from "next/navigation";
import { PageNavigation } from "@/components/app/PageNavigation";

/** A saved resume destination must be an internal lesson/practice route. */
export function isStudentResumeHref(href: string) {
  if (href.length > 2048 || href.includes("\\") || /[\u0000-\u001f]/.test(href)) return false;
  const [path, query = ""] = href.split("?", 2);
  if (/^\/user\/(?:mcq|paragraph|vocabulary|fill-in-the-blanks|information-transfer|question-answer|rearrange-sentence|synonyms-antonyms|table-completion|true-false)\/chapter\/[A-Za-z0-9_-]+$/.test(path)) return true;
  if (!/^\/user\/chapter-preparation\/subjects\/[A-Za-z0-9_-]+\//.test(path)) return false;
  if (/\/lessons\/[A-Za-z0-9_-]+(?:\/topics\/[A-Za-z0-9_-]+)?$/.test(path)) return true;
  const params = new URLSearchParams(query);
  return params.has("recordId") || params.has("contentId");
}

export function StudentNestedPageNavigation() {
  const pathname = usePathname();
  if (pathname === "/user" || pathname === "/user/" || pathname === "/user/dashboard") return null;
  return <div className="mb-5"><PageNavigation /></div>;
}
