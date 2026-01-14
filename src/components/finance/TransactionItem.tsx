import { format, parseISO } from "date-fns";
import { ChevronRight, Clock } from "lucide-react";
import { MoneyDisplay } from "./MoneyDisplay";
import { CategoryBadge } from "./CategoryBadge";
import type { Transaction } from "@/types/finance";
import { cn } from "@/lib/utils";

interface TransactionItemProps {
  transaction: Transaction;
  onClick?: () => void;
  selected?: boolean;
}

export function TransactionItem({ transaction, onClick, selected }: TransactionItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer",
        "hover:bg-secondary/50 active:scale-[0.98]",
        selected && "bg-primary/10 ring-1 ring-primary",
        transaction.is_planned && "opacity-70 border border-dashed border-muted-foreground/30"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-medium truncate">
              {transaction.merchant || transaction.description}
            </p>
            {transaction.is_planned && (
              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
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
      {onClick && (
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      )}
    </div>
  );
}
