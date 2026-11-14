import { useEffect, useState } from "react";
import {
  adminDeleteRow,
  adminSql,
  adminTableCsv,
  adminTablePage,
  adminTables,
  adminUpdateRow,
} from "@/lib/admin/browser.functions";

type Row = { cells: Record<string, string>; key: Record<string, string> };

export function DatabasePanel() {
  const [tables, setTables] = useState<string[]>([]);
  const [table, setTable] = useState("");
  const [filterColumn, setFilterColumn] = useState("");
  const [filterOp, setFilterOp] = useState("contains");
  const [filterValue, setFilterValue] = useState("");
  const [sortColumn, setSortColumn] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [offset, setOffset] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [columns, setColumns] = useState<{ name: string; primaryKey: boolean }[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Row | null>(null);
  const [draft, setDraft] = useState("");
  const [editPhrase, setEditPhrase] = useState("");
  const [deletePhrase, setDeletePhrase] = useState("");
  const [writeMode, setWriteMode] = useState(false);
  const [sql, setSql] = useState("select 1 as ok");
  const [sqlConfirm, setSqlConfirm] = useState("");
  const [sqlConfirmAgain, setSqlConfirmAgain] = useState("");
  const [sqlColumns, setSqlColumns] = useState<string[]>([]);
  const [sqlRows, setSqlRows] = useState<Record<string, string>[]>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function load(nextOffset = offset, nextTable = table) {
    if (!nextTable) return;
    const result = await adminTablePage({
      data: {
        table: nextTable,
        filterColumn,
        filterOp,
        filterValue,
        sortColumn,
        sortDir,
        limit: 50,
        offset: nextOffset,
        reveal,
      },
    });
    setError(result.error ?? "");
    setColumns(result.columns);
    setRows(result.rows);
    setTotal(result.total);
  }

  useEffect(() => {
    void adminTables()
      .then((result) => {
        setTables(result.tables);
        if (result.tables[0]) {
          setTable(result.tables[0]);
          return load(0, result.tables[0]);
        }
        return undefined;
      })
      .catch(() => setError("The table list could not be loaded."));
  }, []);

  return (
    <div className="mt-6 space-y-8">
      <section>
        <h2 className="text-lg font-semibold">Tables</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Read-only until write mode is on. Password columns stay masked unless you reveal them, and that reveal is audited.
          Row edits cannot change password or token columns.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <select
            value={table}
            onChange={(event) => {
              setTable(event.target.value);
              setOffset(0);
              setSelected(null);
              void load(0, event.target.value);
            }}
            className="rounded-xl border border-line bg-panel px-3 py-2 text-sm"
          >
            {tables.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <select value={filterColumn} onChange={(event) => setFilterColumn(event.target.value)} className="rounded-xl border border-line bg-panel px-3 py-2 text-sm">
            <option value="">Filter column</option>
            {columns.map((column) => (
              <option key={column.name} value={column.name}>{column.name}</option>
            ))}
          </select>
          <select value={filterOp} onChange={(event) => setFilterOp(event.target.value)} className="rounded-xl border border-line bg-panel px-3 py-2 text-sm">
            <option value="contains">contains</option>
            <option value="eq">equals</option>
            <option value="gt">greater</option>
            <option value="lt">less</option>
          </select>
          <input value={filterValue} onChange={(event) => setFilterValue(event.target.value)} placeholder={filterColumn ? "Filter" : "Search all columns"} className="rounded-xl border border-line bg-panel px-3 py-2 text-sm" />
          <select value={sortColumn} onChange={(event) => setSortColumn(event.target.value)} className="rounded-xl border border-line bg-panel px-3 py-2 text-sm">
            <option value="">Sort</option>
            {columns.map((column) => (
              <option key={column.name} value={column.name}>{column.name}</option>
            ))}
          </select>
          <select value={sortDir} onChange={(event) => setSortDir(event.target.value === "desc" ? "desc" : "asc")} className="rounded-xl border border-line bg-panel px-3 py-2 text-sm">
            <option value="asc">asc</option>
            <option value="desc">desc</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={reveal} onChange={(event) => setReveal(event.target.checked)} />
            Reveal secrets
          </label>
          <button type="button" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper" onClick={() => { setOffset(0); void load(0); }}>
            Apply
          </button>
          <button
            type="button"
            className="rounded-full border border-line px-4 py-2 text-sm"
            onClick={() =>
              void adminTableCsv({ data: { table, filterColumn, filterOp, filterValue, reveal } }).then((result) => {
                if (result.error || !result.csv) {
                  setError(result.error ?? "No rows.");
                  return;
                }
                const blob = new Blob([result.csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `${table}.csv`;
                anchor.click();
                URL.revokeObjectURL(url);
              })
            }
          >
            Export CSV
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">{total} rows · showing {rows.length} from {offset + 1}</p>
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        {note ? <p className="mt-2 text-sm">{note}</p> : null}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-line">
                {columns.map((column) => (
                  <th key={column.name} className="px-2 py-2 font-medium">{column.name}{column.primaryKey ? " *" : ""}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="cursor-pointer border-b border-line hover:bg-panel" onClick={() => { setSelected(row); setDraft(JSON.stringify(row.cells, null, 2)); }}>
                  {columns.map((column) => (
                    <td key={column.name} className="max-w-56 truncate px-2 py-2">{row.cells[column.name]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" className="rounded-full border border-line px-4 py-2 text-sm" disabled={offset === 0} onClick={() => { const next = Math.max(0, offset - 50); setOffset(next); void load(next); }}>Previous</button>
          <button type="button" className="rounded-full border border-line px-4 py-2 text-sm" disabled={offset + rows.length >= total} onClick={() => { const next = offset + 50; setOffset(next); void load(next); }}>Next</button>
        </div>
        {selected ? (
          <div className="mt-4 rounded-2xl border border-line p-4">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={writeMode} onChange={(event) => setWriteMode(event.target.checked)} />
              Write mode
            </label>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="mt-2 min-h-40 w-full rounded-xl border border-line bg-panel px-3 py-2 font-mono text-xs" />
            {writeMode ? (
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <input value={editPhrase} onChange={(event) => setEditPhrase(event.target.value)} placeholder="Type EDIT ROW" className="rounded-xl border border-line bg-panel px-3 py-2 text-sm" />
                <button
                  type="button"
                  className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper"
                  onClick={() => {
                    let changes: Record<string, string>;
                    try {
                      const parsed = JSON.parse(draft) as unknown;
                      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("row");
                      changes = Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, value == null ? "" : String(value)]));
                    } catch {
                      setError("That row is not valid JSON.");
                      return;
                    }
                    void adminUpdateRow({ data: { table, key: selected.key, changes, confirm: editPhrase } }).then((result) => {
                      setError(result.error ?? "");
                      if (!result.error) {
                        setNote("Row updated.");
                        void load();
                      }
                    });
                  }}
                >
                  Save row
                </button>
                <input value={deletePhrase} onChange={(event) => setDeletePhrase(event.target.value)} placeholder="Type DELETE ROW" className="rounded-xl border border-line bg-panel px-3 py-2 text-sm" />
                <button
                  type="button"
                  className="rounded-full border border-line px-4 py-2 text-sm text-danger"
                  onClick={() =>
                    void adminDeleteRow({ data: { table, key: selected.key, confirm: deletePhrase } }).then((result) => {
                      setError(result.error ?? "");
                      if (!result.error) {
                        setSelected(null);
                        setNote("Row deleted.");
                        void load();
                      }
                    })
                  }
                >
                  Delete row
                </button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">Turn on write mode and type the confirmation phrase before a change is saved.</p>
            )}
          </div>
        ) : null}
      </section>
      <section>
        <h2 className="text-lg font-semibold">SQL console</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          One statement. Reads run as-is. Writes run only after you type WRITE and CONFIRM WRITE. Sensitive cells in the result stay masked.
        </p>
        <textarea value={sql} onChange={(event) => setSql(event.target.value)} className="mt-3 min-h-28 w-full rounded-xl border border-line bg-panel px-3 py-2 font-mono text-sm" />
        <div className="mt-2 flex flex-wrap gap-2">
          <input value={sqlConfirm} onChange={(event) => setSqlConfirm(event.target.value)} placeholder="WRITE" className="rounded-xl border border-line bg-panel px-3 py-2 text-sm" />
          <input value={sqlConfirmAgain} onChange={(event) => setSqlConfirmAgain(event.target.value)} placeholder="CONFIRM WRITE" className="rounded-xl border border-line bg-panel px-3 py-2 text-sm" />
          <button
            type="button"
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper"
            onClick={() =>
              void adminSql({ data: { sql, confirm: sqlConfirm, confirmAgain: sqlConfirmAgain } }).then((result) => {
                setError(result.error ?? "");
                setSqlColumns(result.columns);
                setSqlRows(result.rows);
                if (!result.error && "note" in result && result.note) setNote(result.note);
              })
            }
          >
            Run
          </button>
        </div>
        {sqlColumns.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line">{sqlColumns.map((column) => <th key={column} className="px-2 py-2 font-medium">{column}</th>)}</tr>
              </thead>
              <tbody>
                {sqlRows.map((row, index) => (
                  <tr key={index} className="border-b border-line">
                    {sqlColumns.map((column) => <td key={column} className="max-w-56 truncate px-2 py-2">{row[column]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
