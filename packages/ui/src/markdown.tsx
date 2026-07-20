"use client";

import { TextArea } from "@radix-ui/themes";
import type { FocusEvent, KeyboardEvent, ReactNode } from "react";
import { useRef } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

export type MarkdownContentProps = Readonly<{
  className?: string;
  renderLinks?: boolean;
  value: string | null | undefined;
}>;

const plainLinkComponents: Components = {
  a: ({ children }) => <>{children}</>,
};

export function MarkdownContent({
  className,
  renderLinks = true,
  value,
}: MarkdownContentProps): ReactNode {
  const classes = className === undefined ? "rt-MarkdownContent" : `rt-MarkdownContent ${className}`;
  return (
    <div className={classes}>
      <ReactMarkdown
        components={renderLinks ? undefined : plainLinkComponents}
        remarkPlugins={[remarkGfm]}
        skipHtml
      >
        {value ?? ""}
      </ReactMarkdown>
    </div>
  );
}

export type MarkdownEditorProps = Readonly<{
  ariaLabel: string;
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  value: string;
  onBlur?: (event: FocusEvent<HTMLTextAreaElement>) => void;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}>;

type MarkdownAction = Readonly<{
  label: string;
  placeholder: string;
  prefix: string;
  suffix: string;
}>;

const markdownActions: readonly MarkdownAction[] = [
  { label: "Заголовок", placeholder: "Заголовок", prefix: "## ", suffix: "" },
  { label: "Жирный", placeholder: "текст", prefix: "**", suffix: "**" },
  { label: "Курсив", placeholder: "текст", prefix: "_", suffix: "_" },
  { label: "Список", placeholder: "пункт", prefix: "- ", suffix: "" },
  { label: "Чек-лист", placeholder: "задача", prefix: "- [ ] ", suffix: "" },
  { label: "Код", placeholder: "код", prefix: "`", suffix: "`" },
  { label: "Ссылка", placeholder: "название", prefix: "[", suffix: "](https://)" },
] as const;

export function MarkdownEditor({
  ariaLabel,
  autoFocus = false,
  className,
  disabled = false,
  onBlur,
  onChange,
  onKeyDown,
  placeholder,
  value,
}: MarkdownEditorProps): ReactNode {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const classes = className === undefined ? "rt-MarkdownEditor" : `rt-MarkdownEditor ${className}`;

  const applyAction = (action: MarkdownAction): void => {
    const input = inputRef.current;
    if (input === null) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selection = value.slice(start, end) || action.placeholder;
    const insertion = `${action.prefix}${selection}${action.suffix}`;
    onChange(`${value.slice(0, start)}${insertion}${value.slice(end)}`);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + action.prefix.length, start + action.prefix.length + selection.length);
    });
  };

  return (
    <div className={classes}>
      <div aria-label="Форматирование Markdown" className="rt-MarkdownEditorToolbar" role="toolbar">
        {markdownActions.map((action) => (
          <button
            aria-label={action.label}
            disabled={disabled}
            key={action.label}
            title={action.label}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyAction(action)}
          >
            {toolbarLabel(action.label)}
          </button>
        ))}
      </div>
      <TextArea
        aria-label={ariaLabel}
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder}
        ref={inputRef}
        resize="vertical"
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

function toolbarLabel(label: string): string {
  if (label === "Заголовок") return "H";
  if (label === "Жирный") return "B";
  if (label === "Курсив") return "I";
  if (label === "Список") return "•";
  if (label === "Чек-лист") return "☑";
  if (label === "Код") return "<>";
  return "↗";
}
