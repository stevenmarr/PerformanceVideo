import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { DrawingTitle } from "@/lib/drawing";
import { warningLine } from "@/lib/sheets/warnings";

function columns(header: string[]) {
  return header.map((name, index) => ({ name, index })).filter((column) => column.name !== "Cable ID");
}

function SheetTable({ rows }: { rows: string[][] }) {
  const header = rows[0] ?? [];
  const body = rows.slice(1);
  const cols = columns(header);
  if (!body.length) return <p className="shop-empty">No cables.</p>;
  return (
    <table>
      <thead>
        <tr>
          {cols.map((column) => (
            <th key={`${column.name}-${column.index}`}>{column.name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {body.map((row, index) => (
          <tr key={index}>
            {cols.map((column) => (
              <td key={column.index} className={column.name === "Note" && row[column.index] ? "shop-note" : undefined}>
                {row[column.index]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ShopPrint({
  show,
  title,
  warnings,
  patch,
  cables,
  flaggedOnly,
  onClose,
}: {
  show: string;
  title: DrawingTitle;
  warnings: { text: string; count: number }[];
  patch: string[][];
  cables: string[][];
  flaggedOnly: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.classList.add("shop-printing");
    return () => document.body.classList.remove("shop-printing");
  }, []);

  const bits = [show, title.event, title.location, title.date, title.drawnBy, title.version].map((part) => part.trim()).filter(Boolean);
  const heading = bits.filter((part, index) => bits.findIndex((item) => item.toLowerCase() === part.toLowerCase()) === index).join(" · ");

  return createPortal(
    <div className="shop-preview">
      <div className="shop-preview-chrome">
        <button type="button" onClick={() => window.print()}>
          Print
        </button>
        <button type="button" onClick={onClose}>
          Back
        </button>
        <p>Letter paper. A long list continues on the next page with the column headings.</p>
      </div>
      <article className="shop-print">
        <h1>{flaggedOnly ? "Flagged cables" : "Patch and cable pull"}</h1>
        <p className="shop-meta">{heading || "Drawing"}</p>
        {warnings.length ? (
          <ul className="shop-warnings">
            {warnings.map((item) => (
              <li key={item.text}>{warningLine(item)}</li>
            ))}
          </ul>
        ) : null}
        <h2>Patch</h2>
        <SheetTable rows={patch} />
        <h2>Cable pull</h2>
        <SheetTable rows={cables} />
      </article>
    </div>,
    document.body,
  );
}
