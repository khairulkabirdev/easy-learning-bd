"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

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
};

export function TableCompletionChoiceCombobox({
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
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
        className="w-full"
      />
      <ComboboxContent>
        <ComboboxEmpty>No row found.</ComboboxEmpty>
        <ComboboxList>
          {(item) => {
            const option = options.find((entry) => entry.label === item);
            return (
              <ComboboxItem key={item} value={item} disabled={Boolean(option?.disabled)}>
                <span className="min-w-0 flex-1 truncate">{item}</span>
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
