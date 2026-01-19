import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CategoryBadge } from "@/components/finance/CategoryBadge";
import { EmojiPicker } from "@/components/finance/EmojiPicker";
import { useFinance } from "@/hooks/useFinance";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Category } from "@/types/finance";
import { cn } from "@/lib/utils";

interface CategoryManagerProps {
  mode?: "full" | "inline";
  onCategoryCreated?: (category: Category) => void;
}

export function CategoryManager({ mode = "full", onCategoryCreated }: CategoryManagerProps) {
  const { categories, createCategory, updateCategory, deleteCategory } = useFinance();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<"need" | "want" | "bucket">("want");
  const [icon, setIcon] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setType("want");
    setIcon("");
    setEditingCategory(null);
  };

  const openEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setType(category.type);
    setIcon(category.icon || "");
    setIsAddOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    // Check for duplicates
    const isDuplicate = categories.some(
      c => c.name.toLowerCase() === name.trim().toLowerCase() && c.id !== editingCategory?.id
    );
    if (isDuplicate) {
      toast.error("A category with this name already exists");
      return;
    }

    setSaving(true);
    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({
          id: editingCategory.id,
          name: name.trim(),
          type,
          icon: icon || null,
        });
        toast.success("Category updated");
      } else {
        const result = await createCategory.mutateAsync({
          name: name.trim(),
          type,
          icon: icon || null,
          parent_category_id: null,
          sort_order: categories.length,
        });
        toast.success("Category created");
        if (onCategoryCreated && result) {
          onCategoryCreated(result as Category);
        }
      }
      setIsAddOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteCategory.mutateAsync(id);
      toast.success("Category deleted");
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category - it may be in use by transactions");
    } finally {
      setDeleting(null);
    }
  };

  if (mode === "inline") {
    return (
      <>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            resetForm();
            setIsAddOpen(true);
          }}
          className="text-primary"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Category
        </Button>

        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit Category" : "Add Category"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName">Name</Label>
                <Input
                  id="categoryName"
                  placeholder="e.g., Childcare"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryType">Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="need">Need (Essential)</SelectItem>
                    <SelectItem value="want">Want (Discretionary)</SelectItem>
                    <SelectItem value="bucket">Bucket (Savings)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Icon (emoji)</Label>
                <EmojiPicker value={icon} onChange={setIcon} />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setIsAddOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingCategory ? "Save" : "Add"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Full mode - for Settings page
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <div
            key={cat.id}
            className={cn(
              "group relative flex items-center gap-1 pr-1",
              deleting === cat.id && "opacity-50"
            )}
          >
            <CategoryBadge category={cat} />
            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => openEdit(cat)}
              >
                <Pencil className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={() => handleDelete(cat.id)}
                disabled={deleting === cat.id}
              >
                {deleting === cat.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          resetForm();
          setIsAddOpen(true);
        }}
      >
        <Plus className="w-4 h-4 mr-1" />
        Add Category
      </Button>

      <Dialog open={isAddOpen} onOpenChange={(open) => {
        setIsAddOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Name</Label>
              <Input
                id="categoryName"
                placeholder="e.g., Childcare"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryType">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="need">Need (Essential)</SelectItem>
                  <SelectItem value="want">Want (Discretionary)</SelectItem>
                  <SelectItem value="bucket">Bucket (Savings)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Icon (emoji)</Label>
              <EmojiPicker value={icon} onChange={setIcon} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setIsAddOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingCategory ? "Save" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
