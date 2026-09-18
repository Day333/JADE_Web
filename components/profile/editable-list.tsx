"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ItemFormProps<T> {
  initial: T;
  onSubmit: (value: T) => void;
  onCancel: () => void;
  pending: boolean;
}

/**
 * A list of profile items where each item can be edited in place or
 * removed, and new items can be added. Works both with local state (the
 * review step) and with server actions (the Career Profile page): `onSave`
 * and `onDelete` return whether they succeeded.
 */
export function EditableList<T extends { id?: string }>({
  items,
  label,
  renderView,
  renderForm,
  onSave,
  onDelete,
  newItem,
  addLabel,
  empty,
  className,
}: {
  items: T[];
  /** Short name of an item for accessible button labels. */
  label: (item: T) => string;
  renderView: (item: T) => ReactNode;
  renderForm: (props: ItemFormProps<T>) => ReactNode;
  onSave: (item: T, isNew: boolean) => Promise<boolean> | boolean;
  onDelete: (item: T) => Promise<boolean> | boolean;
  newItem: () => T;
  addLabel: string;
  empty?: ReactNode;
  className?: string;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const keyOf = (item: T, index: number) => item.id ?? `i-${index}`;

  const save = (value: T, isNew: boolean) =>
    startTransition(async () => {
      const ok = await onSave(value, isNew);
      if (ok) setEditing(null);
    });

  const remove = (item: T) =>
    startTransition(async () => {
      const ok = await onDelete(item);
      if (ok) setConfirming(null);
    });

  return (
    <div className={cn("space-y-3", className)}>
      {items.length === 0 && editing !== "new" && empty}
      {items.map((item, index) => {
        const key = keyOf(item, index);
        if (editing === key) {
          return (
            <div key={key} className="rounded-lg border border-emerald-500/40 bg-emerald-500/[0.03] p-4">
              {renderForm({ initial: item, onSubmit: (v) => save({ ...v, id: item.id }, false), onCancel: () => setEditing(null), pending })}
            </div>
          );
        }
        return (
          <div key={key} className="group flex items-start gap-3 rounded-lg border bg-background/50 p-4">
            <div className="min-w-0 flex-1">{renderView(item)}</div>
            {confirming === key ? (
              <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                <Button size="sm" variant="destructive" onClick={() => remove(item)} disabled={pending}>
                  {pending && <Loader2 className="animate-spin" aria-hidden />}
                  Remove
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(null)} disabled={pending}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex shrink-0 gap-0.5">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label={`Edit ${label(item)}`}
                  onClick={() => {
                    setConfirming(null);
                    setEditing(key);
                  }}
                >
                  <Pencil aria-hidden />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${label(item)}`}
                  onClick={() => setConfirming(key)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            )}
          </div>
        );
      })}
      {editing === "new" ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/[0.03] p-4">
          {renderForm({ initial: newItem(), onSubmit: (v) => save(v, true), onCancel: () => setEditing(null), pending })}
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="border-dashed"
          onClick={() => {
            setConfirming(null);
            setEditing("new");
          }}
        >
          <Plus aria-hidden /> {addLabel}
        </Button>
      )}
    </div>
  );
}
