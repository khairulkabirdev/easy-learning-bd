import type { ReactNode } from "react";

import { SettingsSidebar } from "@/components/admin/settings/SettingsSidebar";

export default function AdminSettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-screen-2xl gap-5 px-3 py-5 sm:px-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6 lg:px-6">
      <SettingsSidebar />
      <main className="min-w-0">{children}</main>
    </div>
  );
}
