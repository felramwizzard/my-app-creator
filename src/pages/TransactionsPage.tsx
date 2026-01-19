import { useState, useMemo } from "react";
import { FinanceLayout } from "@/components/layout/FinanceLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SwipeableTransactionItem } from "@/components/finance/SwipeableTransactionItem";
import { TransactionDetailSheet } from "@/components/finance/TransactionDetailSheet";
import { CategoryBadge } from "@/components/finance/CategoryBadge";
import { useFinance } from "@/hooks/useFinance";
import { Search, X, Clock, ArrowUpDown, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type { Category, Transaction } from "@/types/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FilterType = 'all' | 'uncategorized' | 'planned' | Category['type'];
type SortType = 'upcoming' | 'newest' | 'oldest' | 'amount-high' | 'amount-low';

const TIMEZONE = 'Australia/Sydney';

const ymdToLocalDate = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export default function TransactionsPage() {
  const { transactions, categories, bulkUpdateTransactions, updateTransaction, deleteTransaction } = useFinance();
  
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('upcoming');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<Category | null>(null);
  const [detailTransaction, setDetailTransaction] = useState<Transaction | null>(null);

  const filteredTransactions = useMemo(() => {
    let result = transactions;

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(t => 
        t.description.toLowerCase().includes(searchLower) ||
        t.merchant?.toLowerCase().includes(searchLower) ||
        t.category?.name.toLowerCase().includes(searchLower)
      );
    }

    // Type filter
    if (filter === 'uncategorized') {
      result = result.filter(t => !t.category_id);
    } else if (filter === 'planned') {
      result = result.filter(t => t.is_planned);
    } else if (filter !== 'all') {
      result = result.filter(t => t.category?.type === filter);
    }

    // Sort
    const todayYmd = formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd');
    result = [...result].sort((a, b) => {
      const dateA = a.date;
      const dateB = b.date;

      switch (sortBy) {
        case 'upcoming': {
          // Closest upcoming dates first, then past dates newest first
          const aIsFuture = dateA >= todayYmd;
          const bIsFuture = dateB >= todayYmd;

          if (aIsFuture && bIsFuture) {
            return dateA.localeCompare(dateB);
          } else if (!aIsFuture && !bIsFuture) {
            return dateB.localeCompare(dateA);
          } else {
            return aIsFuture ? -1 : 1;
          }
        }
        case 'newest':
          return dateB.localeCompare(dateA);
        case 'oldest':
          return dateA.localeCompare(dateB);
        case 'amount-high':
          return Math.abs(b.amount) - Math.abs(a.amount);
        case 'amount-low':
          return Math.abs(a.amount) - Math.abs(b.amount);
        default:
          return 0;
      }
    });

    return result;
  }, [transactions, search, filter, sortBy]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, typeof filteredTransactions> = {};
    
    filteredTransactions.forEach(t => {
      const dateKey = t.date;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(t);
    });

    // Sort groups based on sortBy
    const todayYmd = formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd');
    return Object.entries(groups).sort(([a], [b]) => {
      if (sortBy === 'upcoming') {
        const aIsFuture = a >= todayYmd;
        const bIsFuture = b >= todayYmd;

        if (aIsFuture && bIsFuture) {
          return a.localeCompare(b);
        } else if (!aIsFuture && !bIsFuture) {
          return b.localeCompare(a);
        } else {
          return aIsFuture ? -1 : 1;
        }
      } else if (sortBy === 'oldest') {
        return a.localeCompare(b);
      } else {
        return b.localeCompare(a);
      }
    });
  }, [filteredTransactions, sortBy]);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkCategorize = async () => {
    if (!bulkCategory || selectedIds.size === 0) return;
    
    await bulkUpdateTransactions.mutateAsync({
      ids: Array.from(selectedIds),
      updates: { category_id: bulkCategory.id }
    });
    
    setSelectedIds(new Set());
    setBulkCategory(null);
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await updateTransaction.mutateAsync({
        id,
        is_planned: false
      });
      toast.success("Marked as paid!");
    } catch (error) {
      console.error("Error marking as paid:", error);
      toast.error("Failed to update transaction");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction.mutateAsync(id);
      toast.success("Transaction deleted");
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction");
    }
  };

  const handleUpdateCategory = async (transactionId: string, categoryId: string) => {
    try {
      await updateTransaction.mutateAsync({
        id: transactionId,
        category_id: categoryId
      });
      toast.success("Category updated");
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Failed to update category");
    }
  };

  return (
    <FinanceLayout>
      <div className="px-5 py-6 space-y-4">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {filteredTransactions.length} transactions
          </p>
        </div>

        {/* Search and Sort */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortType)}>
            <SelectTrigger className="w-[130px] shrink-0">
              <ArrowUpDown className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">
                <span className="flex items-center gap-2">
                  <CalendarDays className="w-3 h-3" /> Upcoming
                </span>
              </SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="amount-high">Highest $</SelectItem>
              <SelectItem value="amount-low">Lowest $</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5">
          {(['all', 'planned', 'uncategorized', 'need', 'want', 'bucket'] as FilterType[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setFilter(f)}
              className={cn(
                "shrink-0",
                f === 'planned' && filter === f && "bg-amber-500 hover:bg-amber-600"
              )}
            >
              {f === 'planned' && <Clock className="w-3 h-3 mr-1" />}
              {f === 'all' ? 'All' : f === 'uncategorized' ? 'Uncategorized' : f === 'planned' ? 'Planned' : f.charAt(0).toUpperCase() + f.slice(1) + 's'}
            </Button>
          ))}
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="glass-card rounded-xl p-3 flex items-center gap-3 animate-slide-up">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <div className="flex-1 flex items-center gap-2 overflow-x-auto">
              {categories.slice(0, 5).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setBulkCategory(cat)}
                  className={cn(
                    "shrink-0 transition-all",
                    bulkCategory?.id === cat.id && "ring-2 ring-primary rounded-full"
                  )}
                >
                  <CategoryBadge category={cat} />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {bulkCategory && (
                <Button size="sm" onClick={handleBulkCategorize}>
                  Apply
                </Button>
              )}
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => {
                  setSelectedIds(new Set());
                  setBulkCategory(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Transaction List */}
        <div className="space-y-6">
          {groupedTransactions.map(([date, txns], index) => {
            const todayYmd = formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd');
            const isFirstPastDate = date < todayYmd && 
              (index === 0 || groupedTransactions[index - 1][0] >= todayYmd);
            
            return (
              <div key={date}>
                {isFirstPastDate && sortBy === 'upcoming' && (
                  <div className="flex items-center gap-3 mb-4 mt-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Past Transactions
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                <p className="text-xs font-medium text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                  {format(ymdToLocalDate(date), 'EEEE, MMMM d')}
                </p>
                <div className="glass-card rounded-2xl divide-y divide-border/50 overflow-hidden">
                  {txns.map((t) => (
                    <SwipeableTransactionItem
                      key={t.id}
                      transaction={t}
                      selected={selectedIds.has(t.id)}
                      onClick={() => setDetailTransaction(t)}
                      onMarkAsPaid={t.is_planned ? handleMarkAsPaid : undefined}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No transactions found</p>
          </div>
        )}
      </div>

      {/* Transaction Detail Sheet */}
      <TransactionDetailSheet
        transaction={detailTransaction}
        open={!!detailTransaction}
        onOpenChange={(open) => !open && setDetailTransaction(null)}
        categories={categories}
        onUpdateCategory={handleUpdateCategory}
        onMarkAsPaid={handleMarkAsPaid}
        onDelete={handleDelete}
      />
    </FinanceLayout>
  );
}
