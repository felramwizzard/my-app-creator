import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinance, getCurrentCycleDates } from "@/hooks/useFinance";
import { toast } from "sonner";
import { Loader2, ArrowRight, Target, Wallet, TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function SetupPage() {
  const navigate = useNavigate();
  const { createCycle, createCategory } = useFinance();
  
  const [step, setStep] = useState(1);
  const [startingBalance, setStartingBalance] = useState("");
  const [targetEndBalance, setTargetEndBalance] = useState("");
  const [incomePlanned, setIncomePlanned] = useState("");
  const [loading, setLoading] = useState(false);

  const cycleDates = getCurrentCycleDates();

  const handleComplete = async () => {
    if (!startingBalance || !targetEndBalance || !incomePlanned) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      // Create default categories
      const defaultCategories = [
        { name: "Groceries", type: "need" as const, icon: "🛒", sort_order: 1 },
        { name: "Transport", type: "need" as const, icon: "🚗", sort_order: 2 },
        { name: "Utilities", type: "need" as const, icon: "💡", sort_order: 3 },
        { name: "Housing", type: "need" as const, icon: "🏠", sort_order: 4 },
        { name: "Health", type: "need" as const, icon: "🏥", sort_order: 5 },
        { name: "Dining Out", type: "want" as const, icon: "🍽️", sort_order: 6 },
        { name: "Entertainment", type: "want" as const, icon: "🎬", sort_order: 7 },
        { name: "Shopping", type: "want" as const, icon: "🛍️", sort_order: 8 },
        { name: "Subscriptions", type: "want" as const, icon: "📺", sort_order: 9 },
        { name: "Emergency Fund", type: "bucket" as const, icon: "🆘", sort_order: 10 },
        { name: "Savings", type: "bucket" as const, icon: "🐷", sort_order: 11 },
      ];

      for (const cat of defaultCategories) {
        await createCategory.mutateAsync({
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          sort_order: cat.sort_order,
          parent_category_id: null
        });
      }

      // Create the first cycle
      await createCycle.mutateAsync({
        start_date: cycleDates.start_date,
        end_date: cycleDates.end_date,
        starting_balance: parseFloat(startingBalance),
        target_end_balance: parseFloat(targetEndBalance),
        income_planned: parseFloat(incomePlanned),
        income_actual: null,
        status: "open"
      });

      toast.success("Setup complete! Let's start tracking.");
      navigate("/");
    } catch (error) {
      console.error("Setup error:", error);
      toast.error("Setup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col p-6">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-display font-bold">Starting Balance</h1>
              <p className="text-muted-foreground text-sm">
                What's your current account balance right now?
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startingBalance">Current balance (AUD)</Label>
              <Input
                id="startingBalance"
                type="number"
                step="0.01"
                placeholder="5000.00"
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
                className="text-xl font-display"
              />
            </div>

            <Button 
              onClick={() => setStep(2)} 
              className="w-full"
              disabled={!startingBalance}
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-display font-bold">Expected Income</h1>
              <p className="text-muted-foreground text-sm">
                How much do you expect to earn this cycle?
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="incomePlanned">Planned income (AUD)</Label>
              <Input
                id="incomePlanned"
                type="number"
                step="0.01"
                placeholder="4500.00"
                value={incomePlanned}
                onChange={(e) => setIncomePlanned(e.target.value)}
                className="text-xl font-display"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={() => setStep(3)} 
                className="flex-1"
                disabled={!incomePlanned}
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-accent" />
              </div>
              <h1 className="text-2xl font-display font-bold">Target Balance</h1>
              <p className="text-muted-foreground text-sm">
                What balance do you want by the end of this cycle?
              </p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">This cycle</p>
              <p className="font-medium">
                {format(parseISO(cycleDates.start_date), 'MMM d')} — {format(parseISO(cycleDates.end_date), 'MMM d, yyyy')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetEndBalance">Target end balance (AUD)</Label>
              <Input
                id="targetEndBalance"
                type="number"
                step="0.01"
                placeholder="6000.00"
                value={targetEndBalance}
                onChange={(e) => setTargetEndBalance(e.target.value)}
                className="text-xl font-display"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={handleComplete} 
                className="flex-1"
                disabled={loading || !targetEndBalance}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Complete Setup
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
