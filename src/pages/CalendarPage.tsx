import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { TaskItem } from "@/components/tasks/TaskItem";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { tasks, toggleTask, toggleStar, deleteTask } = useTasks();

  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];

    // Add empty slots for days before the first day
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= lastDate; i++) {
      days.push(i);
    }

    return days;
  }, [currentDate]);

  const tasksForSelectedDate = useMemo(() => {
    const dateStr = selectedDate.toISOString().split("T")[0];
    return tasks.filter((task) => task.dueDate === dateStr);
  }, [tasks, selectedDate]);

  const hasTasksOnDay = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStr = new Date(year, month, day).toISOString().split("T")[0];
    return tasks.some((task) => task.dueDate === dateStr);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      currentDate.getFullYear() === selectedDate.getFullYear()
    );
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    setSelectedDate(new Date(year, month, day));
  };

  return (
    <MobileLayout>
      <div className="px-5 py-6 space-y-5">
        <PageHeader title="Calendar" />

        {/* Calendar header */}
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h3 className="font-semibold">{monthYear}</h3>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map((day, index) => (
              <button
                key={index}
                onClick={() => day && handleDayClick(day)}
                disabled={!day}
                className={cn(
                  "aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all touch-manipulation relative",
                  !day && "invisible",
                  day && isSelected(day) && "bg-primary text-primary-foreground",
                  day && !isSelected(day) && isToday(day) && "bg-accent text-accent-foreground",
                  day && !isSelected(day) && !isToday(day) && "hover:bg-muted"
                )}
              >
                {day}
                {day && hasTasksOnDay(day) && !isSelected(day) && (
                  <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tasks for selected date */}
        <section>
          <h3 className="font-semibold mb-3">
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </h3>
          {tasksForSelectedDate.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No tasks scheduled
            </p>
          ) : (
            <div className="space-y-3">
              {tasksForSelectedDate.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  onToggleStar={toggleStar}
                  onDelete={deleteTask}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </MobileLayout>
  );
};

export default CalendarPage;
