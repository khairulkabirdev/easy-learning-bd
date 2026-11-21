"use client";

import { createContext, useContext, useEffect, useRef } from "react";

export const ModelPaperMode = createContext<"attempt" | "review" | null>(null);
export const ModelPaperManualReview = createContext(false);

export function useModelPaperReview(reveal: () => void) {
  const mode = useContext(ModelPaperMode);
  const callback = useRef(reveal);
  useEffect(() => { callback.current = reveal; }, [reveal]);
  useEffect(() => { if (mode === "review") callback.current(); }, [mode]);
  return mode;
}
