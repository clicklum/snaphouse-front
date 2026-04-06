import { useEffect, useState, useMemo, useCallback } from "react";
import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { apiFetch } from "@/lib/api";
import { KANBAN_STAGES, type Task, type Stage } from "@/lib/types";
import KanbanColumn from "@/components/KanbanColumn";
import KanbanCard from "@/components/KanbanCard";
import TaskDetailDrawer from "@/components/TaskDetailDrawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KanbanColumnSkeleton } from "@/components/PageSkeletons";
import { TasksEmpty, PageError } from "@/components/PageStates";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FilterOption { id: string; name: string; }

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useIsMobile();

  // Mobile column selector
  const [mobileStageIdx, setMobileStageIdx] = useState(0);

  const [showFilter, setShowFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [myTasks, setMyTasks] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(() => {
    setLoading(true); setError(null);
    apiFetch<Task[]>("/api/tasks")
      .then(setTasks)
      .catch((e) => setError(e.message || "Failed to load tasks"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const shows = useMemo<FilterOption[]>(() => {
    const map = new Map<string, string>();
    tasks.forEach((t) => map.set(t.showId, t.showName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [tasks]);

  const assignees = useMemo<FilterOption[]>(() => {
    const map = new Map<string, string>();
    tasks.forEach((t) => map.set(t.assignee.id, t.assignee.name));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [tasks]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (showFilter !== "all") list = list.filter((t) => t.showId === showFilter);
    if (assigneeFilter !== "all") list = list.filter((t) => t.assignee.id === assigneeFilter);
    if (myTasks) list = list.filter((t) => t.assignee.id === "me");
    return list;
  }, [tasks, showFilter, assigneeFilter, myTasks]);

  const tasksByStage = useMemo(() => {
    const map: Record<Stage, Task[]> = { research: [], editing: [], qa_review: [], pcloud_verify: [], done: [] };
    filtered.forEach((t) => { if (map[t.stage]) map[t.stage].push(t); });
    return map;
  }, [filtered]);

  const findTaskStage = (taskId: string): Stage | null => {
    const task = tasks.find((t) => t.id === taskId);
    return task ? task.stage : null;
  };

  const handleDragStart = (event: DragStartEvent) => { setActiveTask(tasks.find((t) => t.id === event.active.id) || null); };
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    const activeStage = findTaskStage(activeId);
    const overStage = KANBAN_STAGES.find((s) => s.id === overId) ? (overId as Stage) : findTaskStage(overId);
    if (!activeStage || !overStage || activeStage === overStage) return;
    setTasks((prev) => prev.map((t) => (t.id === activeId ? { ...t, stage: overStage } : t)));
  };
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    const task = tasks.find((t) => t.id === activeId);
    if (!task) return;
    const isColumn = KANBAN_STAGES.some((s) => s.id === overId);
    if (!isColumn && findTaskStage(overId) === task.stage) {
      const columnTasks = tasks.filter((t) => t.stage === task.stage);
      const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
      const newIndex = columnTasks.findIndex((t) => t.id === overId);
      if (oldIndex !== newIndex) {
        const reordered = arrayMove(columnTasks, oldIndex, newIndex);
        setTasks((prev) => { const others = prev.filter((t) => t.stage !== task.stage); return [...others, ...reordered]; });
      }
    }
    try { await apiFetch(`/api/tasks/${activeId}/stage`, { method: "PATCH", body: JSON.stringify({ stage: task.stage }) }); }
    catch { toast.error("Failed to update task stage"); fetchTasks(); }
  };

  const handleCardClick = (task: Task) => { setDetailTask(task); setDrawerOpen(true); };

  return (
    <div className="space-y-4 sm:space-y-6 h-full flex flex-col">
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold">Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isMobile ? "Swipe between columns" : "Drag cards between columns to update stage"}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
        {!isMobile && (
          <div className="relative w-full max-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-9 h-9" disabled />
          </div>
        )}
        <Select value={showFilter} onValueChange={setShowFilter}>
          <SelectTrigger className="w-[140px] sm:w-[180px] h-9"><SelectValue placeholder="All Shows" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shows</SelectItem>
            {shows.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {!isMobile && (
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="All Assignees" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {assignees.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Button variant={myTasks ? "default" : "outline"} size="sm" className="h-9 gap-1.5" onClick={() => setMyTasks(!myTasks)}>
          <User className="h-3.5 w-3.5" />My Tasks
        </Button>
      </div>

      {/* Mobile column pills */}
      {isMobile && !loading && !error && tasks.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {KANBAN_STAGES.map((stage, idx) => (
            <button
              key={stage.id}
              onClick={() => setMobileStageIdx(idx)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                mobileStageIdx === idx
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {stage.title} ({(tasksByStage[stage.id] || []).length})
            </button>
          ))}
        </div>
      )}

      {/* Board */}
      {error ? (
        <PageError message={error} onRetry={fetchTasks} />
      ) : loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {(isMobile ? [KANBAN_STAGES[0]] : KANBAN_STAGES).map((stage) => (
            <KanbanColumnSkeleton key={stage.id} cards={2} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <TasksEmpty />
      ) : isMobile ? (
        /* Mobile: show one column at a time */
        <div className="flex-1 min-h-0">
          <KanbanColumn
            key={KANBAN_STAGES[mobileStageIdx].id}
            id={KANBAN_STAGES[mobileStageIdx].id}
            title={KANBAN_STAGES[mobileStageIdx].title}
            tasks={tasksByStage[KANBAN_STAGES[mobileStageIdx].id] || []}
            onCardClick={handleCardClick}
          />
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
            {KANBAN_STAGES.map((stage) => (
              <KanbanColumn key={stage.id} id={stage.id} title={stage.title} tasks={tasksByStage[stage.id] || []} onCardClick={handleCardClick} />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? <div className="rotate-2"><KanbanCard task={activeTask} onClick={() => {}} /></div> : null}
          </DragOverlay>
        </DndContext>
      )}

      <TaskDetailDrawer taskId={detailTask?.id || null} open={drawerOpen} onOpenChange={setDrawerOpen} onUpdated={fetchTasks} />
    </div>
  );
};

export default Tasks;
