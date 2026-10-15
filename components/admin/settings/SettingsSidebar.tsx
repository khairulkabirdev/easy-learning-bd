"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HardDrive, Mail, Settings2 } from "lucide-react";

import { cn } from "@/lib/utils";

const links = [
  { title: "Email", href: "/admin/settings", icon: Mail, group: "General" },
  { title: "Configuration", href: "/admin/settings/storage", icon: Settings2, group: "Storage" },
];

export function SettingsSidebar() {
  const pathname = usePathname();
  return (
    <aside className="h-fit rounded-xl border bg-card p-3">
      <div className="mb-3 flex items-center gap-2 px-2 py-1">
        <HardDrive className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Settings</h2>
      </div>
      <div className="space-y-4">
        {(["General", "Storage"] as const).map((group) => (
          <div key={group} className="space-y-1">
            <p className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{group}</p>
            {links.filter((item) => item.group === group).map((item) => {
              const Icon = item.icon;
              const active = item.href === "/admin/settings"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-lg px-3 text-sm transition-colors",
                    active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
