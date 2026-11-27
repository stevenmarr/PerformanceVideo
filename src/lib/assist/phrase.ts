/** A small grammar for "add a 2 M/E switcher with 8 cameras". The engineer reviews it before anything is placed. */

export type PhraseItem = {
  count: number;
  category: "Switcher" | "Camera" | "Monitor" | "Recorder" | "Projector" | "Multiviewer";
  note: string;
};

export type PhrasePlan = {
  summary: string;
  items: PhraseItem[];
};

function countOf(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  if (!match?.[1]) return null;
  const count = Number(match[1]);
  if (!Number.isInteger(count) || count < 1 || count > 64) return null;
  return count;
}

export function parseShowPhrase(text: string): PhrasePlan | null {
  const raw = text.trim();
  if (!raw) return null;
  const items: PhraseItem[] = [];
  const me = raw.match(/(\d+)\s*m\s*\/?\s*e/i);
  if (/switcher/i.test(raw) || me) {
    const count = countOf(raw, /(\d+)\s+switchers?/i) ?? 1;
    const note = me ? `${me[1]} M/E` : "switcher";
    items.push({ count, category: "Switcher", note });
  }
  const cameras = countOf(raw, /(\d+)\s+(?:ptz\s+)?cameras?/i);
  if (cameras) items.push({ count: cameras, category: "Camera", note: /ptz/i.test(raw) ? "PTZ" : "camera" });
  const monitors = countOf(raw, /(\d+)\s+monitors?/i);
  if (monitors) items.push({ count: monitors, category: "Monitor", note: "monitor" });
  const recorders = countOf(raw, /(\d+)\s+(?:recorders?|hyperdecks?|decks?)/i);
  if (recorders) items.push({ count: recorders, category: "Recorder", note: "record" });
  const projectors = countOf(raw, /(\d+)\s+projectors?/i);
  if (projectors) items.push({ count: projectors, category: "Projector", note: "projector" });
  const multiviewers = countOf(raw, /(\d+)\s+multiviewers?/i);
  if (multiviewers) items.push({ count: multiviewers, category: "Multiviewer", note: "multiview" });
  if (!items.length) return null;
  const summary = items.map((item) => `${item.count} ${item.note}`).join(", ");
  return { summary, items };
}

export type LibraryMatch = { id: number; model: string; manufacturer: string; deviceType: string };

export function matchPhrase(plan: PhrasePlan, library: LibraryMatch[]): { item: PhraseItem; gear: LibraryMatch | null }[] {
  return plan.items.map((item) => {
    const pool = library.filter((gear) => gear.deviceType === item.category);
    const preferred =
      item.category === "Switcher" && /2/.test(item.note)
        ? pool.find((gear) => /constellation|2\s*m\/e|television studio/i.test(gear.model))
        : item.category === "Camera" && item.note === "PTZ"
          ? pool.find((gear) => /ue160|ue150|brc|fr7|ptz/i.test(gear.model))
          : pool[0];
    return { item, gear: preferred ?? pool[0] ?? null };
  });
}
