import Link from "next/link";
import {
  ArrowRight,
  BookMarked,
  BookOpenCheck,
  Calculator,
  ChevronRight,
  ClipboardCheck,
  FlaskConical,
  Globe2,
  GraduationCap,
  Languages,
  Lightbulb,
  Monitor,
  Play,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { StudentDailyGoals } from "@/components/app/StudentDailyGoals";
import { cn } from "@/lib/utils";

type Subject = { id: string; name: string };
type Practice = { id: string; title: string; kind: string; subjectId: string; subjectName: string };

export type StudentDashboardData = {
  userId: string;
  userName: string;
  className: string | null;
  subjects: Subject[];
  lessonCount: number;
  exerciseCount: number;
  practices: Practice[];
};

function subjectIcon(name: string): LucideIcon {
  if (/mathematics|math|গণিত/i.test(name)) return Calculator;
  if (/science|বিজ্ঞান/i.test(name)) return FlaskConical;
  if (/digital|ict|computer|প্রযুক্তি/i.test(name)) return Monitor;
  if (/social|geograph|ইতিহাস|সমাজ/i.test(name)) return Globe2;
  if (/বাংলা|bangla|bengali/i.test(name)) return Languages;
  return BookOpenCheck;
}

function sectionLabel(kind: string) {
  return kind.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function StudentDashboardHome({ data }: { data: StudentDashboardData }) {
  const firstName = data.userName.trim().split(/\s+/)[0] || "Student";
  const featured = data.practices[0];
  const featuredHref = featured
    ? `/user/chapter-preparation/subjects/${featured.subjectId}/${featured.kind}?recordId=${encodeURIComponent(featured.id)}&page=1`
    : data.subjects[0] ? `/user/chapter-preparation/subjects/${data.subjects[0].id}` : "/user/chapter-preparation";

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="text-xs font-medium text-muted-foreground">STUDENT DASHBOARD</p><h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">Your learning space</h1></div>
        {data.className && <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold">{data.className}</span>}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_290px]">
        <section className="student-hero relative isolate flex min-h-[255px] overflow-hidden rounded-[24px] border border-primary p-5 shadow-lg sm:min-h-[280px] sm:p-7 lg:p-8">
          <div className="relative z-10 max-w-[65%] sm:max-w-[62%]">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary px-2.5 py-1 text-[11px] font-semibold text-[color:var(--student-hero-ink)]"><Sparkles className="size-3" /> Your classroom, reimagined</span>
            <h2 className="max-w-lg text-[clamp(1.55rem,3.2vw,2.5rem)] leading-tight font-extrabold tracking-tight">Welcome back, <span className="text-[var(--primary)]">{firstName}!</span></h2>
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-[color:var(--student-hero-ink)] opacity-85 sm:text-sm">Explore your subjects, practice English, and build your knowledge one lesson at a time.</p>
            <Link href="/user/chapter-preparation" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5 sm:text-sm"><Play className="size-4 fill-current" /> Continue Learning <ArrowRight className="size-4" /></Link>
          </div>
          <div className="pointer-events-none absolute right-[6%] bottom-[13%] hidden w-[32%] min-w-[160px] max-w-[260px] sm:block" aria-hidden="true">
            <div className="relative aspect-square">
              <div className="absolute top-[1%] left-[36%] flex size-16 items-center justify-center rounded-full border border-primary bg-background text-primary shadow-xl sm:size-20"><Lightbulb className="size-9 sm:size-10" /></div>
              <div className="absolute bottom-[12%] left-[6%] h-12 w-[80%] -rotate-6 rounded-xl border-2 border-primary bg-[var(--student-surface)] shadow-xl" />
              <div className="absolute bottom-[28%] left-[14%] h-12 w-[80%] rotate-6 rounded-xl border-2 border-white bg-primary shadow-xl" />
              <div className="absolute bottom-[49%] left-[13%] flex h-12 w-[84%] -rotate-3 items-center justify-center rounded-xl border-2 border-primary bg-[var(--student-surface)] text-primary shadow-xl"><BookOpenCheck className="size-9" /></div>
            </div>
          </div>
          <div className="pointer-events-none absolute right-3 bottom-9 flex size-24 items-center justify-center rounded-full border border-primary bg-primary/15 text-primary sm:hidden" aria-hidden="true"><GraduationCap className="size-12" /></div>
        </section>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 xl:grid-cols-1">
          {[
            { label: "Subjects", number: data.subjects.length, icon: BookMarked },
            { label: "Lessons", number: data.lessonCount, icon: BookOpenCheck },
            { label: "Practice Sets", number: data.exerciseCount, icon: ClipboardCheck },
          ].map(({ label, number, icon: Icon }) => (
            <div key={label} className="student-panel flex min-w-0 flex-col items-center justify-center rounded-2xl px-2 py-4 text-center sm:flex-row sm:gap-4 sm:px-4 xl:justify-start xl:text-left">
              <span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground sm:mb-0 sm:size-11"><Icon className="size-5" /></span>
              <div className="min-w-0"><p className="text-xl font-extrabold tabular-nums sm:text-2xl">{number}</p><p className="text-[11px] leading-4 text-muted-foreground sm:text-xs">{label}</p></div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_290px]">
        <div className="min-w-0 space-y-5">
          <section className="student-panel rounded-2xl p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><BookOpenCheck className="size-5 text-primary" /><h2 className="font-bold sm:text-lg">My Subjects</h2></div><Link href="/user/chapter-preparation" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">View All <ArrowRight className="size-3.5" /></Link></div>
            {data.subjects.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                {data.subjects.map((subject) => {
                  const Icon = subjectIcon(subject.name);
                  return <Link key={subject.id} href={`/user/chapter-preparation/subjects/${subject.id}`} className="student-subject group flex min-h-28 min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-background p-2.5 text-center transition-all sm:min-h-32" title={subject.name}>
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><Icon className="size-5" /></span>
                    <span className="line-clamp-2 text-xs font-semibold leading-5 group-hover:text-primary sm:text-sm">{subject.name}</span>
                  </Link>;
                })}
              </div>
            ) : <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No published subjects are assigned to your class yet.</div>}
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="student-panel rounded-2xl p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2"><Play className="size-4.5 text-primary" /><h2 className="font-bold">Featured Practice</h2></div>
              <div className="flex min-h-36 flex-col justify-between rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-3"><span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BookMarked className="size-7" /></span>
                  <div className="min-w-0"><p className="text-xs text-muted-foreground">{featured?.subjectName || "Chapter Preparation"}</p><p className="mt-1 line-clamp-2 text-sm font-bold">{featured?.title || data.subjects[0]?.name || "Browse your lessons"}</p></div>
                </div>
                <Link href={featuredHref} className="mt-3 inline-flex min-h-10 w-fit items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground">Open Practice <ArrowRight className="size-3.5" /></Link>
              </div>
            </section>
            <section className="student-panel rounded-2xl p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ClipboardCheck className="size-4.5 text-primary" /><h2 className="font-bold">Available Practice</h2></div><Link className="text-xs font-semibold text-primary" href="/user/practice">View All <ArrowRight className="inline size-3" /></Link></div>
              {data.practices.length ? <div className="divide-y divide-border">
                {data.practices.slice(0, 4).map((practice) => <Link key={practice.id} href={`/user/chapter-preparation/subjects/${practice.subjectId}/${practice.kind}?recordId=${encodeURIComponent(practice.id)}&page=1`} className="group flex min-h-12 items-center gap-3 py-2 text-sm hover:text-primary"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><ChevronRight className="size-4" /></span><span className="min-w-0 flex-1 truncate">{practice.title}</span><span className="hidden max-w-24 truncate text-[10px] text-muted-foreground sm:block">{sectionLabel(practice.kind)}</span><ArrowRight className="size-4 shrink-0" /></Link>)}
              </div> : <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Exercises appear here when they are added by your teacher.</div>}
            </section>
          </div>
        </div>
        <aside className="space-y-4"><StudentDailyGoals userId={data.userId} /></aside>
      </div>
    </div>
  );
}
