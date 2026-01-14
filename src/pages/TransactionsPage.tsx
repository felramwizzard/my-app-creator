import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FinanceLayout } from "@/components/layout/FinanceLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TransactionItem } from "@/components/finance/TransactionItem";
import { CategoryBadge } from "@/components/finance/CategoryBadge";
import { useFinance } from "@/hooks/useFinance";
import { Search, Filter, X, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Category } from "@/types/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type FilterType = 'all' | 'uncategorized' | 'planned' | Category['type'];

export default function TransactionsPage() {
  const navigate = useNavigate();
  const { transactions, categories, bulkUpdateTransactions, updateTransaction } = useFinance();
  
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<Category | null>(null);

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

    return result;
  }, [transactions, search, filter]);

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

    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredTransactions]);

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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
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
          {groupedTransactions.map(([date, txns]) => (
            <div key={date}>
              <p className="text-xs font-medium text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                {format(parseISO(date), 'EEEE, MMMM d')}
              </p>
              <div className="glass-card rounded-2xl divide-y divide-border/50">
                {txns.map((t) => (
                  <TransactionItem
                    key={t.id}
                    transaction={t}
                    selected={selectedIds.has(t.id)}
                    onClick={() => toggleSelection(t.id)}
                    onMarkAsPaid={t.is_planned ? handleMarkAsPaid : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No transactions found</p>
          </div>
        )}
      </div>
    </FinanceLayout>
  );
}
