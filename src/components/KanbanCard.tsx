import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Task } from "@/lib/types";

const priorityColors: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-primary",
  low: "bg-muted-foreground",
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const isOverdue = (deadline: string) => new Date(deadline) < new Date();

interface KanbanCardProps {
  task: Task;
  onClick: () => void;
}

const KanbanCard = ({ task, onClick }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const overdue = isOverdue(task.deadline);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${
        isDragging ? "opacity-50 shadow-lg" : ""
      } ${overdue ? "border-l-[3px] border-l-destructive" : "border-border"}`}
    >
      {/* Priority dot + title */}
      <div className="flex items-start gap-2 mb-2">
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
            priorityColors[task.priority] || priorityColors.low
          }`}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug truncate">
            {task.episodeTitle}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {task.showName}
          </p>
        </div>
      </div>

      {/* Footer: assignee + deadline */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[9px] bg-secondary text-secondary-foreground">
              {getInitials(task.assignee.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate max-w-[90px]">
            {task.assignee.name}
          </span>
        </div>
        <span
          className={`text-[11px] ${
            overdue ? "text-destructive font-medium" : "text-muted-foreground"
          }`}
        >
          {new Date(task.deadline).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </div>
  );
};

export default KanbanCard;
