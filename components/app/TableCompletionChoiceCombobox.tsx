"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

export type TableCompletionChoiceOption = {
  id: string;
  label: string;
  disabled?: boolean;
};

type TableCompletionChoiceComboboxProps = {
  value: string;
  options: TableCompletionChoiceOption[];
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  wrapOptions?: boolean;
};

export function TableCompletionChoiceCombobox({
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
  className,
  ariaLabel,
  wrapOptions = false,
}: TableCompletionChoiceComboboxProps) {
  const items = options.map((option) => option.label);
  const selectedLabel = options.find((option) => option.id === value)?.label ?? null;

  return (
    <Combobox
      items={items}
      value={selectedLabel}
      onValueChange={(nextValue) => {
        if (!nextValue) {
          onChange("");
          return;
        }

        const matched = options.find((option) => option.label === nextValue);
        if (!matched || matched.disabled) return;
        onChange(matched.id);
      }}
      disabled={disabled}
    >
      <ComboboxInput
        placeholder={placeholder}
        disabled={disabled}
        showClear={Boolean(value) && !disabled}
        aria-label={ariaLabel}
        title={selectedLabel ?? undefined}
        className={cn("w-full", className)}
      />
      <ComboboxContent className={wrapOptions ? "min-w-0 w-(--anchor-width)" : undefined}>
        <ComboboxEmpty>No row found.</ComboboxEmpty>
        <ComboboxList>
          {(item) => {
            const option = options.find((entry) => entry.label === item);
            return (
              <ComboboxItem key={item} value={item} disabled={Boolean(option?.disabled)} className={wrapOptions ? "min-h-10 items-start py-2" : undefined}>
                <span className={cn("min-w-0 flex-1", wrapOptions ? "whitespace-normal [overflow-wrap:anywhere]" : "truncate")}>{item}</span>
                {option?.disabled ? (
                  <span className="shrink-0 text-xs text-muted-foreground">Used</span>
                ) : null}
              </ComboboxItem>
            );
          }}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
