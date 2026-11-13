import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireAdmin, writeAudit } from "@/lib/admin/access";
import { classifySql, redactSqlLiterals, writeConfirmed } from "@/lib/admin/sql-guard";
import {
  ROW_DELETE_PHRASE,
  ROW_EDIT_PHRASE,
  buildRowDelete,
  buildRowUpdate,
  buildTableSelect,
  cellText,
  toCsv,
  type FilterOp,
  type SortDir,
} from "@/lib/admin/table-query";

type ColumnInfo = { name: string; primaryKey: boolean };

async function loadColumns(sql: { query: <T>(text: string, params?: unknown[]) => Promise<T[]> }, table: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) return null;
  const known = await sql.query<{ table_name: string }>(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE' and table_name = $1`,
    [table],
  );
  if (!known.length) return null;
  const columns = await sql.query<{ column_name: string }>(
    `select column_name from information_schema.columns
     where table_schema = 'public' and table_name = $1
     order by ordinal_position`,
    [table],
  );
  const keys = await sql.query<{ column_name: string }>(
    `select kcu.column_name
     from information_schema.table_constraints tc
     join information_schema.key_column_usage kcu
       on tc.constraint_name = kcu.constraint_name
      and tc.table_schema = kcu.table_schema
      and tc.table_name = kcu.table_name
     where tc.table_schema = 'public' and tc.table_name = $1 and tc.constraint_type = 'PRIMARY KEY'
     order by kcu.ordinal_position`,
    [table],
  );
  const primary = new Set(keys.map((row) => row.column_name));
  return {
    columns: columns.map((row) => row.column_name),
    described: columns.map((row): ColumnInfo => ({ name: row.column_name, primaryKey: primary.has(row.column_name) })),
    primaryKey: keys.map((row) => row.column_name),
  };
}

function asOp(value: string): FilterOp {
  if (value === "contains" || value === "gt" || value === "lt") return value;
  return "eq";
}

export const adminTables = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const opened = await requireAdmin(context.userId);
    if (!opened) return { admin: false as const, tables: [] as string[] };
    const rows = await opened.sql.query<{ table_name: string }>(
      `select table_name from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE'
       order by table_name`,
    );
    return { admin: true as const, tables: rows.map((row) => row.table_name) };
  });

export const adminTablePage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      table: string;
      filterColumn: string;
      filterOp: string;
      filterValue: string;
      sortColumn: string;
      sortDir: string;
      limit: number;
      offset: number;
      reveal: boolean;
    }) => ({
      table: String(input?.table ?? ""),
      filterColumn: String(input?.filterColumn ?? ""),
      filterOp: String(input?.filterOp ?? "eq"),
      filterValue: String(input?.filterValue ?? ""),
      sortColumn: String(input?.sortColumn ?? ""),
      sortDir: input?.sortDir === "desc" ? "desc" : "asc",
      limit: Number(input?.limit) || 50,
      offset: Number(input?.offset) || 0,
      reveal: Boolean(input?.reveal),
    }),
  )
  .handler(async ({ context, data }) => {
    const opened = await requireAdmin(context.userId);
    if (!opened) return { error: "Not an admin.", columns: [] as ColumnInfo[], rows: [], total: 0, primaryKey: [] as string[] };
    const meta = await loadColumns(opened.sql, data.table);
    if (!meta) return { error: "Unknown table.", columns: [], rows: [], total: 0, primaryKey: [] };
    if (data.reveal) {
      await writeAudit(opened.sql, opened.actor.id, "db.reveal", "table", data.table, "showed sensitive columns");
    }
    const query = buildTableSelect({
      table: data.table,
      columns: meta.columns,
      filter: data.filterValue ? { column: data.filterColumn, op: asOp(data.filterOp), value: data.filterValue } : null,
      sort: data.sortColumn ? { column: data.sortColumn, dir: data.sortDir as SortDir } : null,
      limit: data.limit,
      offset: data.offset,
    });
    const countRows = await opened.sql.query<{ count: number }>(query.countText, query.params.slice(0, query.params.length - 2));
    const raw = await opened.sql.query<Record<string, unknown>>(query.text, query.params);
    const rows = raw.map((row) => {
      const cells: Record<string, string> = {};
      const key: Record<string, string> = {};
      for (const column of meta.columns) cells[column] = cellText(row[column], column, data.reveal);
      for (const column of meta.primaryKey) key[column] = cellText(row[column], column, true);
      return { cells, key };
    });
    return {
      error: null,
      columns: meta.described,
      rows,
      total: Number(countRows[0]?.count ?? 0),
      primaryKey: meta.primaryKey,
    };
  });

export const adminTableCsv = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { table: string; filterColumn: string; filterOp: string; filterValue: string; reveal: boolean }) => ({
    table: String(input?.table ?? ""),
    filterColumn: String(input?.filterColumn ?? ""),
    filterOp: String(input?.filterOp ?? "eq"),
    filterValue: String(input?.filterValue ?? ""),
    reveal: Boolean(input?.reveal),
  }))
  .handler(async ({ context, data }) => {
    const opened = await requireAdmin(context.userId);
    if (!opened) return { error: "Not an admin.", csv: "" };
    const meta = await loadColumns(opened.sql, data.table);
    if (!meta) return { error: "Unknown table.", csv: "" };
    const query = buildTableSelect({
      table: data.table,
      columns: meta.columns,
      filter: data.filterValue ? { column: data.filterColumn, op: asOp(data.filterOp), value: data.filterValue } : null,
      limit: 200,
      offset: 0,
    });
    const raw = await opened.sql.query<Record<string, unknown>>(query.text, query.params);
    await writeAudit(opened.sql, opened.actor.id, "db.export", "table", data.table, `${raw.length} rows`);
    const rows = raw.map((row) => {
      const cells: Record<string, string> = {};
      for (const column of meta.columns) cells[column] = cellText(row[column], column, data.reveal);
      return cells;
    });
    return { error: null, csv: toCsv(meta.columns, rows) };
  });

export const adminUpdateRow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { table: string; key: Record<string, string>; changes: Record<string, string>; confirm: string }) => ({
    table: String(input?.table ?? ""),
    key: input?.key ?? {},
    changes: input?.changes ?? {},
    confirm: String(input?.confirm ?? ""),
  }))
  .handler(async ({ context, data }) => {
    const opened = await requireAdmin(context.userId);
    if (!opened) return { error: "Not an admin." };
    if (data.confirm !== ROW_EDIT_PHRASE) return { error: `Type ${ROW_EDIT_PHRASE} to edit a row.` };
    const meta = await loadColumns(opened.sql, data.table);
    if (!meta) return { error: "Unknown table." };
    const built = buildRowUpdate({
      table: data.table,
      columns: meta.columns,
      primaryKey: meta.primaryKey,
      changes: data.changes,
      key: data.key,
    });
    if ("error" in built) return { error: built.error };
    await opened.sql.query(built.text, built.params);
    await writeAudit(
      opened.sql,
      opened.actor.id,
      "db.update",
      "table",
      data.table,
      `key ${JSON.stringify(data.key)} columns ${Object.keys(data.changes).join(",")}`,
    );
    return { error: null };
  });

export const adminDeleteRow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { table: string; key: Record<string, string>; confirm: string }) => ({
    table: String(input?.table ?? ""),
    key: input?.key ?? {},
    confirm: String(input?.confirm ?? ""),
  }))
  .handler(async ({ context, data }) => {
    const opened = await requireAdmin(context.userId);
    if (!opened) return { error: "Not an admin." };
    if (data.confirm !== ROW_DELETE_PHRASE) return { error: `Type ${ROW_DELETE_PHRASE} to delete a row.` };
    const meta = await loadColumns(opened.sql, data.table);
    if (!meta) return { error: "Unknown table." };
    const built = buildRowDelete({ table: data.table, columns: meta.columns, primaryKey: meta.primaryKey, key: data.key });
    if ("error" in built) return { error: built.error };
    await opened.sql.query(built.text, built.params);
    await writeAudit(opened.sql, opened.actor.id, "db.delete", "table", data.table, JSON.stringify(data.key));
    return { error: null };
  });

export const adminSql = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { sql: string; confirm: string; confirmAgain: string }) => ({
    sql: String(input?.sql ?? ""),
    confirm: String(input?.confirm ?? ""),
    confirmAgain: String(input?.confirmAgain ?? ""),
  }))
  .handler(async ({ context, data }) => {
    const opened = await requireAdmin(context.userId);
    if (!opened) return { error: "Not an admin.", columns: [] as string[], rows: [] as Record<string, string>[] };
    if (data.sql.length > 8000) return { error: "That statement is too long.", columns: [], rows: [] };
    const classified = classifySql(data.sql);
    if (!classified.ok) return { error: classified.reason, columns: [], rows: [] };
    if (classified.kind === "write" && !writeConfirmed(data.confirm, data.confirmAgain)) {
      return { error: "Writes stay off until both phrases match.", columns: [], rows: [] };
    }
    try {
      const raw = await opened.sql.query<Record<string, unknown>>(classified.sql);
      await writeAudit(
        opened.sql,
        opened.actor.id,
        classified.kind === "write" ? "sql.write" : "sql.read",
        "sql",
        "",
        redactSqlLiterals(classified.sql),
      );
      const columns = raw[0] ? Object.keys(raw[0]) : [];
      const rows = raw.slice(0, 200).map((row) => {
        const cells: Record<string, string> = {};
        for (const column of columns) cells[column] = cellText(row[column], column, false);
        return cells;
      });
      return { error: null, columns, rows, note: raw.length > 200 ? "Showing the first 200 rows." : `${raw.length} row(s).` };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "The statement failed.", columns: [], rows: [] };
    }
  });
