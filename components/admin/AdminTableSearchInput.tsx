"use client";

import { Search } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

type AdminTableSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
};

export function AdminTableSearchInput({
  value,
  onChange,
  placeholder = "Search...",
  ariaLabel = "Search records",
  className,
}: AdminTableSearchInputProps) {
  return (
    <InputGroup className={cn("w-full", className)}>
      <InputGroupAddon align="inline-start" aria-hidden="true">
        <Search className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
    </InputGroup>
  );
}
