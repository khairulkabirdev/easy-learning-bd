"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import type { ShellNavGroup } from "@/components/app/AppShellNav";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

function isItemActive(pathname: string, href?: string) {
  if (!href) return false;
  if (href === "/admin/board") return pathname === href;

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
              const hasChildren = Boolean(item.children?.length);
              const active = isItemActive(pathname, item.href);
              const childActive = item.children?.some((child) => isItemActive(pathname, child.href)) ?? false;

              if (hasChildren) {
                return (
                  <Collapsible key={item.title} defaultOpen={childActive} className="group/collapsible">
                    <CollapsibleTrigger
                      className={cn(
                        "group flex h-9 w-full items-center gap-2 rounded-md px-3 text-sm transition-colors",
                        childActive
                          ? "bg-accent/70 font-medium text-accent-foreground"
                          : "hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      {item.icon}
                      <span className="flex-1 text-left">{item.title}</span>
                      <ChevronRight className="size-4 transition-transform group-data-open/collapsible:rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 ml-4 space-y-1 border-l pl-2">
                      {item.children?.map((child) => {
                        const childIsActive = isItemActive(pathname, child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            aria-current={childIsActive ? "page" : undefined}
                            className={cn(
                              "flex h-8 w-full items-center gap-2 rounded-md px-3 text-sm transition-colors",
                              childIsActive
                                ? "bg-accent font-medium text-accent-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                            )}
                          >
                            {child.icon}
                            <span>{child.title}</span>
                          </Link>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                );
              }

              if (!item.href) return null;

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
