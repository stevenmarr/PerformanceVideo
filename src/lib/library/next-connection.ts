/**
 * Prefill the next connection row from the last one the user added.
 * The trailing number increments; direction and signal stay the same.
 */
export type ConnectionDraft = {
  label: string;
  direction: string;
  signal: string;
};

export function incrementTrailingNumber(label: string): string {
  const trimmed = label.trimEnd();
  const match = trimmed.match(/^(.*?)(\d+)$/);
  if (!match) {
    const base = trimmed.trim();
    return base ? `${base} 2` : "";
  }
  const prefix = match[1];
  const digits = match[2];
  const next = String(Number(digits) + 1).padStart(digits.length, "0");
  return `${prefix}${next}`;
}

export function nextConnection(
  last: ConnectionDraft | undefined,
  fallbackSignal = "",
): ConnectionDraft {
  if (!last) {
    return { label: "", direction: "input", signal: fallbackSignal };
  }
  return {
    label: incrementTrailingNumber(last.label),
    direction:
      last.direction === "output" ? "output" : last.direction === "input" ? "input" : "input",
    signal: last.signal || fallbackSignal,
  };
}
