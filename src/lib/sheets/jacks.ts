/** The name printed on a jack, and whether that jack is safe to cable. */

export type JackRef = { id?: string | null; label?: string | null };
export type JackCaution = "unverified" | "unknown-count";

export function jackName(pin: JackRef | null | undefined): string {
  const label = pin?.label?.trim() ?? "";
  if (label) return label;
  return pin?.id?.trim() ?? "";
}

export function jackCaution(pin: JackRef | null | undefined): JackCaution | null {
  const label = pin?.label ?? "";
  if (/count unknown/i.test(label)) return "unknown-count";
  if (/unverified/i.test(label)) return "unverified";
  return null;
}

/** One line for a sheet row. Empty when both jacks are ordinary named connectors. */
export function cableCaution(from: JackRef | null | undefined, to: JackRef | null | undefined): string {
  const parts: string[] = [];
  const output = jackCaution(from);
  const input = jackCaution(to);
  if (output === "unverified") parts.push(`Unverified output: ${jackName(from)}`);
  if (output === "unknown-count") parts.push(`Unknown count on output: ${jackName(from)}`);
  if (input === "unverified") parts.push(`Unverified input: ${jackName(to)}`);
  if (input === "unknown-count") parts.push(`Unknown count on input: ${jackName(to)}`);
  return parts.join(". ");
}
