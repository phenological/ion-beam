import { useState } from "react";

export function useStableByKey<T>(value: T, key: string): T {
  const [kept, setKept] = useState({ key, value });
  if (kept.key !== key) {
    setKept({ key, value });
    return value;
  }
  return kept.value;
}
