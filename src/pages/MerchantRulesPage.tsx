import { useState } from "react";
import { FinanceLayout } from "@/components/layout/FinanceLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinance } from "@/hooks/useFinance";
import { CategoryBadge } from "@/components/finance/CategoryBadge";
import { toast } from "sonner";
import { 
  Plus, 
  Trash2, 
  Tag,
  ArrowRight,
  Sparkles,
  X
} from "lucide-react";
import type { Category } from "@/types/finance";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MerchantRulesPage() {
  const { merchantRules, categories, createMerchantRule, deleteMerchantRule } = useFinance();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [merchantMatch, setMerchantMatch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const handleAddRule = async () => {
    if (!merchantMatch.trim()) {
      toast.error("Please enter a merchant name pattern");
      return;
    }
    if (!selectedCategory) {
      toast.error("Please select a category");
      return;
    }

    try {
      await createMerchantRule.mutateAsync({
        merchant_match: merchantMatch.trim(),
        default_category_id: selectedCategory.id
      });
      toast.success("Rule added! Future transactions will be auto-categorized.");
      setIsAddOpen(false);
      setMerchantMatch("");
      setSelectedCategory(null);
    } catch (error) {
      toast.error("Failed to add rule");
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteMerchantRule.mutateAsync(id);
      toast.success("Rule deleted");
    } catch (error) {
      toast.error("Failed to delete rule");
    }
  };

  return (
    <FinanceLayout>
      <div className="px-5 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-display font-bold">Merchant Rules</h1>
            <p className="text-sm text-muted-foreground">
              Auto-categorize transactions by merchant
            </p>
          </div>
          <Button onClick={() => setIsAddOpen(true)} size="icon">
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Info Card */}
        <div className="glass-card rounded-xl p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-muted-foreground">
              When you add a transaction, if the merchant name contains any of these patterns, 
              it will automatically be assigned to the corresponding category.
            </p>
          </div>
        </div>

        {/* Rules List */}
        {merchantRules.length > 0 ? (
          <div className="space-y-3">
            {merchantRules.map((rule) => (
              <div
                key={rule.id}
                className="glass-card rounded-xl p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{rule.merchant_match}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    <CategoryBadge category={rule.category ?? null} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Matches: "{rule.merchant_match.toLowerCase()}"
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteRule(rule.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Tag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No merchant rules yet</p>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add First Rule
            </Button>
          </div>
        )}

        {/* Examples */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Examples</h3>
          <div className="grid gap-2 text-sm">
            <div className="p-3 rounded-lg bg-secondary/50">
              <span className="font-medium">woolworths</span>
              <span className="text-muted-foreground"> → </span>
              <span>Groceries</span>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50">
              <span className="font-medium">netflix</span>
              <span className="text-muted-foreground"> → </span>
              <span>Subscriptions</span>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50">
              <span className="font-medium">uber</span>
              <span className="text-muted-foreground"> → </span>
              <span>Transport</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Rule Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Merchant Rule</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="merchant">Merchant Pattern</Label>
              <Input
                id="merchant"
                placeholder="e.g., woolworths, netflix, uber"
                value={merchantMatch}
                onChange={(e) => setMerchantMatch(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Case-insensitive partial match
              </p>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              {selectedCategory ? (
                <div className="flex items-center gap-2">
                  <CategoryBadge category={selectedCategory} size="md" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  className="w-full justify-between"
                  onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                >
                  Select category
                  <Tag className="w-4 h-4" />
                </Button>
              )}

              {showCategoryPicker && !selectedCategory && (
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-card border border-border/50 max-h-48 overflow-y-auto">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setShowCategoryPicker(false);
                      }}
                      className="p-2 rounded-lg text-left hover:bg-secondary transition-colors"
                    >
                      <CategoryBadge category={cat} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setIsAddOpen(false);
                  setMerchantMatch("");
                  setSelectedCategory(null);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleAddRule}
                disabled={!merchantMatch.trim() || !selectedCategory}
              >
                Add Rule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </FinanceLayout>
  );
}
