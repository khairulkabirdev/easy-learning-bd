"use client";

import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

type Option = {
  id: string;
  label: string;
};

type AdminSelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  disabled?: boolean;
};

export function AdminSelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: AdminSelectFieldProps) {
  const items = options.map((option) => option.label);
  const selectedLabel = options.find((option) => option.id === value)?.label ?? null;

  return (
    <Field>
      <FieldContent>
        <FieldLabel>{label}</FieldLabel>
        <Combobox
          items={items}
          value={selectedLabel}
          onValueChange={(nextValue) => {
            if (!nextValue) {
              onChange("");
              return;
            }

            const matchedOption = options.find((option) => option.label === nextValue);
            onChange(matchedOption?.id ?? "");
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
            <ComboboxEmpty>No data found.</ComboboxEmpty>
            <ComboboxList>
              {(item) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </FieldContent>
    </Field>
  );
}
