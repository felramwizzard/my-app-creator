import { Plus, ListTodo, Calendar, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface QuickActionsProps {
  onAddTask: () => void;
}

const actions = [
  { icon: Plus, label: "Add Task", color: "bg-primary text-primary-foreground", action: "add" },
  { icon: ListTodo, label: "All Tasks", color: "bg-accent text-accent-foreground", path: "/tasks" },
  { icon: Star, label: "Starred", color: "bg-warning/10 text-warning", path: "/tasks?filter=starred" },
  { icon: Calendar, label: "Calendar", color: "bg-secondary text-secondary-foreground", path: "/calendar" },
];

export function QuickActions({ onAddTask }: QuickActionsProps) {
  const navigate = useNavigate();

  const handleClick = (action: typeof actions[0]) => {
    if (action.action === "add") {
      onAddTask();
    } else if (action.path) {
      navigate(action.path);
    }
  };

  return (
    <div className="grid grid-cols-4 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            onClick={() => handleClick(action)}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-200 touch-manipulation active:scale-95",
              action.color
            )}
          >
            <Icon className="w-6 h-6 mb-2" />
            <span className="text-xs font-medium">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}
