"use client";

import { useEffect, useState } from "react";
import { Check, Circle, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { syncStudentGoals, saveStudentGoal } from "@/app/user/learning-actions";

const TASKS = [
  "Read a lesson",
  "Practice an exercise",
  "Review something new",
] as const;

function getLocalDay() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function StudentDailyGoals({ userId }: { userId: string }) {
  const [today, setToday] = useState("");
  const [tasks, setTasks] = useState<boolean[]>([false, false, false]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [days, setDays] = useState<string[]>([]);
  const tasksKey = `elb-student-goals:${userId}:${today}`;
  const daysKey = `elb-student-study-days:${userId}`;

  useEffect(() => {
    const refresh = () => setToday(getLocalDay());
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);

  useEffect(() => {
    if (!today) return;
    let active = true;
    let localTasks: boolean[] | null = null;
    let localDays: string[] = [];
    setLoaded(false);
    setSyncError(false);
    try {
      const stored = JSON.parse(localStorage.getItem(tasksKey) || "null");
      const storedDays = JSON.parse(localStorage.getItem(daysKey) || "[]");
      if (Array.isArray(stored) && stored.length === TASKS.length) localTasks = stored.map(Boolean);
      if (Array.isArray(storedDays)) localDays = storedDays.filter((value): value is string => typeof value === "string");
    } catch { /* storage unavailable */ }
    setTasks(localTasks ?? [false, false, false]);
    setDays(localDays);
    syncStudentGoals(today, localTasks, localDays).then(result => {
      if (!active) return;
      setTasks(result.tasks);
      setDays(result.days);
      cache(result.tasks, result.days);
    }).catch(() => { if (active) setSyncError(true); }).finally(() => { if (active) setLoaded(true); });
    function cache(nextTasks: boolean[], nextDays: string[]) {
      try { localStorage.setItem(tasksKey, JSON.stringify(nextTasks)); localStorage.setItem(daysKey, JSON.stringify(nextDays)); } catch { /* storage unavailable */ }
    }
    return () => { active = false; };
  }, [tasksKey, daysKey, today]);

  async function toggleTask(index: number) {
    if (saving || !loaded) return;
    setSaving(true);
    setSyncError(false);
    try {
      const result = await saveStudentGoal(today, index, !tasks[index]);
      const updatedDays = result.studied ? [...new Set([...days, today])].sort().slice(-90) : days;
      setTasks(result.tasks);
      setDays(updatedDays);
      try { localStorage.setItem(tasksKey, JSON.stringify(result.tasks)); localStorage.setItem(daysKey, JSON.stringify(updatedDays)); } catch { /* storage unavailable */ }
    } catch { setSyncError(true); } finally { setSaving(false); }
  }

  const completed = tasks.filter(Boolean).length;
  const percent = Math.round(completed / TASKS.length * 100);
  const lastSevenDays = today ? Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    const dayLabel = day.toLocaleDateString("en-US", { weekday: "short" });
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    return { key, dayLabel, studied: days.includes(key) };
  }) : [];

  return (
    <div className="space-y-4">
      <section className="student-panel rounded-2xl p-4 sm:p-5" aria-label="Daily goal checklist">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Target className="size-5" /></span>
            <div><h3 className="text-base font-bold">My Daily Goal</h3><p className="text-xs text-muted-foreground">{completed} of {TASKS.length} complete</p></div>
          </div>
          <span className="flex size-14 shrink-0 items-center justify-center relative rounded-full text-sm font-extrabold tabular-nums" aria-label={`${percent} percent complete`} style={{ background: `conic-gradient(var(--primary) ${percent}%, var(--muted) 0)` }}><span className="flex size-11 items-center justify-center rounded-full bg-card">{percent}%</span></span>
        </div>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} /></div>
        <div className="divide-y divide-border">
          {TASKS.map((task, index) => (
            <label key={task} className="flex min-h-12 cursor-pointer items-center gap-3 py-2 text-sm">
              <input type="checkbox" checked={tasks[index]} onChange={() => toggleTask(index)} className="peer sr-only" disabled={!loaded || saving} />
              <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2", tasks[index] ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground text-transparent")}>{tasks[index] && <Check className="size-3.5" />}</span>
              <span className={cn("flex-1", tasks[index] && "text-muted-foreground line-through")}>{task}</span>
            </label>
          ))}
        </div>
        <p role="status" className="mt-3 text-xs text-muted-foreground">{syncError ? "Could not sync goals. Your existing browser history is preserved; retry after reconnecting." : saving ? "Saving…" : loaded ? "Goals saved to your account." : "Loading your saved goals…"}</p>
      </section>

      <section className="student-panel rounded-2xl p-4 sm:p-5" aria-label="Your study activity">
        <div className="mb-4 flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Zap className="size-5" /></span><div><h3 className="text-base font-bold">Study Activity</h3><p className="text-xs text-muted-foreground">Your recent seven days</p></div></div>
        <div className="grid grid-cols-7 gap-1">
          {lastSevenDays.map((day) => (
            <div key={day.key} className="flex flex-col items-center gap-2">
              <span className={cn("flex size-7 sm:size-8 items-center justify-center rounded-full border", day.studied ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>{day.studied ? <Check className="size-4" /> : <Circle className="size-3.5" />}</span>
              <span className="text-[10px] text-muted-foreground">{day.dayLabel}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">A day is marked when you check a daily goal. Checklist activity is synced with your account.</p>
      </section>
    </div>
  );
}
