"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

const LAST_PATH_KEY = "easy-learning:last-internal-path";
const PREVIOUS_PATH_KEY = "easy-learning:previous-internal-path";

function getRoleFallback(pathname: string) {
  if (pathname.startsWith("/admin")) return "/admin/dashboard";
  if (pathname.startsWith("/teacher")) return "/teacher/dashboard";
  if (pathname.startsWith("/user")) return "/user/dashboard";
  return "/";
}

function isSafeInternalPath(value: string | null) {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//"));
}

export function GlobalBackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPath = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    const lastPath = window.sessionStorage.getItem(LAST_PATH_KEY);

    if (lastPath && lastPath !== currentPath && isSafeInternalPath(lastPath)) {
      window.sessionStorage.setItem(PREVIOUS_PATH_KEY, lastPath);
    }

    window.sessionStorage.setItem(LAST_PATH_KEY, currentPath);
  }, [currentPath]);

  const handleBack = () => {
    const previousPath = window.sessionStorage.getItem(PREVIOUS_PATH_KEY);
    const fallback = getRoleFallback(pathname);

    if (isSafeInternalPath(previousPath) && previousPath !== currentPath) {
      router.push(previousPath!);
      return;
    }

    if (pathname !== fallback) {
      router.push(fallback);
      return;
    }

    router.push("/");
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0 gap-2"
      onClick={handleBack}
      aria-label="Go back"
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="hidden sm:inline">Back</span>
    </Button>
  );
}
