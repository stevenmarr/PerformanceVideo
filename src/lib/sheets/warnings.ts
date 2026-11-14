/** Repeated patch warnings become one line with a count. Flagged rows are the ones with a note. */

export function collapseWarnings(messages: string[]): { text: string; count: number }[] {
  const order: string[] = [];
  const counts = new Map<string, number>();
  for (const message of messages) {
    const text = message.trim();
    if (!text) continue;
    if (!counts.has(text)) order.push(text);
    counts.set(text, (counts.get(text) ?? 0) + 1);
  }
  return order.map((text) => ({ text, count: counts.get(text) ?? 1 }));
}

export function warningLine(item: { text: string; count: number }): string {
  return item.count > 1 ? `${item.text} × ${item.count}` : item.text;
}

export function rowsWithNote(rows: string[][]): string[][] {
  if (!rows.length) return rows;
  const note = rows[0].indexOf("Note");
  if (note < 0) return [rows[0]];
  return [rows[0], ...rows.slice(1).filter((row) => (row[note] ?? "").trim().length > 0)];
}
