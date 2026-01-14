import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FinanceLayout } from "@/components/layout/FinanceLayout";
import { MoneyDisplay } from "@/components/finance/MoneyDisplay";
import { ProgressRing } from "@/components/finance/ProgressRing";
import { BudgetCard } from "@/components/finance/BudgetCard";
import { TransactionItem } from "@/components/finance/TransactionItem";
import { useFinance } from "@/hooks/useFinance";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO } from "date-fns";
import { CalendarDays, TrendingUp, Target, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { currentCycle, metrics, transactions, isLoading } = useFinance();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && user && !isLoading && !currentCycle) {
      navigate("/setup");
    }
  }, [user, authLoading, currentCycle, isLoading, navigate]);

  if (authLoading || isLoading || !currentCycle || !metrics) {
    return (
      <FinanceLayout>
        <div className="px-5 py-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </FinanceLayout>
    );
  }

  const recentTransactions = transactions.slice(0, 5);
  const cycleProgress = currentCycle.starting_balance > 0 
    ? (metrics.totalSpend / currentCycle.starting_balance) * 100 
    : 0;

  return (
    <FinanceLayout>
      <div className="px-5 py-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
          <h1 className="text-2xl font-display font-bold">Dashboard</h1>
        </div>

        {/* Main Balance Card */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Expected End Balance</p>
              <MoneyDisplay 
                amount={metrics.expectedEndBalance} 
                size="xl" 
                colorize={false}
              />
            </div>
            <ProgressRing 
              value={metrics.totalSpend} 
              max={currentCycle.starting_balance + (currentCycle.income_actual ?? currentCycle.income_planned)}
              size={80}
              strokeWidth={6}
            >
              <div className="text-center">
                <span className="text-lg font-bold">{metrics.daysRemaining}</span>
                <p className="text-[10px] text-muted-foreground">days left</p>
              </div>
            </ProgressRing>
          </div>

          {/* Target Variance */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
            <Target className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Target variance</p>
              <MoneyDisplay 
                amount={metrics.targetVariance} 
                size="sm" 
                showSign 
              />
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Target</p>
              <p className="text-sm font-medium">${currentCycle.target_end_balance.toLocaleString()}</p>
            </div>
          </div>

          {/* Cycle Info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="w-4 h-4" />
            <span>
              Cycle: {format(parseISO(currentCycle.start_date), 'MMM d')} — {format(parseISO(currentCycle.end_date), 'MMM d')}
            </span>
          </div>
        </div>

        {/* Safe to Spend */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Safe to spend today</p>
              <MoneyDisplay amount={metrics.safeToSpend} size="lg" />
            </div>
          </div>
        </div>

        {/* Budget Overview */}
        {metrics.budgetByCategory.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Budget Status</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
                View all <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {metrics.budgetByCategory.slice(0, 3).map((b) => (
                <BudgetCard key={b.category.id} metric={b} />
              ))}
            </div>
          </section>
        )}

        {/* Recent Transactions */}
        {recentTransactions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Recent Transactions</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate("/transactions")}>
                View all <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="glass-card rounded-2xl divide-y divide-border/50">
              {recentTransactions.map((t) => (
                <TransactionItem 
                  key={t.id} 
                  transaction={t}
                  onClick={() => navigate(`/transactions/${t.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {recentTransactions.length === 0 && (
          <div className="glass-card rounded-2xl p-8 text-center">
            <p className="text-muted-foreground mb-4">No transactions yet</p>
            <Button onClick={() => navigate("/add")}>
              Add your first transaction
            </Button>
          </div>
        )}
      </div>
    </FinanceLayout>
  );
}
