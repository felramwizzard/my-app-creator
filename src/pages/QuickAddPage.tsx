import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FinanceLayout } from "@/components/layout/FinanceLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useFinance } from "@/hooks/useFinance";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, 
  Sparkles, 
  Calendar,
  Tag,
  SplitSquareVertical,
  X
} from "lucide-react";
import { format } from "date-fns";
import { CategoryBadge } from "@/components/finance/CategoryBadge";
import { CategoryManager } from "@/components/finance/CategoryManager";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/finance";

export default function QuickAddPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentCycle, categories, createTransaction, findCategoryForMerchant } = useFinance();
  
  const [input, setInput] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [suggestedCategory, setSuggestedCategory] = useState<Category | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Parse input for merchant and amount
  useEffect(() => {
    const match = input.match(/^(.+?)\s+(\d+(?:\.\d{2})?)$/);
    if (match) {
      setAmount(match[2]);
      
      // Check merchant rules first
      const merchant = match[1].trim();
      const ruleCategory = findCategoryForMerchant(merchant);
      if (ruleCategory) {
        setSuggestedCategory(ruleCategory);
      }
    }
  }, [input, findCategoryForMerchant]);

  // AI categorization
  const suggestCategory = async (description: string) => {
    if (!description || categories.length === 0) return;
    
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('finance-ai', {
        body: {
          type: 'categorize',
          messages: [
            { role: 'user', content: `Categorize this transaction: "${description}". Available categories: ${categories.map(c => `${c.name} (${c.type})`).join(', ')}` }
          ],
          context: { categories }
        }
      });

      if (error) throw error;
      
      if (data?.result) {
        const matchedCategory = categories.find(c => 
          c.name.toLowerCase() === data.result.category_name.toLowerCase() ||
          c.name.toLowerCase().includes(data.result.category_name.toLowerCase())
        );
        if (matchedCategory) {
          setSuggestedCategory(matchedCategory);
        }
      }
    } catch (e) {
      console.error("AI categorization error:", e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentCycle || !user) {
      toast.error("Please complete setup first");
      navigate("/setup");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const description = input.replace(/\s+\d+(?:\.\d{2})?$/, '').trim() || input;
    if (!description) {
      toast.error("Please enter a description");
      return;
    }

    setLoading(true);
    try {
      await createTransaction.mutateAsync({
        cycle_id: currentCycle.id,
        date,
        description,
        merchant: description,
        amount: -parsedAmount, // Negative for expenses
        category_id: selectedCategory?.id || suggestedCategory?.id || null,
        method: 'manual',
        notes: null,
        split_group_id: null,
        import_hash: null,
        is_planned: false,
        recurring_transaction_id: null
      });

      toast.success("Transaction added!");
      navigate("/");
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("Failed to add transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FinanceLayout>
      <div className="px-5 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Quick Add</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quick Input */}
          <div className="space-y-2">
            <Label htmlFor="input">Transaction</Label>
            <Input
              id="input"
              placeholder="Woolworths 86.40"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onBlur={() => {
                const description = input.replace(/\s+\d+(?:\.\d{2})?$/, '').trim();
                if (description && !suggestedCategory) {
                  suggestCategory(description);
                }
              }}
              className="text-lg"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Type merchant and amount, e.g. "Woolworths 86.40"
            </p>
          </div>

          {/* Amount (if not auto-detected) */}
          {!amount && (
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-xl font-display"
              />
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Category
            </Label>
            
            {/* Suggested category */}
            {(suggestedCategory || aiLoading) && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <Sparkles className="w-4 h-4 text-primary" />
                {aiLoading ? (
                  <span className="text-sm text-muted-foreground">Suggesting category...</span>
                ) : suggestedCategory && (
                  <>
                    <span className="text-sm">Suggested:</span>
                    <CategoryBadge category={suggestedCategory} size="md" />
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedCategory(suggestedCategory)}
                      className="ml-auto"
                    >
                      Use
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Selected category */}
            {selectedCategory && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Selected:</span>
                <CategoryBadge category={selectedCategory} size="md" />
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  Clear
                </Button>
              </div>
            )}

            {/* Category picker */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1 justify-between"
                onClick={() => setShowCategories(!showCategories)}
              >
                {selectedCategory ? 'Change category' : 'Select category'}
                <Tag className="w-4 h-4" />
              </Button>
              <CategoryManager 
                mode="inline" 
                onCategoryCreated={(cat) => setSelectedCategory(cat)} 
              />
            </div>

            {showCategories && (
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-card border border-border/50 max-h-60 overflow-y-auto">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setShowCategories(false);
                    }}
                    className={cn(
                      "p-2 rounded-lg text-left transition-colors",
                      selectedCategory?.id === cat.id ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-secondary"
                    )}
                  >
                    <CategoryBadge category={cat} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={loading || !amount}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add Transaction
          </Button>
        </form>
      </div>
    </FinanceLayout>
  );
}
