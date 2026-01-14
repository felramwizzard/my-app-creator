import { useState, useEffect } from "react";
import { FinanceLayout } from "@/components/layout/FinanceLayout";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/hooks/useFinance";
import { supabase } from "@/integrations/supabase/client";
import { 
  Sparkles, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Lightbulb,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Insight {
  type: 'warning' | 'tip' | 'observation' | 'recommendation';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export default function InsightsPage() {
  const { currentCycle, metrics, transactions, categories, budgets } = useFinance();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInsights = async () => {
    if (!currentCycle || !metrics) return;

    setLoading(true);
    setError(null);
    
    try {
      const context = {
        cycle: {
          start_date: currentCycle.start_date,
          end_date: currentCycle.end_date,
          starting_balance: currentCycle.starting_balance,
          target_end_balance: currentCycle.target_end_balance,
          income_planned: currentCycle.income_planned,
          income_actual: currentCycle.income_actual
        },
        metrics: {
          totalSpend: metrics.totalSpend,
          expectedEndBalance: metrics.expectedEndBalance,
          targetVariance: metrics.targetVariance,
          daysRemaining: metrics.daysRemaining,
          safeToSpend: metrics.safeToSpend
        },
        budgetStatus: metrics.budgetByCategory.map(b => ({
          category: b.category.name,
          type: b.category.type,
          planned: b.planned,
          actual: b.actual,
          percentUsed: b.percentUsed
        })),
        recentTransactions: transactions.slice(0, 20).map(t => ({
          date: t.date,
          description: t.description,
          amount: t.amount,
          category: t.category?.name
        }))
      };

      const { data, error: fnError } = await supabase.functions.invoke('finance-ai', {
        body: {
          type: 'insights',
          messages: [
            { 
              role: 'user', 
              content: 'Analyze my spending and provide actionable insights. Focus on: budget overruns, spending spikes, optimization opportunities, and forecast accuracy.' 
            }
          ],
          context
        }
      });

      if (fnError) throw fnError;

      if (data?.result?.insights) {
        setInsights(data.result.insights);
      }
    } catch (e) {
      console.error("Insights error:", e);
      setError("Failed to generate insights. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentCycle && metrics && insights.length === 0 && !loading) {
      generateInsights();
    }
  }, [currentCycle, metrics]);

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case 'tip':
        return <Lightbulb className="w-5 h-5 text-accent" />;
      case 'observation':
        return <TrendingUp className="w-5 h-5 text-primary" />;
      case 'recommendation':
        return <TrendingDown className="w-5 h-5 text-success" />;
    }
  };

  const getPriorityColor = (priority: Insight['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-destructive';
      case 'medium':
        return 'border-l-warning';
      case 'low':
        return 'border-l-muted-foreground';
    }
  };

  return (
    <FinanceLayout>
      <div className="px-5 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Insights
            </h1>
            <p className="text-sm text-muted-foreground">
              AI-powered analysis of your spending
            </p>
          </div>
          <Button
            variant="secondary"
            size="icon"
            onClick={generateInsights}
            disabled={loading}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Analyzing your finances...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="glass-card rounded-2xl p-6 text-center border-destructive/50">
            <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-destructive" />
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={generateInsights}>Try Again</Button>
          </div>
        )}

        {/* Insights List */}
        {!loading && !error && insights.length > 0 && (
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={cn(
                  "glass-card rounded-xl p-4 border-l-4 animate-fade-in",
                  getPriorityColor(insight.priority)
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">{insight.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {insight.description}
                    </p>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    insight.priority === 'high' && "bg-destructive/10 text-destructive",
                    insight.priority === 'medium' && "bg-warning/10 text-warning",
                    insight.priority === 'low' && "bg-muted text-muted-foreground"
                  )}>
                    {insight.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && insights.length === 0 && (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Sparkles className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Add more transactions to get personalized insights
            </p>
          </div>
        )}

        {/* Quick Stats */}
        {metrics && (
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Spend</p>
              <p className="text-xl font-display font-bold metric-negative">
                ${metrics.totalSpend.toLocaleString()}
              </p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Days Left</p>
              <p className="text-xl font-display font-bold">
                {metrics.daysRemaining}
              </p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Safe/Day</p>
              <p className={cn(
                "text-xl font-display font-bold",
                metrics.safeToSpend >= 0 ? "metric-positive" : "metric-negative"
              )}>
                ${Math.abs(metrics.safeToSpend).toFixed(0)}
              </p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Target Gap</p>
              <p className={cn(
                "text-xl font-display font-bold",
                metrics.targetVariance >= 0 ? "metric-positive" : "metric-negative"
              )}>
                {metrics.targetVariance >= 0 ? '+' : '-'}${Math.abs(metrics.targetVariance).toFixed(0)}
              </p>
            </div>
          </div>
        )}
      </div>
    </FinanceLayout>
  );
}
