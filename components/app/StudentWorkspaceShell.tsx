"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpenCheck,
  BookOpen,
  ChevronDown,
  FolderOpen,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  Search,
  Sun,
  UserRound,
  X,
  ClipboardList,
} from "lucide-react";

import { logoutAction } from "@/app/actions/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/app-branding";

export type StudentNavSubject = { id: string; name: string };

type Props = {
  userName: string;
  userEmail: string;
  className: string | null;
  subjects: StudentNavSubject[];
  children: React.ReactNode;
};

const NAV = [
  { label: "Dashboard", href: "/user", icon: Home },
  { label: "Chapter Preparation", href: "/user/chapter-preparation", icon: FolderOpen },
  { label: "Practice Library", href: "/user/practice", icon: ClipboardList },
  { label: "My Profile", href: "/user/profile", icon: UserRound },
] as const;

const THEME_KEY = "dashboard-theme"; // compatible with existing project theme toggle
const STUDENT_SIDEBAR_KEY = "elesson-student-sidebar-collapsed";

function isActive(pathname: string, href: string) {
  if (href === "/user") return pathname === "/user" || pathname === "/user/dashboard";
  if (href === "/user/practice") return pathname.startsWith("/user/practice");
  if (href === "/user/chapter-preparation") return pathname.startsWith("/user/chapter-preparation");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function StudentBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/user" className="flex min-w-0 items-center gap-2.5" aria-label={`${APP_NAME} Dashboard`}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <BookOpenCheck className="size-5" />
      </span>
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-base font-extrabold tracking-tight text-primary">{APP_NAME}</span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">Learn · Practice · Improve</span>
        </span>
      )}
    </Link>
  );
}

export function StudentWorkspaceShell({ userName, userEmail, className, subjects, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const firstName = userName.trim().split(/\s+/)[0] || "Student";

  useEffect(() => {
    const preference = window.localStorage.getItem(THEME_KEY);
    const isDark = preference === "dark" || (!preference && document.documentElement.classList.contains("dark"));
    document.documentElement.classList.toggle("dark", isDark);
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    try {
      setSidebarCollapsed(window.localStorage.getItem(STUDENT_SIDEBAR_KEY) === "true");
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setSearch("");
  }, [pathname]);

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        requestAnimationFrame(() => {
          const mobile = window.matchMedia("(max-width: 639px)").matches;
          (mobile ? mobileSearchRef : desktopSearchRef).current?.focus();
        });
      }
      if (event.key === "Escape") setSearchOpen(false);
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);

  const searchResults = useMemo(() => {
    const candidates = [
      ...NAV.map(({ label, href }) => ({ label, href, type: "Page" })),
      ...subjects.map((s) => ({ label: s.name, href: `/user/chapter-preparation/subjects/${s.id}`, type: "Subject" })),
    ];
    const term = search.trim().toLowerCase();
    return (term ? candidates.filter((c) => c.label.toLowerCase().includes(term)) : candidates).slice(0, 9);
  }, [search, subjects]);

  function toggleDesktopSidebar() {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    try {
      window.localStorage.setItem(STUDENT_SIDEBAR_KEY, String(next));
    } catch {
      // Keep the toggle usable if storage is blocked.
    }
  }

  function toggleTheme() {
    const next = !darkMode;
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    setDarkMode(next);
  }

  function navigateToSearchResult(href: string) {
    setSearchOpen(false);
    setSearch("");
    router.push(href);
  }

  const navList = (mobile = false) => (
    <nav id={mobile ? undefined : "student-sidebar-navigation"} aria-label={mobile ? "Mobile student navigation" : "Student navigation"} className="space-y-1.5">
      {NAV.map(({ label, href, icon: Icon }) => {
        const active = isActive(pathname, href);
        const compact = !mobile && sidebarCollapsed;
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMenuOpen(false)}
            aria-current={active ? "page" : undefined}
            aria-label={compact ? label : undefined}
            title={compact ? label : undefined}
            className={cn(
              "relative flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
              compact && "justify-center gap-0 px-0",
              active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className={cn("shrink-0", compact ? "size-5" : "size-4.5")} aria-hidden="true" />
            {!compact && <span>{label}</span>}
            {active && <span className={cn("size-1.5 rounded-full bg-primary-foreground", compact ? "absolute right-1.5 top-1.5" : "ml-auto")} />}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="student-workspace flex min-h-screen w-full">
      <aside
        aria-label="Student sidebar"
        data-collapsed={sidebarCollapsed ? "true" : "false"}
        className={cn(
          "student-sidebar relative sticky top-0 z-40 hidden h-svh shrink-0 flex-col border-r py-5 transition-[width,padding] duration-200 motion-reduce:transition-none lg:flex",
          sidebarCollapsed ? "w-[80px] px-2" : "w-[250px] px-3 xl:w-[270px]",
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute -right-4 top-6 z-10 size-8 rounded-full border bg-background shadow-sm"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!sidebarCollapsed}
          aria-controls="student-sidebar-navigation"
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={toggleDesktopSidebar}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
        <div className={cn("pb-9", sidebarCollapsed ? "flex justify-center" : "px-2")}><StudentBrand compact={sidebarCollapsed} /></div>
        <p className={cn("mb-3 text-[11px] font-semibold uppercase tracking-[.15em] text-muted-foreground", sidebarCollapsed ? "sr-only" : "px-3")}>Learning</p>
        {navList()}
        {subjects.length > 0 && (
          <div className={cn("mt-9 min-h-0 overflow-y-auto overflow-x-hidden", sidebarCollapsed ? "px-0" : "px-2")}>
            <p className={cn("mb-2 text-[11px] font-semibold uppercase tracking-[.15em] text-muted-foreground", sidebarCollapsed && "sr-only")}>Your subjects</p>
            <div className="space-y-1">
              {subjects.slice(0, 7).map((subject) => {
                const href = `/user/chapter-preparation/subjects/${subject.id}`;
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={subject.id}
                    href={href}
                    title={sidebarCollapsed ? subject.name : undefined}
                    aria-label={sidebarCollapsed ? subject.name : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-10 items-center rounded-lg text-xs transition-colors hover:bg-accent hover:text-foreground",
                      sidebarCollapsed ? "justify-center px-0" : "px-2",
                      active ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground",
                    )}
                  >
                    {sidebarCollapsed ? <BookOpen className="size-5" aria-hidden="true" /> : <span className="truncate">{subject.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
        <div className={cn("mt-auto pt-6", sidebarCollapsed && "flex justify-center")}>
          {sidebarCollapsed ? (
            <Link
              href="/user/practice"
              title="Start Practicing"
              aria-label="Start Practicing"
              className="flex size-11 items-center justify-center rounded-xl border border-primary text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <GraduationCap className="size-5" aria-hidden="true" />
            </Link>
          ) : (
            <div className="rounded-2xl border border-primary p-4">
              <GraduationCap className="mb-2 size-7 text-primary" />
              <p className="text-sm font-semibold">Ready for today's practice?</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Explore your available lessons and exercises.</p>
              <Link href="/user/practice" className="mt-3 flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground">Start Practicing <ArrowRight className="size-3.5" /></Link>
            </div>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="student-topbar sticky top-0 z-30 border-b px-3 backdrop-blur-xl sm:px-5 xl:px-8">
          <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-3">
            <Button variant="outline" size="icon" className="shrink-0 lg:hidden" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu className="size-5" /></Button>
            <div className="hidden sm:block lg:hidden"><StudentBrand /></div>
            <div className="lg:hidden sm:hidden"><StudentBrand compact /></div>
            <div className="hidden shrink-0 lg:block"><span className="text-sm font-semibold">Student Workspace</span><span className="block text-xs text-muted-foreground">{className || "Your learning dashboard"}</span></div>

            <div className="relative mx-auto hidden w-full max-w-md min-w-0 flex-1 sm:block" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setSearchOpen(false); }}>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input ref={desktopSearchRef} type="search" value={search} onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} onKeyDown={(e) => { if (e.key === "Enter" && searchResults[0]) navigateToSearchResult(searchResults[0].href); }} placeholder="Search subjects and pages…" aria-label="Search subjects and pages" className="h-10 rounded-xl border-border bg-background pl-10 pr-14" />
              <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border px-1.5 text-[10px] text-muted-foreground">Ctrl K</kbd>
              {searchOpen && <div className="student-search-popover absolute inset-x-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl p-1.5">
                {searchResults.length ? searchResults.map((r) => <button key={r.href} type="button" onClick={() => navigateToSearchResult(r.href)} className="flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"><span className="truncate">{r.label}</span><span className="ml-3 text-[10px] text-muted-foreground">{r.type}</span></button>) : <p className="p-3 text-sm text-muted-foreground">No matching subject or page.</p>}
              </div>}
            </div>

            <div className="ml-auto flex items-center gap-1 sm:ml-0 sm:gap-2">
              <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Search" onClick={() => { setSearchOpen((x) => !x); requestAnimationFrame(() => mobileSearchRef.current?.focus()); }}><Search className="size-5" /></Button>
              <Button variant="outline" size="icon" aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"} title={darkMode ? "Light mode" : "Dark mode"} onClick={toggleTheme}>{darkMode ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}</Button>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background px-2 text-left outline-none hover:bg-accent sm:px-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold uppercase text-primary-foreground">{firstName[0]}</span>
                  <span className="hidden max-w-32 truncate text-sm font-medium xl:block">{firstName}</span>
                  <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel><span className="block truncate font-semibold">{userName}</span><span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">{userEmail}</span></DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href="/user/profile" />}><UserRound className="size-4" /> My Profile</DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/user/practice" />}><ClipboardList className="size-4" /> Practice Library</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <form action={logoutAction} className="p-1"><button type="submit" className="flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-destructive hover:bg-destructive/10"><LogOut className="size-4" /> Sign out</button></form>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {searchOpen && <div className="relative pb-3 sm:hidden" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setSearchOpen(false); }}>
            <Input ref={mobileSearchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find subjects or pages..." aria-label="Search subjects and pages" onKeyDown={(e) => { if (e.key === "Enter" && searchResults[0]) navigateToSearchResult(searchResults[0].href); }} className="h-10 pr-8" />
            <Button variant="ghost" size="icon-sm" className="absolute right-1 top-1" aria-label="Close search" onClick={() => setSearchOpen(false)}><X className="size-4" /></Button>
            <div className="student-search-popover absolute inset-x-0 top-full z-50 max-h-64 overflow-y-auto rounded-xl p-1.5">
              {searchResults.length ? searchResults.map((r) => <button key={r.href} type="button" onClick={() => navigateToSearchResult(r.href)} className="flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"><span>{r.label}</span><span className="text-[10px] text-muted-foreground">{r.type}</span></button>) : <p className="p-3 text-sm text-muted-foreground">No matching results.</p>}
            </div>
          </div>}
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-3 pb-28 pt-4 sm:px-5 sm:pt-6 lg:pb-10 xl:px-8">
          {children}
        </main>
      </div>

      <nav aria-label="Bottom navigation" className="student-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t px-1 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl lg:hidden">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = isActive(pathname, href);
          return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex min-h-13 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
            <span className={cn("flex size-8 items-center justify-center rounded-lg", active && "bg-primary text-primary-foreground")}><Icon className="size-4.5" /></span>
            <span className="truncate">{label === "Chapter Preparation" ? "Learn" : label === "Practice Library" ? "Practice" : label === "My Profile" ? "Profile" : "Home"}</span>
          </Link>;
        })}
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[min(88vw,320px)] gap-0 p-0">
          <SheetHeader className="border-b px-5 py-5">
            <SheetTitle><StudentBrand /></SheetTitle>
            <SheetDescription className="sr-only">Student navigation menu</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-auto px-4 py-5">{navList(true)}
            <p className="mt-7 mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Your subjects</p>
            {subjects.map((s) => <Link key={s.id} onClick={() => setMenuOpen(false)} href={`/user/chapter-preparation/subjects/${s.id}`} className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">{s.name}</Link>)}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
