/** Safe table-browser queries. Identifiers come from the catalog, values stay parameters. */

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SENSITIVE = /password|token|secret|hash|cookie/i;

export type FilterOp = "eq" | "contains" | "gt" | "lt";
export type SortDir = "asc" | "desc";

export function isSensitiveColumn(name: string): boolean {
  return SENSITIVE.test(name);
}

export function quoteIdent(name: string): string {
  if (!IDENT.test(name)) throw new Error("Invalid identifier");
  return `"${name}"`;
}

export function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsv(columns: string[], rows: Record<string, string>[]): string {
  const lines = [columns.map(csvCell).join(",")];
  for (const row of rows) lines.push(columns.map((column) => csvCell(row[column] ?? "")).join(","));
  return lines.join("\n");
}

export function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export type TableQueryInput = {
  table: string;
  columns: string[];
  filter?: { column: string; op: FilterOp; value: string } | null;
  search?: string | null;
  sort?: { column: string; dir: SortDir } | null;
  limit: number;
  offset: number;
  maxLimit?: number;
};

function whereClause(input: TableQueryInput): { sql: string; params: unknown[] } {
  const filter = input.filter;
  if (!filter || !filter.value.trim() || !input.columns.includes(filter.column)) {
    const search = input.search?.trim();
    if (!search) return { sql: "", params: [] };
    const columns = input.columns.filter((name) => !isSensitiveColumn(name));
    if (!columns.length) return { sql: "", params: [] };
    const pattern = likePattern(search);
    return {
      sql: ` where (${columns.map((name, index) => `${quoteIdent(name)}::text ilike $${index + 1} escape '\\'`).join(" or ")})`,
      params: columns.map(() => pattern),
    };
  }
  const column = `${quoteIdent(filter.column)}::text`;
  if (filter.op === "contains") {
    return { sql: ` where ${column} ilike $1 escape '\\'`, params: [likePattern(filter.value.trim())] };
  }
  if (filter.op === "gt") return { sql: ` where ${column} > $1`, params: [filter.value] };
  if (filter.op === "lt") return { sql: ` where ${column} < $1`, params: [filter.value] };
  return { sql: ` where ${column} = $1`, params: [filter.value] };
}

export function buildTableSelect(input: TableQueryInput): { text: string; params: unknown[]; countText: string } {
  if (!input.columns.length) throw new Error("No columns");
  const table = quoteIdent(input.table);
  const cols = input.columns.map(quoteIdent).join(", ");
  const where = whereClause(input);
  let order = "";
  if (input.sort && input.columns.includes(input.sort.column)) {
    const dir = input.sort.dir === "desc" ? "desc" : "asc";
    order = ` order by ${quoteIdent(input.sort.column)} ${dir}`;
  }
  const limit = Math.min(input.maxLimit ?? 200, Math.max(1, Math.floor(input.limit)));
  const offset = Math.max(0, Math.floor(input.offset));
  const params = [...where.params, limit, offset];
  const limitIndex = where.params.length + 1;
  const text = `select ${cols} from ${table}${where.sql}${order} limit $${limitIndex} offset $${limitIndex + 1}`;
  const countText = `select count(*)::int as count from ${table}${where.sql}`;
  return { text, params, countText };
}

export function buildRowUpdate(input: {
  table: string;
  columns: string[];
  primaryKey: string[];
  changes: Record<string, string>;
  key: Record<string, string>;
}): { text: string; params: unknown[] } | { error: string } {
  if (!input.primaryKey.length) return { error: "This table has no primary key, so rows cannot be edited here." };
  const names = Object.keys(input.changes).filter((name) => input.columns.includes(name));
  if (!names.length) return { error: "Nothing to update." };
  const sensitive = names.filter(isSensitiveColumn);
  if (sensitive.length) return { error: "Password and token columns are changed through the account tools, not the grid." };
  for (const key of input.primaryKey) {
    if (!input.columns.includes(key) || input.key[key] == null) return { error: "Missing primary key." };
  }
  const params: unknown[] = [];
  const sets = names.map((name) => {
    params.push(input.changes[name] ?? "");
    return `${quoteIdent(name)} = $${params.length}`;
  });
  const where = input.primaryKey.map((name) => {
    params.push(input.key[name] ?? "");
    return `${quoteIdent(name)}::text = $${params.length}`;
  });
  return {
    text: `update ${quoteIdent(input.table)} set ${sets.join(", ")} where ${where.join(" and ")}`,
    params,
  };
}

export function buildRowDelete(input: {
  table: string;
  columns: string[];
  primaryKey: string[];
  key: Record<string, string>;
}): { text: string; params: unknown[] } | { error: string } {
  if (!input.primaryKey.length) return { error: "This table has no primary key, so rows cannot be deleted here." };
  for (const key of input.primaryKey) {
    if (!input.columns.includes(key) || input.key[key] == null) return { error: "Missing primary key." };
  }
  const params: unknown[] = [];
  const where = input.primaryKey.map((name) => {
    params.push(input.key[name] ?? "");
    return `${quoteIdent(name)}::text = $${params.length}`;
  });
  return { text: `delete from ${quoteIdent(input.table)} where ${where.join(" and ")}`, params };
}

export const ROW_EDIT_PHRASE = "EDIT ROW";
export const ROW_DELETE_PHRASE = "DELETE ROW";

export function cellText(value: unknown, column: string, reveal: boolean): string {
  if (!reveal && isSensitiveColumn(column) && value != null && value !== "") return "••••";
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
