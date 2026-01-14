import { FinanceLayout } from "@/components/layout/FinanceLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useFinance } from "@/hooks/useFinance";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, Upload, Tag, Calculator, Database } from "lucide-react";
import { CategoryBadge } from "@/components/finance/CategoryBadge";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { categories, currentCycle } = useFinance();

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
          <Button variant="secondary" className="w-full justify-start gap-3" onClick={() => navigate("/import")}>
            <Upload className="w-5 h-5" />
            Import CSV
          </Button>
        </div>

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

        {/* Cycle Info */}
        {currentCycle && (
          <section>
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4" /> Current Cycle
            </h2>
            <div className="glass-card rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Starting Balance</span>
                <span>${currentCycle.starting_balance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target End Balance</span>
                <span>${currentCycle.target_end_balance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Planned Income</span>
                <span>${currentCycle.income_planned.toLocaleString()}</span>
              </div>
            </div>
          </section>
        )}

        {/* Sign Out */}
        <Button variant="destructive" className="w-full" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    </FinanceLayout>
  );
}
