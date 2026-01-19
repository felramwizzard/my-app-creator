import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProgressCard } from "@/components/home/ProgressCard";
import { QuickActions } from "@/components/home/QuickActions";
import { TaskItem } from "@/components/tasks/TaskItem";
import { AddTaskSheet } from "@/components/tasks/AddTaskSheet";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/hooks/useTasks";
import { useFinance } from "@/hooks/useFinance";
import { TransactionItem } from "@/components/finance/TransactionItem";
import { addDays, startOfDay, differenceInDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const TIMEZONE = 'Australia/Sydney';

const Index = () => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { tasks, addTask, toggleTask, toggleStar, deleteTask, completedCount, starredCount, totalCount } = useTasks();
  const { transactions } = useFinance();

  const upcomingTasks = tasks.filter((t) => !t.completed).slice(0, 3);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Get planned transactions falling in the next 7 days
  const upcomingTransactions = useMemo(() => {
    if (!transactions) return [];
    
    const now = toZonedTime(new Date(), TIMEZONE);
    const todayStart = startOfDay(now);
    
    return transactions
      .filter(t => {
        // Only show planned transactions
        if (!t.is_planned) return false;
        
        // Parse the date string (YYYY-MM-DD) as local date parts
        const [year, month, day] = t.date.split('-').map(Number);
        const txDate = new Date(year, month - 1, day);
        
        // Check if within next 7 days (today to today+6)
        const daysDiff = differenceInDays(txDate, todayStart);
        return daysDiff >= 0 && daysDiff < 7;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [transactions]);

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

        {upcomingTransactions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Upcoming Transactions</h2>
              <Button variant="ghost" size="sm" className="text-primary" asChild>
                <a href="/transactions">View all</a>
              </Button>
            </div>
            <div className="space-y-2">
              {upcomingTransactions.map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                  onClick={() => {}}
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
