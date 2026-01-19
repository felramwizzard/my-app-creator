import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const EMOJI_CATEGORIES = {
  "Common": ["💰", "🏠", "🚗", "🍔", "🛒", "💊", "📱", "🎮", "✈️", "🎁", "💳", "📺"],
  "Food & Drink": ["🍕", "🍜", "☕", "🍺", "🥗", "🍰", "🥤", "🍎", "🥡", "🍪"],
  "Transport": ["🚌", "⛽", "🚇", "🚕", "✈️", "🚲", "🛵", "🚢", "🛻", "🚙"],
  "Home": ["🏡", "🛋️", "🧹", "💡", "🔧", "🪴", "🛏️", "🚿", "🧺", "🔌"],
  "Health": ["💉", "🏥", "💪", "🧘", "🩺", "💊", "🧴", "🦷", "👓", "🩹"],
  "Entertainment": ["🎬", "🎵", "📚", "🎲", "🎳", "🎭", "🎨", "🎤", "🎧", "📷"],
  "Shopping": ["👕", "👟", "👜", "💄", "🕶️", "⌚", "💎", "🎩", "👗", "🧥"],
  "Finance": ["💵", "💸", "🏦", "📊", "💹", "🧾", "🏧", "💲", "📈", "🪙"],
  "Education": ["📖", "🎓", "✏️", "📝", "🖥️", "🔬", "🎒", "📐", "🗂️", "📎"],
  "Family": ["👶", "🐕", "🧒", "👨‍👩‍👧", "🏫", "🧸", "🎠", "👴", "👵", "🍼"],
};

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ value, onChange, className }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Common");

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          className={cn(
            "w-full justify-start text-left font-normal h-10",
            !value && "text-muted-foreground",
            className
          )}
        >
          {value ? (
            <span className="text-xl mr-2">{value}</span>
          ) : (
            <span className="text-muted-foreground">Pick an emoji...</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-border">
          {Object.keys(EMOJI_CATEGORIES).map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "secondary" : "ghost"}
              size="sm"
              className="text-xs px-2 h-7"
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto">
          {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              className="h-9 w-9 p-0 text-xl hover:bg-accent"
              onClick={() => handleSelect(emoji)}
            >
              {emoji}
            </Button>
          ))}
        </div>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-muted-foreground"
            onClick={() => handleSelect("")}
          >
            Clear
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
