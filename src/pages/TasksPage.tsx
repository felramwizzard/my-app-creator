import { useState, useMemo } from "react";
import { Plus, Filter } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { TaskItem } from "@/components/tasks/TaskItem";
import { AddTaskSheet } from "@/components/tasks/AddTaskSheet";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";

type FilterType = "all" | "active" | "completed" | "starred";

const filters: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Done" },
  { value: "starred", label: "Starred" },
];

const TasksPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = (searchParams.get("filter") as FilterType) || "all";
  const [activeFilter, setActiveFilter] = useState<FilterType>(initialFilter);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { tasks, addTask, toggleTask, toggleStar, deleteTask } = useTasks();

  const filteredTasks = useMemo(() => {
    switch (activeFilter) {
      case "active":
        return tasks.filter((t) => !t.completed);
      case "completed":
        return tasks.filter((t) => t.completed);
      case "starred":
        return tasks.filter((t) => t.starred);
      default:
        return tasks;
    }
  }, [tasks, activeFilter]);

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    if (filter === "all") {
      searchParams.delete("filter");
    } else {
      searchParams.set("filter", filter);
    }
    setSearchParams(searchParams);
  };

  return (
    <MobileLayout>
      <div className="px-5 py-6 space-y-5">
        <PageHeader
          title="Tasks"
          subtitle={`${filteredTasks.length} ${activeFilter === "all" ? "total" : activeFilter}`}
        />

        {/* Filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => handleFilterChange(filter.value)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all touch-manipulation",
                activeFilter === filter.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Task list */}
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No tasks found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsAddOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add your first task
              </Button>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onToggleStar={toggleStar}
                onDelete={deleteTask}
              />
            ))
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <Button
        variant="fab"
        size="fab"
        className="fixed right-5 bottom-28 z-30"
        onClick={() => setIsAddOpen(true)}
      >
        <Plus className="w-6 h-6" />
      </Button>

      <AddTaskSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={addTask}
      />
    </MobileLayout>
  );
};

export default TasksPage;
