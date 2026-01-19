import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProgressCard } from "@/components/home/ProgressCard";
import { QuickActions } from "@/components/home/QuickActions";
import { AddTaskSheet } from "@/components/tasks/AddTaskSheet";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/hooks/useTasks";
import { useFinance } from "@/hooks/useFinance";
import { TransactionItem } from "@/components/finance/TransactionItem";
import { formatInTimeZone } from "date-fns-tz";

const TIMEZONE = 'Australia/Sydney';

const ymdToUtcMs = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

const Index = () => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { tasks, addTask, toggleTask, toggleStar, deleteTask, completedCount, starredCount, totalCount } = useTasks();
  const { transactions } = useFinance();

  
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Get the most immediate planned transactions that fall within the next 7 days
  // (If multiple planned items share the same next due date, show them all)
  const upcomingTransactions = useMemo(() => {
    if (!transactions) return [];

    const planned = transactions.filter((t) => t.is_planned);
    if (planned.length === 0) return [];

    // Compute "today" in the app's budgeting timezone (stable regardless of user's device timezone)
    const todayYmd = formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");
    const todayMs = ymdToUtcMs(todayYmd);

    const inNext7Days = planned.filter((t) => {
      const txMs = ymdToUtcMs(t.date);
      const diffDays = Math.floor((txMs - todayMs) / 86400000);
      return diffDays >= 0 && diffDays < 7;
    });

    if (inNext7Days.length === 0) return [];

    const nextDate = inNext7Days.reduce(
      (min, t) => (t.date < min ? t.date : min),
      inNext7Days[0].date
    );

    return inNext7Days
      .filter((t) => t.date === nextDate)
      .sort((a, b) => a.description.localeCompare(b.description));
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
