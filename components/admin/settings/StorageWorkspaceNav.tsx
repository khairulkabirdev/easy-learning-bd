"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HardDrive, Images } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/admin/settings", label: "Storage Setting", icon: HardDrive, exact: true },
  { href: "/admin/settings/media-library", label: "Media Library", icon: Images, exact: false },
];

export function StorageWorkspaceNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Storage settings" className="flex min-w-0 items-center">
      <div className="inline-flex max-w-full items-center gap-1 rounded-full border bg-background p-1 shadow-sm">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.exact ? pathname === item.href || pathname === "/admin/settings/storage" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
