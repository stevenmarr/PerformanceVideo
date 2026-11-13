/** Classify one SQL statement for the admin console. Not a second database role. */

export type SqlClass =
  | { ok: true; kind: "read" | "write"; sql: string }
  | { ok: false; reason: string };

const WRITE_WORD = /\b(insert|update|delete|merge|drop|alter|create|truncate|grant|revoke|copy|comment|reindex|vacuum|refresh|call|do)\b/i;
const READ_HEAD = /^(select|with|explain|show|values|table)\b/i;
const WRITE_HEAD = /^(insert|update|delete|merge|drop|alter|create|truncate|comment|reindex|refresh)\b/i;
const BLOCKED = /\b(pg_read_file|pg_read_binary_file|pg_write_file|pg_ls_dir|lo_import|lo_export|dblink|copy)\b/i;

export function stripSqlComments(input: string): string {
  let out = "";
  let i = 0;
  let mode: "code" | "line" | "block" | "sq" | "dq" = "code";
  while (i < input.length) {
    const c = input[i] ?? "";
    const n = input[i + 1] ?? "";
    if (mode === "code") {
      if (c === "-" && n === "-") {
        mode = "line";
        i += 2;
        continue;
      }
      if (c === "/" && n === "*") {
        mode = "block";
        i += 2;
        continue;
      }
      if (c === "'") {
        mode = "sq";
        out += c;
        i += 1;
        continue;
      }
      if (c === '"') {
        mode = "dq";
        out += c;
        i += 1;
        continue;
      }
      out += c;
      i += 1;
      continue;
    }
    if (mode === "line") {
      if (c === "\n") {
        mode = "code";
        out += c;
      }
      i += 1;
      continue;
    }
    if (mode === "block") {
      if (c === "*" && n === "/") {
        mode = "code";
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }
    out += c;
    if (mode === "sq" && c === "'" && n === "'") {
      out += n;
      i += 2;
      continue;
    }
    if ((mode === "sq" && c === "'") || (mode === "dq" && c === '"')) mode = "code";
    i += 1;
  }
  return out;
}

export function redactSqlLiterals(sql: string): string {
  return sql.replace(/'(?:[^']|'')*'/g, "'…'");
}

export function classifySql(raw: string): SqlClass {
  const stripped = stripSqlComments(raw).trim();
  if (!stripped) return { ok: false, reason: "Enter a statement." };
  if (stripped.includes("$$")) return { ok: false, reason: "Dollar-quoted strings are not allowed." };
  let sql = stripped;
  if (sql.endsWith(";")) sql = sql.slice(0, -1).trim();
  if (!sql) return { ok: false, reason: "Enter a statement." };
  if (sql.includes(";")) return { ok: false, reason: "Only one statement is allowed." };
  if (BLOCKED.test(sql)) return { ok: false, reason: "That statement is not allowed." };
  if (READ_HEAD.test(sql)) {
    if (WRITE_WORD.test(sql)) return { ok: true, kind: "write", sql };
    return { ok: true, kind: "read", sql };
  }
  if (WRITE_HEAD.test(sql)) return { ok: true, kind: "write", sql };
  return { ok: false, reason: "That statement is not allowed." };
}

export const SQL_WRITE_PHRASE = "WRITE";
export const SQL_WRITE_PHRASE_AGAIN = "CONFIRM WRITE";

export function writeConfirmed(first: string, second: string): boolean {
  return first === SQL_WRITE_PHRASE && second === SQL_WRITE_PHRASE_AGAIN;
}
