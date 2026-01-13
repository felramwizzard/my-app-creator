import { CheckCircle2, Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressCardProps {
  completed: number;
  total: number;
  starred: number;
}

export function ProgressCard({ completed, total, starred }: ProgressCardProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = total - completed;

  return (
    <div className="bg-card rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Today's Progress</h3>
        <span className="text-2xl font-bold text-primary">{percentage}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-muted rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatItem
          icon={CheckCircle2}
          value={completed}
          label="Completed"
          color="text-success"
        />
        <StatItem
          icon={Clock}
          value={remaining}
          label="Remaining"
          color="text-muted-foreground"
        />
        <StatItem
          icon={Star}
          value={starred}
          label="Starred"
          color="text-warning"
        />
      </div>
    </div>
  );
}

interface StatItemProps {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  color: string;
}

function StatItem({ icon: Icon, value, label, color }: StatItemProps) {
  return (
    <div className="text-center">
      <div className={cn("flex items-center justify-center gap-1.5", color)}>
        <Icon className="w-4 h-4" />
        <span className="text-lg font-bold">{value}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
