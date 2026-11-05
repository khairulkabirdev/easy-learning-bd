"use client";

import { CheckCircle2, Eye, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PracticeAnswerActionsProps = {
  onCheck?: () => void;
  onPreview: () => void;
  onReset: () => void;
  checkDisabled?: boolean;
  checkLabel?: string;
  previewLabel?: string;
  resetLabel?: string;
  ariaLabel?: string;
  className?: string;
};

/** Shared, local-to-the-question controls for the student practice viewers. */
export function PracticeAnswerActions({
  onCheck,
  onPreview,
  onReset,
  checkDisabled = false,
  checkLabel = "Check Answer",
  previewLabel = "Preview Answer",
  resetLabel = "Reset Answer",
  ariaLabel = "Answer actions",
  className,
}: PracticeAnswerActionsProps) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn("flex w-full flex-wrap items-center gap-2", className)}>
      {onCheck ? (
        <Button type="button" size="sm" className="min-h-10 flex-1 cursor-pointer sm:flex-none" disabled={checkDisabled} onClick={onCheck}>
          <CheckCircle2 className="mr-1.5 h-4 w-4" />
          {checkLabel}
        </Button>
      ) : null}
      <Button type="button" variant="outline" size="sm" className="min-h-10 flex-1 cursor-pointer sm:flex-none" onClick={onPreview}>
        <Eye className="mr-1.5 h-4 w-4" />
        {previewLabel}
      </Button>
      <Button type="button" variant="ghost" size="sm" className="min-h-10 flex-1 cursor-pointer text-muted-foreground hover:text-foreground sm:flex-none" onClick={onReset}>
        <RotateCcw className="mr-1.5 h-4 w-4" />
        {resetLabel}
      </Button>
    </div>
  );
}
