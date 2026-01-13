import { useState } from "react";
import { Check, Circle, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Task } from "@/types/task";

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onToggleStar: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TaskItem({ task, onToggle, onToggleStar, onDelete }: TaskItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => onDelete(task.id), 200);
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-3 p-4 bg-card rounded-xl shadow-card transition-all duration-200",
        isDeleting && "opacity-0 scale-95 translate-x-4",
        task.completed && "opacity-60"
      )}
    >
      <button
        onClick={() => onToggle(task.id)}
        className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 touch-manipulation",
          task.completed
            ? "bg-primary border-primary"
            : "border-muted-foreground/30 hover:border-primary"
        )}
      >
        {task.completed && (
          <Check className="w-3.5 h-3.5 text-primary-foreground animate-check-bounce" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-medium truncate transition-all duration-200",
            task.completed && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </p>
        {task.dueDate && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {task.dueDate}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onToggleStar(task.id)}
          className={cn(
            "p-2 rounded-lg transition-colors touch-manipulation",
            task.starred
              ? "text-warning"
              : "text-muted-foreground hover:text-warning"
          )}
        >
          <Star className={cn("w-4 h-4", task.starred && "fill-current")} />
        </button>
        <button
          onClick={handleDelete}
          className="p-2 rounded-lg text-muted-foreground hover:text-destructive transition-colors touch-manipulation"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile: always show star */}
      <button
        onClick={() => onToggleStar(task.id)}
        className={cn(
          "p-2 rounded-lg transition-colors touch-manipulation md:hidden",
          task.starred
            ? "text-warning"
            : "text-muted-foreground"
        )}
      >
        <Star className={cn("w-4 h-4", task.starred && "fill-current")} />
      </button>
    </div>
  );
}
