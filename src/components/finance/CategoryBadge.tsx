import { cn } from "@/lib/utils";
import type { Category } from "@/types/finance";

interface CategoryBadgeProps {
  category: Category | null;
  className?: string;
  size?: 'sm' | 'md';
}

export function CategoryBadge({ category, className, size = 'sm' }: CategoryBadgeProps) {
  if (!category) {
    return (
      <span className={cn(
        "px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground",
        size === 'md' && "px-3 py-1 text-sm",
        className
      )}>
        Uncategorised
      </span>
    );
  }

  const typeClasses = {
    need: 'category-need',
    want: 'category-want',
    bucket: 'category-bucket'
  };

  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-xs font-medium",
      size === 'md' && "px-3 py-1 text-sm",
      typeClasses[category.type],
      className
    )}>
      {category.icon && <span className="mr-1">{category.icon}</span>}
      {category.name}
    </span>
  );
}
