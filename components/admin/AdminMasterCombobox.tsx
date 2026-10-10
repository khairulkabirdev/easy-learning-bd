"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

export type AdminMasterComboboxOption = {
  id: string;
  label: string;
  isActive?: boolean;
};

type AdminMasterComboboxProps = {
  value?: string | null;
  options: AdminMasterComboboxOption[];
  onChange: (value: string | null) => void;
  placeholder: string;
  emptyText: string;
  disabled?: boolean;
};

function optionDisplayLabel(option: AdminMasterComboboxOption) {
  return `${option.label}${option.isActive === false ? " (Inactive)" : ""}`;
}

export function AdminMasterCombobox({
  value,
  options,
  onChange,
  placeholder,
  emptyText,
  disabled = false,
}: AdminMasterComboboxProps) {
  const items = options.map(optionDisplayLabel);
  const selected = options.find((option) => option.id === value) ?? null;
  const selectedLabel = selected ? optionDisplayLabel(selected) : null;

  return (
    <Combobox
      items={items}
      value={selectedLabel}
      onValueChange={(nextValue) => {
        if (!nextValue) {
          onChange(null);
          return;
        }

        const matched = options.find((option) => optionDisplayLabel(option) === nextValue);
        if (matched) onChange(matched.id);
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
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item) => {
            const option = options.find((entry) => optionDisplayLabel(entry) === item);

            return (
              <ComboboxItem key={item} value={item}>
                <span className="min-w-0 flex-1 truncate">{option?.label ?? item}</span>
                {option?.isActive === false ? (
                  <span className="shrink-0 text-xs text-muted-foreground">Inactive</span>
                ) : null}
              </ComboboxItem>
            );
          }}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
