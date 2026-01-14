import { useState, useMemo } from "react";
import { FinanceLayout } from "@/components/layout/FinanceLayout";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "@/components/finance/MoneyDisplay";
import { TransactionItem } from "@/components/finance/TransactionItem";
import { useFinance } from "@/hooks/useFinance";
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  getDay,
  startOfWeek,
  endOfWeek
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FinanceCalendarPage() {
  const { transactions, currentCycle } = useFinance();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Group transactions by date
  const transactionsByDate = useMemo(() => {
    const grouped: Record<string, typeof transactions> = {};
    transactions.forEach(t => {
      const dateKey = t.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(t);
    });
    return grouped;
  }, [transactions]);

  // Get daily totals
  const dailyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.entries(transactionsByDate).forEach(([date, txns]) => {
      totals[date] = txns.reduce((sum, t) => sum + t.amount, 0);
    });
    return totals;
  }, [transactionsByDate]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Weekly totals for the selected date's week
  const weeklyTotal = useMemo(() => {
    if (!selectedDate) return 0;
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
    
    return transactions
      .filter(t => {
        const date = parseISO(t.date);
        return date >= weekStart && date <= weekEnd;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [selectedDate, transactions]);

  // Monthly total
  const monthlyTotal = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    return transactions
      .filter(t => {
        const date = parseISO(t.date);
        return date >= monthStart && date <= monthEnd;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonth, transactions]);

  const selectedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const selectedTransactions = selectedDateKey ? transactionsByDate[selectedDateKey] || [] : [];

  return (
    <FinanceLayout>
      <div className="px-5 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Calendar</h1>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="font-medium min-w-[120px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Monthly Summary */}
        <div className="glass-card rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Monthly Total</p>
            <MoneyDisplay amount={monthlyTotal} size="lg" />
          </div>
          <CalendarIcon className="w-6 h-6 text-muted-foreground" />
        </div>

        {/* Calendar Grid */}
        <div className="glass-card rounded-xl p-3">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs text-muted-foreground py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayTotal = dailyTotals[dateKey] || 0;
              const hasTransactions = !!transactionsByDate[dateKey];
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "aspect-square p-1 rounded-lg flex flex-col items-center justify-center transition-all text-sm",
                    !isCurrentMonth && "opacity-30",
                    isSelected && "bg-primary text-primary-foreground",
                    !isSelected && isToday && "ring-1 ring-primary",
                    !isSelected && hasTransactions && "bg-secondary",
                    !isSelected && "hover:bg-secondary/50"
                  )}
                >
                  <span className={cn(
                    "text-xs font-medium",
                    isSelected && "text-primary-foreground"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {hasTransactions && (
                    <span className={cn(
                      "text-[10px] mt-0.5 font-medium",
                      isSelected 
                        ? "text-primary-foreground/80"
                        : dayTotal >= 0 
                          ? "metric-positive" 
                          : "metric-negative"
                    )}>
                      {dayTotal >= 0 ? '+' : ''}{Math.abs(dayTotal).toFixed(0)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details */}
        {selectedDate && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                {format(selectedDate, 'EEEE, MMMM d')}
              </h2>
              {selectedTransactions.length > 0 && (
                <MoneyDisplay 
                  amount={dailyTotals[selectedDateKey!] || 0} 
                  size="sm" 
                />
              )}
            </div>

            {/* Weekly context */}
            <div className="p-3 rounded-xl bg-secondary/50 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Week total</span>
              <MoneyDisplay amount={weeklyTotal} size="sm" />
            </div>

            {/* Transactions */}
            {selectedTransactions.length > 0 ? (
              <div className="glass-card rounded-xl divide-y divide-border/50">
                {selectedTransactions.map((t) => (
                  <TransactionItem key={t.id} transaction={t} />
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-xl p-6 text-center">
                <p className="text-muted-foreground">No transactions on this date</p>
              </div>
            )}
          </div>
        )}

        {!selectedDate && (
          <div className="glass-card rounded-xl p-6 text-center">
            <CalendarIcon className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Select a date to view transactions</p>
          </div>
        )}
      </div>
    </FinanceLayout>
  );
}
