import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, Edit2, Plus } from "lucide-react";

interface DataOperationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: Array<{
    name: string;
    label: string;
    type: "text" | "number" | "date" | "textarea" | "select";
    required?: boolean;
    options?: Array<{ label: string; value: string }>;
  }>;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  initialData?: Record<string, any>;
  isLoading?: boolean;
}

export function DataOperationDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  fields,
  onSubmit,
  initialData,
  isLoading = false,
}: DataOperationDialogProps) {
  const [formData, setFormData] = useState<Record<string, any>>(
    initialData || {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData(initialData || {});
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {fields.map((field) => (
            <div key={field.name} className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={field.name} className="text-right">
                {field.label}
              </Label>
              <div className="col-span-3">
                {field.type === "textarea" ? (
                  <Textarea
                    id={field.name}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.label}
                  />
                ) : field.type === "select" ? (
                  <select
                    id={field.name}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">选择...</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={field.name}
                    type={field.type}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.label}
                    required={field.required}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting || isLoading}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting || isLoading ? "处理中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export function DeleteConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  onConfirm,
  isLoading = false,
}: DeleteConfirmDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting || isLoading}>
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting || isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting || isLoading ? "删除中..." : "确认删除"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface DataOperationButtonsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onAdd?: () => void;
  size?: "sm" | "md" | "lg";
  showAdd?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
}

export function DataOperationButtons({
  onEdit,
  onDelete,
  onAdd,
  size = "sm",
  showAdd = true,
  showEdit = true,
  showDelete = true,
}: DataOperationButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      {showAdd && onAdd && (
        <Button
          size={size}
          variant="outline"
          onClick={onAdd}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">添加</span>
        </Button>
      )}
      {showEdit && onEdit && (
        <Button
          size={size}
          variant="outline"
          onClick={onEdit}
          className="gap-2"
        >
          <Edit2 className="w-4 h-4" />
          <span className="hidden sm:inline">编辑</span>
        </Button>
      )}
      {showDelete && onDelete && (
        <Button
          size={size}
          variant="outline"
          onClick={onDelete}
          className="gap-2 text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">删除</span>
        </Button>
      )}
    </div>
  );
}
