import { useState, useRef } from "react";
import { Trash2 } from "lucide-react";
import { TransactionItem } from "./TransactionItem";
import type { Transaction } from "@/types/finance";
import { cn } from "@/lib/utils";

interface SwipeableTransactionItemProps {
  transaction: Transaction;
  onClick?: () => void;
  selected?: boolean;
  onMarkAsPaid?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function SwipeableTransactionItem({
  transaction,
  onClick,
  selected,
  onMarkAsPaid,
  onDelete,
}: SwipeableTransactionItemProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const DELETE_THRESHOLD = -80;

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    isDraggingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - startXRef.current;
    if (diff < -10) {
      isDraggingRef.current = true;
    }
    // Only allow swiping left
    if (diff < 0) {
      setTranslateX(Math.max(diff, -100));
    } else if (translateX < 0) {
      setTranslateX(Math.min(0, translateX + diff));
    }
  };

  const handleTouchEnd = () => {
    if (translateX < DELETE_THRESHOLD) {
      setTranslateX(-100);
    } else {
      setTranslateX(0);
    }
  };

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      onDelete?.(transaction.id);
    }, 200);
  };

  const handleClick = () => {
    if (!isDraggingRef.current && translateX === 0) {
      onClick?.();
    } else if (translateX !== 0) {
      setTranslateX(0);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden",
        isDeleting && "h-0 opacity-0 transition-all duration-200"
      )}
    >
      {/* Delete background */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-end bg-destructive">
        <button
          onClick={handleDelete}
          className="h-full px-6 flex items-center justify-center text-destructive-foreground"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Swipeable content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateX(${translateX}px)` }}
        className="relative bg-background transition-transform duration-150 ease-out"
      >
        <TransactionItem
          transaction={transaction}
          onClick={handleClick}
          selected={selected}
          onMarkAsPaid={onMarkAsPaid}
        />
      </div>
    </div>
  );
}
