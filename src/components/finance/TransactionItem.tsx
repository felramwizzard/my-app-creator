import { format, parseISO } from "date-fns";
import { ChevronRight, Clock, Check } from "lucide-react";
import { MoneyDisplay } from "./MoneyDisplay";
import { CategoryBadge } from "./CategoryBadge";
import type { Transaction } from "@/types/finance";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TransactionItemProps {
  transaction: Transaction;
  onClick?: () => void;
  selected?: boolean;
  onMarkAsPaid?: (id: string) => void;
}

export function TransactionItem({ transaction, onClick, selected, onMarkAsPaid }: TransactionItemProps) {
  const handleMarkAsPaid = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsPaid?.(transaction.id);
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all",
        onClick && "cursor-pointer hover:bg-secondary/50 active:scale-[0.98]",
        selected && "bg-primary/10 ring-1 ring-primary",
        transaction.is_planned && "opacity-80 border border-dashed border-muted-foreground/30 bg-muted/20"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-medium truncate">
              {transaction.merchant || transaction.description}
            </p>
            {transaction.is_planned && (
              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 flex-shrink-0">
                <Clock className="w-3 h-3" />
                Planned
              </span>
            )}
          </div>
          <MoneyDisplay amount={transaction.amount} size="sm" />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {format(parseISO(transaction.date), 'MMM d')}
          </span>
          <CategoryBadge category={transaction.category ?? null} />
        </div>
      </div>
      
      {transaction.is_planned && onMarkAsPaid ? (
        <Button 
          size="sm" 
          variant="outline"
          className="shrink-0 h-8 px-2 text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
          onClick={handleMarkAsPaid}
        >
          <Check className="w-3 h-3 mr-1" />
          Paid
        </Button>
      ) : onClick ? (
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      ) : null}
    </div>
  );
}
