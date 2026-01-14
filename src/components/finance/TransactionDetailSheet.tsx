import { format, parseISO } from "date-fns";
import { Trash2, X, Clock, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "./MoneyDisplay";
import { CategoryBadge } from "./CategoryBadge";
import type { Transaction, Category } from "@/types/finance";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TransactionDetailSheetProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onUpdateCategory: (transactionId: string, categoryId: string) => void;
  onMarkAsPaid?: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TransactionDetailSheet({
  transaction,
  open,
  onOpenChange,
  categories,
  onUpdateCategory,
  onMarkAsPaid,
  onDelete,
}: TransactionDetailSheetProps) {
  if (!transaction) return null;

  const handleDelete = () => {
    onDelete(transaction.id);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            {transaction.merchant || transaction.description}
            {transaction.is_planned && (
              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <Clock className="w-3 h-3" />
                Planned
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Amount and Date */}
          <div className="flex items-center justify-between">
            <MoneyDisplay amount={transaction.amount} size="lg" />
            <span className="text-muted-foreground">
              {format(parseISO(transaction.date), "EEEE, MMMM d, yyyy")}
            </span>
          </div>

          {/* Description */}
          {transaction.description && transaction.description !== transaction.merchant && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p>{transaction.description}</p>
            </div>
          )}

          {/* Notes */}
          {transaction.notes && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p>{transaction.notes}</p>
            </div>
          )}

          {/* Category Selection */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Category</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => onUpdateCategory(transaction.id, cat.id)}
                  className={cn(
                    "transition-all rounded-full",
                    transaction.category_id === cat.id &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                >
                  <CategoryBadge category={cat} />
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {transaction.is_planned && onMarkAsPaid && (
              <Button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                onClick={() => {
                  onMarkAsPaid(transaction.id);
                  onOpenChange(false);
                }}
              >
                <Check className="w-4 h-4 mr-2" />
                Mark as Paid
              </Button>
            )}
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className={cn(transaction.is_planned && onMarkAsPaid ? "" : "flex-1")}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this transaction? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
