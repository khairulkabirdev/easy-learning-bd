"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

export type QuestionAnswerPassageOption = {
  id: string;
  label: string;
};

type QuestionAnswerPassageComboboxProps = {
  value: string;
  options: QuestionAnswerPassageOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function QuestionAnswerPassageCombobox({
  value,
  options,
  onChange,
  disabled = false,
}: QuestionAnswerPassageComboboxProps) {
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

        const match = options.find((option) => option.label === nextValue);
        if (match) onChange(match.id);
      }}
      disabled={disabled}
    >
      <ComboboxInput
        className="w-full"
        placeholder="Select a Paragraph block..."
        disabled={disabled}
        showClear={Boolean(value) && !disabled}
      />
      <ComboboxContent>
        <ComboboxEmpty>No Paragraph block found in this content.</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item} value={item}>
              <span className="min-w-0 flex-1 truncate">{item}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
