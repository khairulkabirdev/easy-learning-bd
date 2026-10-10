"use client";

import { useEffect, useMemo, useState } from "react";

import { getBlockBoardYearOptions } from "@/app/admin/content/block-master-actions";
import { AdminMasterCombobox } from "@/components/admin/AdminMasterCombobox";
import { Label } from "@/components/ui/label";

type Options = Awaited<ReturnType<typeof getBlockBoardYearOptions>>;

let optionsPromise: Promise<Options> | null = null;

function loadOptions() {
  if (!optionsPromise) optionsPromise = getBlockBoardYearOptions();
  return optionsPromise;
}

export function BlockBoardYearFields({
  boardId,
  academicYearId,
  onChange,
  disabled = false,
}: {
  boardId?: string | null;
  academicYearId?: string | null;
  onChange: (value: { boardId: string | null; academicYearId: string | null }) => void;
  disabled?: boolean;
}) {
  const [options, setOptions] = useState<Options>({ boards: [], years: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void loadOptions()
      .then((result) => {
        if (active) setOptions(result);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const boardOptions = useMemo(
    () => options.boards.filter((item) => item.isActive || item.id === boardId),
    [boardId, options.boards],
  );

  const yearOptions = useMemo(
    () => options.years.filter((item) => item.isActive || item.id === academicYearId),
    [academicYearId, options.years],
  );

  return (
    <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>Board</Label>
        <AdminMasterCombobox
          value={boardId}
          options={boardOptions.map((board) => ({
            id: board.id,
            label: board.name,
            isActive: board.isActive,
          }))}
          onChange={(nextBoardId) =>
            onChange({
              boardId: nextBoardId,
              academicYearId: academicYearId || null,
            })
          }
          placeholder={loading ? "Loading boards..." : "Search or select board"}
          emptyText="No board found."
          disabled={disabled || loading}
        />
      </div>

      <div className="space-y-2">
        <Label>Year</Label>
        <AdminMasterCombobox
          value={academicYearId}
          options={yearOptions.map((year) => ({
            id: year.id,
            label: String(year.year),
            isActive: year.isActive,
          }))}
          onChange={(nextAcademicYearId) =>
            onChange({
              boardId: boardId || null,
              academicYearId: nextAcademicYearId,
            })
          }
          placeholder={loading ? "Loading years..." : "Search or select year"}
          emptyText="No year found."
          disabled={disabled || loading}
        />
      </div>
    </div>
  );
}
