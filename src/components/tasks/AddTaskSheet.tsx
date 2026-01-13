import { useState } from "react";
import { X, Calendar, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AddTaskSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (title: string, dueDate?: string, starred?: boolean) => void;
}

export function AddTaskSheet({ isOpen, onClose, onAdd }: AddTaskSheetProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [starred, setStarred] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAdd(title.trim(), dueDate || undefined, starred);
      setTitle("");
      setDueDate("");
      setStarred(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
        <div className="bg-card rounded-t-3xl shadow-lg p-6 safe-bottom">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">New Task</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted transition-colors touch-manipulation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              autoFocus
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-14 text-base"
            />

            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-12 pl-11"
                />
              </div>

              <button
                type="button"
                onClick={() => setStarred(!starred)}
                className={cn(
                  "p-3 rounded-xl border-2 transition-all touch-manipulation",
                  starred
                    ? "bg-warning/10 border-warning text-warning"
                    : "border-border text-muted-foreground hover:border-warning hover:text-warning"
                )}
              >
                <Star className={cn("w-5 h-5", starred && "fill-current")} />
              </button>
            </div>

            <Button type="submit" className="w-full" disabled={!title.trim()}>
              Add Task
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
