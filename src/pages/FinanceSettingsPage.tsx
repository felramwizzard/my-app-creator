import { useState } from "react";
import { FinanceLayout } from "@/components/layout/FinanceLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useFinance } from "@/hooks/useFinance";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { 
  LogOut, 
  Upload, 
  Tag, 
  Calculator, 
  Sparkles, 
  ChevronRight,
  Pencil,
  Loader2,
  Calendar,
  Repeat,
  DollarSign
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
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { categories, currentCycle, merchantRules, updateCycle, paydayDate } = useFinance();
  const queryClient = useQueryClient();
  
  const [isEditingCycle, setIsEditingCycle] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startingBalance, setStartingBalance] = useState("");
  const [incomePlanned, setIncomePlanned] = useState("");
  const [incomeActual, setIncomeActual] = useState("");
  const [targetEndBalance, setTargetEndBalance] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingPayday, setSavingPayday] = useState(false);

  const openCycleEditor = () => {
    if (currentCycle) {
      setStartDate(currentCycle.start_date);
      setEndDate(currentCycle.end_date);
      setStartingBalance(currentCycle.starting_balance.toString());
      setIncomePlanned(currentCycle.income_planned.toString());
      setIncomeActual(currentCycle.income_actual?.toString() || "");
      setTargetEndBalance(currentCycle.target_end_balance.toString());
      setIsEditingCycle(true);
    }
  };

  const handleSaveCycle = async () => {
    if (!currentCycle) return;
    
    if (!startDate || !endDate) {
      toast.error("Please set both start and end dates");
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      toast.error("End date must be after start date");
      return;
    }
    
    setSaving(true);
    try {
      await updateCycle.mutateAsync({
        id: currentCycle.id,
        start_date: startDate,
        end_date: endDate,
        starting_balance: parseFloat(startingBalance) || 0,
        income_planned: parseFloat(incomePlanned) || 0,
        income_actual: incomeActual ? parseFloat(incomeActual) : null,
        target_end_balance: parseFloat(targetEndBalance) || 0,
      });
      toast.success("Cycle updated!");
      setIsEditingCycle(false);
    } catch (error) {
      console.error("Error updating cycle:", error);
      toast.error("Failed to update cycle");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePayday = async (newPaydayDate: string) => {
    if (!user) return;
    setSavingPayday(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ payday_date: newPaydayDate || null })
        .eq('id', user.id);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      if (newPaydayDate) {
        toast.success(`Payday set to ${format(parseISO(newPaydayDate), 'MMM d, yyyy')}`);
      } else {
        toast.success("Payday cleared");
      }
    } catch (error) {
      console.error("Error updating payday:", error);
      toast.error("Failed to update payday");
    } finally {
      setSavingPayday(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/auth");
  };

  return (
    <FinanceLayout>
      <div className="px-5 py-6 space-y-6">
        <h1 className="text-2xl font-display font-bold">Settings</h1>

        {/* Quick Actions */}
        <div className="space-y-3">
          <Button 
            variant="secondary" 
            className="w-full justify-between" 
            onClick={() => navigate("/import")}
          >
            <span className="flex items-center gap-3">
              <Upload className="w-5 h-5" />
              Import CSV
            </span>
            <ChevronRight className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="secondary" 
            className="w-full justify-between" 
            onClick={() => navigate("/merchant-rules")}
          >
            <span className="flex items-center gap-3">
              <Sparkles className="w-5 h-5" />
              Merchant Rules
              <span className="text-xs text-muted-foreground">
                ({merchantRules.length})
              </span>
            </span>
            <ChevronRight className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="secondary" 
            className="w-full justify-between" 
            onClick={() => navigate("/calendar")}
          >
            <span className="flex items-center gap-3">
              <Calendar className="w-5 h-5" />
              Calendar View
            </span>
            <ChevronRight className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="secondary" 
            className="w-full justify-between" 
            onClick={() => navigate("/recurring")}
          >
            <span className="flex items-center gap-3">
              <Repeat className="w-5 h-5" />
              Recurring Transactions
            </span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Payday Setting */}
        <section>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Payday Exclusion
          </h2>
          <div className="glass-card rounded-xl p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Recurring transactions on this date are excluded from the current cycle and count toward the next one.
            </p>
            <div className="flex gap-2">
              <Input
                type="date"
                value={paydayDate ?? ""}
                onChange={(e) => handleUpdatePayday(e.target.value)}
                disabled={savingPayday}
                className="flex-1"
              />
              {paydayDate && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleUpdatePayday("")}
                  disabled={savingPayday}
                >
                  <span className="text-xs text-muted-foreground">Clear</span>
                </Button>
              )}
            </div>
            {paydayDate && (
              <p className="text-xs text-muted-foreground">
                Transactions on <span className="font-medium">{format(parseISO(paydayDate), 'EEEE, MMM d, yyyy')}</span> will be excluded.
              </p>
            )}
          </div>
        </section>

        {/* Current Cycle */}
        {currentCycle && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Calculator className="w-4 h-4" /> Current Cycle
              </h2>
              <Button variant="ghost" size="sm" onClick={openCycleEditor}>
                <Pencil className="w-4 h-4 mr-1" /> Edit
              </Button>
            </div>
            <div className="glass-card rounded-xl p-4 space-y-3 text-sm">
              <div className="flex items-center gap-2 text-xs text-muted-foreground pb-2 border-b border-border/50">
                <Calendar className="w-3 h-3" />
                {format(parseISO(currentCycle.start_date), 'MMM d')} — {format(parseISO(currentCycle.end_date), 'MMM d, yyyy')}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Starting Balance</span>
                <span className="font-medium">${currentCycle.starting_balance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Planned Income</span>
                <span className="font-medium">${currentCycle.income_planned.toLocaleString()}</span>
              </div>
              {currentCycle.income_actual !== null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Actual Income</span>
                  <span className="font-medium">${currentCycle.income_actual.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target End Balance</span>
                <span className="font-medium text-primary">${currentCycle.target_end_balance.toLocaleString()}</span>
              </div>
            </div>
          </section>
        )}

        {/* Categories */}
        <section>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4" /> Categories
          </h2>
          <div className="glass-card rounded-xl p-4 space-y-2">
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <CategoryBadge key={cat.id} category={cat} />
              ))}
            </div>
          </div>
        </section>

        {/* Sign Out */}
        <Button variant="destructive" className="w-full" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>

      {/* Edit Cycle Dialog */}
      <Dialog open={isEditingCycle} onOpenChange={setIsEditingCycle}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Cycle</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
            {/* Cycle Dates */}
            <div className="p-3 rounded-lg bg-secondary/50 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cycle Period</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="startDate" className="text-xs">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="endDate" className="text-xs">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startingBalance">Starting Balance ($)</Label>
              <Input
                id="startingBalance"
                type="number"
                step="0.01"
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="incomePlanned">Planned Income ($)</Label>
              <Input
                id="incomePlanned"
                type="number"
                step="0.01"
                value={incomePlanned}
                onChange={(e) => setIncomePlanned(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="incomeActual">Actual Income ($)</Label>
              <Input
                id="incomeActual"
                type="number"
                step="0.01"
                placeholder="Leave empty to use planned"
                value={incomeActual}
                onChange={(e) => setIncomeActual(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Override if your actual income differs from planned
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetEndBalance">Target End Balance ($)</Label>
              <Input
                id="targetEndBalance"
                type="number"
                step="0.01"
                value={targetEndBalance}
                onChange={(e) => setTargetEndBalance(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setIsEditingCycle(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveCycle}
                disabled={saving}
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </FinanceLayout>
  );
}
