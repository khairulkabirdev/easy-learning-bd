import type { ReactNode } from "react";

export default function AdminSettingsLayout({ children }: { children: ReactNode }) {
  return <div className="w-full min-w-0">{children}</div>;
}
