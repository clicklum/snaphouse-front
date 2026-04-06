import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import KanbanCard from "./KanbanCard";
import type { Task } from "@/lib/types";

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  onCardClick: (task: Task) => void;
}

const KanbanColumn = ({ id, title, tasks, onCardClick }: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex flex-col min-w-[280px] w-full md:w-[280px] shrink-0">
      <div className="flex items-center justify-between px-3 py-2 mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {tasks.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 p-2 rounded-lg transition-colors min-h-[200px] ${
          isOver ? "bg-accent/50" : "bg-muted/30"
        }`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} onClick={() => onCardClick(task)} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

export default KanbanColumn;
