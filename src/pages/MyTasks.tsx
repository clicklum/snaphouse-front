import { useEffect, useState, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import { getUserName } from "@/lib/auth";
import type { Task } from "@/lib/types";
import TaskDetailDrawer from "@/components/TaskDetailDrawer";
import KanbanCard from "@/components/KanbanCard";
import { Badge } from "@/components/ui/badge";
import { PageError, MyTasksEmpty } from "@/components/PageStates";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { differenceInDays, differenceInHours, differenceInMinutes, isPast, isToday, parseISO, isBefore, addDays } from "date-fns";

/* ── helpers ── */
const typeBadgeColor: Record<string, string> = {
  Research: "bg-blue-500/15 text-blue-400",
  Edit: "bg-amber-500/15 text-amber-400",
  QA: "bg-purple-500/15 text-purple-400",
  Verify: "bg-cyan-500/15 text-cyan-400",
};

const LiveCountdown = ({ deadline }: { deadline: string }) => {
  const [, setTick] = useState(0);
  useEffect(() => { const i = setInterval(() => setTick(t => t + 1), 60_000); return () => clearInterval(i); }, []);
  const dl = parseISO(deadline);
  if (isPast(dl)) return <span className="text-destructive font-medium text-xs">Overdue</span>;
  const hrs = differenceInHours(dl, new Date());
  const mins = differenceInMinutes(dl, new Date()) % 60;
  if (hrs < 1) return <span className="text-destructive text-xs font-medium">{mins}m left</span>;
  if (hrs < 6) return <span className="text-amber-400 text-xs font-medium">{hrs}h {mins}m left</span>;
  return <span className="text-muted-foreground text-xs">{hrs}h left</span>;
};

interface MyTask extends Task {
  type?: string;
  completedAt?: string;
  qaScore?: number;
  escalated?: boolean;
  showColor?: string;
}

const MyTasks = () => {
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [showFilter, setShowFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const userName = getUserName() || "there";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get<MyTask[]>("/tasks/my")
      .then(setTasks)
      .catch((e) => setError(e.message || "Failed to load your tasks"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  /* derived filter options */
  const shows = useMemo(() => {
    const m = new Map<string, string>();
    tasks.forEach(t => m.set(t.showId, t.showName));
    return Array.from(m, ([id, name]) => ({ id, name }));
  }, [tasks]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (showFilter !== "all") list = list.filter(t => t.showId === showFilter);
    if (typeFilter !== "all") list = list.filter(t => (t.type || "") === typeFilter);
    return list;
  }, [tasks, showFilter, typeFilter]);

  const active = filtered.filter(t => t.stage !== "done");
  const completed = filtered.filter(t => t.stage === "done");

  const overdue = active.filter(t => isPast(parseISO(t.deadline)));
  const dueToday = active.filter(t => !isPast(parseISO(t.deadline)) && isToday(parseISO(t.deadline)));
  const thisWeek = active.filter(t => {
    const dl = parseISO(t.deadline);
    return !isPast(dl) && !isToday(dl) && isBefore(dl, addDays(new Date(), 7));
  });
  const later = active.filter(t => {
    const dl = parseISO(t.deadline);
    return !isPast(dl) && !isToday(dl) && !isBefore(dl, addDays(new Date(), 7));
  });

  const completedRecent = completed.filter(t =>
    t.completedAt && isBefore(addDays(new Date(), -14), parseISO(t.completedAt))
  );

  /* stats */
  const stats = [
    { label: "Due today", value: dueToday.length, icon: Clock, color: "text-amber-400" },
    { label: "Overdue", value: overdue.length, icon: Flame, color: "text-destructive" },
    { label: "In progress", value: active.length, icon: AlertTriangle, color: "text-primary" },
    { label: "Completed this week", value: completed.length, icon: CheckCircle2, color: "text-emerald-400" },
  ];

  const openCard = (task: MyTask) => { setDrawerTaskId(task.id); setDrawerOpen(true); };

  /* ── card component ── */
  const TaskCard = ({ task, showBorder }: { task: MyTask; showBorder?: string }) => (
    <button
      onClick={() => openCard(task)}
      className={cn(
        "w-full text-left rounded-lg border p-3 space-y-2 transition-colors hover:bg-muted/50",
        showBorder,
      )}
    >
      <div className="flex items-center gap-2">
        {task.showColor && <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: task.showColor }} />}
        <span className="text-sm font-medium truncate flex-1">{task.episodeTitle}</span>
        {task.type && (
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", typeBadgeColor[task.type] || "bg-muted text-muted-foreground")}>{task.type}</span>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{task.showName}</span>
        <LiveCountdown deadline={task.deadline} />
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] capitalize">{task.stage.replace("_", " ")}</Badge>
        {task.escalated && <Badge variant="destructive" className="text-[10px]">Escalated</Badge>}
      </div>
    </button>
  );

  const CompletedCard = ({ task }: { task: MyTask }) => (
    <button onClick={() => openCard(task)} className="w-full text-left rounded-lg border p-3 space-y-1 transition-colors hover:bg-muted/50 opacity-70">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
        <span className="text-sm font-medium truncate flex-1">{task.episodeTitle}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{task.showName}</span>
        <span>{task.completedAt ? parseISO(task.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</span>
      </div>
      {task.qaScore !== undefined && <p className="text-[10px] text-muted-foreground">QA Score: {task.qaScore}/10</p>}
    </button>
  );

  /* ── Group this-week tasks by show ── */
  const thisWeekByShow = useMemo(() => {
    const map = new Map<string, MyTask[]>();
    [...thisWeek, ...later].sort((a, b) => parseISO(a.deadline).getTime() - parseISO(b.deadline).getTime()).forEach(t => {
      const arr = map.get(t.showName) || [];
      arr.push(t);
      map.set(t.showName, arr);
    });
    return Array.from(map);
  }, [thisWeek, later]);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="font-display text-2xl font-bold">Your tasks, {userName.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground mt-1">{today}</p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-4 space-y-1">
            <div className="flex items-center gap-2">
              <s.icon className={cn("h-4 w-4", s.color)} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className={cn("text-2xl font-bold font-display", s.value > 0 && s.label === "Overdue" ? "text-destructive" : "")}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3">
        <Select value={showFilter} onValueChange={setShowFilter}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="All Shows" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shows</SelectItem>
            {shows.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {["Research", "Edit", "QA", "Verify"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <PageError message={error} onRetry={fetchTasks} />
      ) : loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 w-full rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Overdue ── */}
          {overdue.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Flame className="h-4 w-4 text-destructive" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-destructive">Overdue</h2>
                <Badge variant="destructive" className="text-[10px]">{overdue.length}</Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {overdue.map(t => <TaskCard key={t.id} task={t} showBorder="border-destructive/40" />)}
              </div>
            </section>
          )}

          {/* ── Due Today ── */}
          {dueToday.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-400">Due Today</h2>
                <Badge className="bg-amber-500/15 text-amber-400 text-[10px] border-0">{dueToday.length}</Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {dueToday.map(t => <TaskCard key={t.id} task={t} showBorder="border-amber-500/30" />)}
              </div>
            </section>
          )}

          {/* ── This Week ── */}
          {thisWeekByShow.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">This Week & Later</h2>
              <div className="space-y-4">
                {thisWeekByShow.map(([showName, showTasks]) => (
                  <div key={showName}>
                    <p className="text-xs font-medium text-muted-foreground mb-2">{showName}</p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {showTasks.map(t => <TaskCard key={t.id} task={t} />)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Completed ── */}
          {completedRecent.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 group">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Completed</h2>
                <Badge variant="secondary" className="text-[10px]">{completedRecent.length}</Badge>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {completedRecent.map(t => <CompletedCard key={t.id} task={t} />)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {active.length === 0 && completedRecent.length === 0 && (
            <MyTasksEmpty />
          )}
        </div>
      )}

      <TaskDetailDrawer taskId={drawerTaskId} open={drawerOpen} onOpenChange={setDrawerOpen} onUpdated={fetchTasks} />
    </div>
  );
};

export default MyTasks;
