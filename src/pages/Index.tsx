import { useState } from "react";
import { Plus } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProgressCard } from "@/components/home/ProgressCard";
import { QuickActions } from "@/components/home/QuickActions";
import { TaskItem } from "@/components/tasks/TaskItem";
import { AddTaskSheet } from "@/components/tasks/AddTaskSheet";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/hooks/useTasks";

const Index = () => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { tasks, addTask, toggleTask, toggleStar, deleteTask, completedCount, starredCount, totalCount } = useTasks();

  const upcomingTasks = tasks.filter((t) => !t.completed).slice(0, 3);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <MobileLayout>
      <div className="px-5 py-6 space-y-6">
        <PageHeader
          title="Good morning! 👋"
          subtitle={today}
        />

        <ProgressCard
          completed={completedCount}
          total={totalCount}
          starred={starredCount}
        />

        <QuickActions onAddTask={() => setIsAddOpen(true)} />

        {upcomingTasks.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Upcoming Tasks</h2>
              <Button variant="ghost" size="sm" className="text-primary" asChild>
                <a href="/tasks">View all</a>
              </Button>
            </div>
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  onToggleStar={toggleStar}
                  onDelete={deleteTask}
                />
              ))}
            </div>
          </section>
        )}
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

export default Index;
