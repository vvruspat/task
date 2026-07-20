"use client";

import { MarkdownContent, MarkdownEditor, Text } from "@task/ui";
import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useState } from "react";

export function MarkdownDescriptionEditor({
  ariaLabel,
  className,
  emptyText,
  onSave,
  value,
}: Readonly<{
  ariaLabel: string;
  className?: string;
  emptyText: string;
  onSave: (value: string | null) => Promise<void>;
  value: string | null;
}>): ReactNode {
  const [draft, setDraft] = useState(value ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value ?? "");
  }, [editing, value]);

  const save = async (): Promise<void> => {
    if (saving) return;
    const nextValue = draft.trim().length === 0 ? null : draft.trim();
    if (nextValue === value) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(nextValue);
      setEditing(false);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить описание.");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  if (editing) {
    return (
      <div className={className}>
        <MarkdownEditor
          ariaLabel={ariaLabel}
          autoFocus
          disabled={saving}
          placeholder={emptyText}
          value={draft}
          onBlur={() => void save()}
          onChange={setDraft}
          onKeyDown={handleKeyDown}
        />
        {error !== null && (
          <Text color="red" size="1">
            {error}
          </Text>
        )}
      </div>
    );
  }

  return (
    <div className={`markdown-description-view${className === undefined ? "" : ` ${className}`}`}>
      <button aria-label={ariaLabel} type="button" onClick={() => setEditing(true)} />
      {value === null ? (
        <Text className="markdown-description-empty" color="gray" size="2">
          {emptyText}
        </Text>
      ) : (
        <MarkdownContent value={value} />
      )}
    </div>
  );
}
