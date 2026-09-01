"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { ShellNavGroup } from "@/components/app/AppShellNav";
import { cn } from "@/lib/utils";

function isItemActive(pathname: string, href: string) {
  if (
    href === "/user/chapter-preparation" &&
    (pathname.startsWith("/user/chapter-preparation/") || pathname === "/user/chapter-preparation")
  ) {
    return true;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNavLinks({ groups }: { groups: ShellNavGroup[] }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6 px-3 py-4">
      {groups.map((group) => (
        <div key={group.label} className="space-y-2">
          <div className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {group.label}
          </div>
          <div className="space-y-1">
            {group.items.map((item) => {
              const active = isItemActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-9 w-full items-center gap-2 rounded-md px-3 text-sm transition-colors",
                    active
                      ? "bg-accent font-medium text-accent-foreground"
                      : "hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
