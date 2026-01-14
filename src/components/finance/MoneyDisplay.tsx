import { cn } from "@/lib/utils";

interface MoneyDisplayProps {
  amount: number;
  className?: string;
  showSign?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  colorize?: boolean;
}

export function MoneyDisplay({ 
  amount, 
  className, 
  showSign = false,
  size = 'md',
  colorize = true 
}: MoneyDisplayProps) {
  const isPositive = amount >= 0;
  const isZero = amount === 0;
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl font-semibold',
    xl: 'text-3xl font-bold'
  };

  const formattedAmount = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2
  }).format(Math.abs(amount));

  const sign = showSign && !isZero ? (isPositive ? '+' : '-') : (amount < 0 ? '-' : '');
  const displayAmount = formattedAmount.replace('-', '');

  return (
    <span
      className={cn(
        "font-display tracking-tight tabular-nums",
        sizeClasses[size],
        colorize && !isZero && (isPositive ? "metric-positive" : "metric-negative"),
        colorize && isZero && "metric-neutral",
        className
      )}
    >
      {sign}{displayAmount}
    </span>
  );
}
