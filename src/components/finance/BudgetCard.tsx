import { MoneyDisplay } from "./MoneyDisplay";
import { CategoryBadge } from "./CategoryBadge";
import { Progress } from "@/components/ui/progress";
import type { BudgetCategoryMetric } from "@/types/finance";
import { cn } from "@/lib/utils";

interface BudgetCardProps {
  metric: BudgetCategoryMetric;
}

export function BudgetCard({ metric }: BudgetCardProps) {
  const isOverBudget = metric.percentUsed > 100;
  const isNearLimit = metric.percentUsed > 80 && metric.percentUsed <= 100;

  return (
    <div className="p-4 rounded-xl bg-card border border-border/50">
      <div className="flex items-center justify-between mb-2">
        <CategoryBadge category={metric.category} size="md" />
        <div className="text-right">
          <MoneyDisplay amount={metric.actual} size="sm" colorize={false} />
          <span className="text-muted-foreground text-xs"> / </span>
          <span className="text-xs text-muted-foreground">
            ${metric.planned.toFixed(0)}
          </span>
        </div>
      </div>
      
      <Progress 
        value={Math.min(metric.percentUsed, 100)} 
        className={cn(
          "h-2",
          isOverBudget && "[&>div]:bg-destructive",
          isNearLimit && "[&>div]:bg-warning"
        )}
      />
      
      <div className="flex justify-between mt-2 text-xs">
        <span className={cn(
          isOverBudget ? "text-destructive" : "text-muted-foreground"
        )}>
          {metric.percentUsed.toFixed(0)}% used
        </span>
        <span className={cn(
          metric.variance < 0 ? "text-destructive" : "metric-positive"
        )}>
          {metric.variance >= 0 ? `$${metric.variance.toFixed(0)} left` : `$${Math.abs(metric.variance).toFixed(0)} over`}
        </span>
      </div>
    </div>
  );
}
