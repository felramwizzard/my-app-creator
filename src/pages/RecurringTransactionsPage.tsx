import { useState } from "react";
import { FinanceLayout } from "@/components/layout/FinanceLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRecurringTransactions, DAYS_OF_WEEK } from "@/hooks/useRecurringTransactions";
import { useFinance, getOccurrencesInCycleRange } from "@/hooks/useFinance";
import { parseISO } from "date-fns";
import { toast } from "sonner";
import { 
  Plus, 
  Repeat, 
  Trash2, 
  Pencil, 
  Loader2,
  Calendar,
  Sparkles,
  Clock
} from "lucide-react";
import { CategoryBadge } from "@/components/finance/CategoryBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { RecurringTransaction, RecurrenceFrequency } from "@/types/finance";

export default function RecurringTransactionsPage() {
  const { recurringTransactions, isLoading, createRecurring, updateRecurring, deleteRecurring, generatePlannedTransactions, createPlannedTransactions } = useRecurringTransactions();
  const { categories, currentCycle, transactions, paydayDate } = useFinance();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("weekly");
  const [dayOfWeek, setDayOfWeek] = useState<number>(5); // Friday
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setName("");
    setAmount("");
    setCategoryId("");
    setFrequency("weekly");
    setDayOfWeek(5);
    setDayOfMonth(1);
    setIsActive(true);
    setNotes("");
    setEditingId(null);
  };

  const openDialog = (recurring?: RecurringTransaction) => {
    if (recurring) {
      setEditingId(recurring.id);
      setName(recurring.name);
      setAmount(Math.abs(recurring.amount).toString());
      setCategoryId(recurring.category_id || "");
      setFrequency(recurring.frequency);
      setDayOfWeek(recurring.day_of_week ?? 5);
      setDayOfMonth(recurring.day_of_month ?? 1);
      setIsActive(recurring.is_active);
      setNotes(recurring.notes || "");
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        amount: parseFloat(amount),
        category_id: categoryId || null,
        frequency,
        day_of_week: frequency !== 'monthly' ? dayOfWeek : null,
        day_of_month: frequency === 'monthly' ? dayOfMonth : null,
        is_active: isActive,
        notes: notes.trim() || null,
      };

      if (editingId) {
        await updateRecurring.mutateAsync({ id: editingId, ...data });
        toast.success("Recurring transaction updated!");
      } else {
        await createRecurring.mutateAsync(data);
        toast.success("Recurring transaction created!");
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving recurring transaction:", error);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecurring.mutateAsync(id);
      toast.success("Deleted!");
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete");
    }
  };

  const handleGeneratePlanned = async () => {
    if (!currentCycle) {
      toast.error("No active cycle");
      return;
    }

    setGenerating(true);
    try {
      const planned = await generatePlannedTransactions();
      
      // Filter out any that already exist (by matching date + recurring_transaction_id)
      const existingPlanned = transactions.filter(t => t.is_planned && t.recurring_transaction_id);
      const newPlanned = planned.filter(p => 
        !existingPlanned.some(e => 
          e.date === p.date && e.recurring_transaction_id === p.recurring_transaction_id
        )
      );

      if (newPlanned.length === 0) {
        toast.info("All planned transactions already exist for this cycle");
        return;
      }

      await createPlannedTransactions.mutateAsync(newPlanned);
      toast.success(`Created ${newPlanned.length} planned transactions!`);
    } catch (error) {
      console.error("Error generating planned transactions:", error);
      toast.error("Failed to generate planned transactions");
    } finally {
      setGenerating(false);
    }
  };

  const getFrequencyLabel = (recurring: RecurringTransaction) => {
    if (recurring.frequency === 'monthly') {
      return `Monthly on the ${recurring.day_of_month}${getOrdinalSuffix(recurring.day_of_month ?? 1)}`;
    }
    const dayName = DAYS_OF_WEEK.find(d => d.value === recurring.day_of_week)?.label || '';
    if (recurring.frequency === 'fortnightly') {
      return `Every 2 weeks on ${dayName}`;
    }
    return `Every ${dayName}`;
  };

  // Calculate total recurring transactions within the actual cycle dates (excluding payday occurrences)
  const totalRecurringPerCycle = currentCycle 
    ? recurringTransactions
        .filter(r => r.is_active)
        .reduce((sum, r) => {
          const cycleStart = parseISO(currentCycle.start_date);
          const cycleEnd = parseISO(currentCycle.end_date);
          const occurrences = getOccurrencesInCycleRange(r, cycleStart, cycleEnd, paydayDate);
          console.log(`${r.name}: ${occurrences.length} occ × $${r.amount} = $${occurrences.length * Math.abs(r.amount)}`, occurrences.map(d => d.toISOString().split('T')[0]));
          return sum + occurrences.length * Math.abs(r.amount);
        }, 0)
    : 0;
  
  console.log('TOTAL:', totalRecurringPerCycle);

  return (
    <FinanceLayout>
      <div className="px-5 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Repeat className="w-6 h-6" /> Recurring
          </h1>
          <Button onClick={() => openDialog()} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        {/* Total Summary Card */}
        {recurringTransactions.length > 0 && (
          <div className="glass-card rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Total recurring per cycle</p>
            <p className="text-2xl font-display font-bold text-destructive">
              -${totalRecurringPerCycle.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {recurringTransactions.filter(r => r.is_active).length} active recurring expenses
            </p>
          </div>
        )}

        {/* Generate Button */}
        {currentCycle && recurringTransactions.length > 0 && (
          <Button 
            variant="secondary" 
            className="w-full"
            onClick={handleGeneratePlanned}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Generate Planned Transactions for This Cycle
          </Button>
        )}

        {/* Recurring Transactions List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : recurringTransactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Repeat className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No recurring transactions yet</p>
            <p className="text-sm">Add regular expenses like rent, subscriptions, etc.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recurringTransactions.map(recurring => (
              <div 
                key={recurring.id}
                className={`glass-card rounded-xl p-4 ${!recurring.is_active ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{recurring.name}</p>
                      {!recurring.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          Paused
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-display font-bold text-destructive mt-1">
                      -${Math.abs(recurring.amount).toFixed(2)}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getFrequencyLabel(recurring)}
                      </span>
                      {recurring.category && (
                        <CategoryBadge category={recurring.category} />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => openDialog(recurring)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDelete(recurring.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Recurring Transaction' : 'Add Recurring Transaction'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. Rent, Netflix, Phone Bill"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurrenceFrequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="fortnightly">Fortnightly (Every 2 weeks)</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {frequency !== 'monthly' ? (
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select value={dayOfWeek.toString()} onValueChange={(v) => setDayOfWeek(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map(day => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Day of Month</Label>
                <Select value={dayOfMonth.toString()} onValueChange={(v) => setDayOfMonth(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}{getOrdinalSuffix(day)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="Any additional notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={saving}
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </FinanceLayout>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
