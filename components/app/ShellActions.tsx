"use client";

import { useEffect, useState } from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { Button } from "@/components/ui/button";

const THEME_STORAGE_KEY = "dashboard-theme";

export function ShellActions() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    function sync() {
      let dark = document.documentElement.classList.contains("dark");
      try { const saved = localStorage.getItem(THEME_STORAGE_KEY); if (saved) dark = saved === "dark"; } catch { /* storage unavailable */ }
      document.documentElement.classList.toggle("dark", dark);
      setIsDark(dark);
    }
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function toggleTheme() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light"); } catch { /* storage unavailable */ }
    setIsDark(next);
  }
  return <Button type="button" variant="ghost" size="icon" aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"} title={isDark ? "Light mode" : "Dark mode"} onClick={toggleTheme}>{isDark ? <SunMedium className="size-5" /> : <MoonStar className="size-5" />}</Button>;
}
