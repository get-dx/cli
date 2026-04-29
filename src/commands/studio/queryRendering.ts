import { renderRichText } from "../../renderers.js";
import * as ui from "../../ui.js";

type QueryResults = {
  columns: string[];
  rows: unknown[][];
};

export function renderQueryResultsTable(results: QueryResults): void {
  renderRichText([ui.p(formatAsciiTable(results.columns, results.rows))]);
}

export function renderCsvSaved(filename: string): void {
  renderRichText([ui.p(`Saved CSV results to ${ui.code(filename)}.`)]);
}

function formatAsciiTable(columns: string[], rows: unknown[][]): string {
  if (columns.length === 0) {
    return "(Query returned no columns)";
  }

  const normalizedRows = rows.map((row) =>
    columns.map((_, index) => formatCell(row[index])),
  );
  const widths = columns.map((column, index) =>
    Math.max(
      column.length,
      ...normalizedRows.map((row) => row[index]?.length ?? 0),
    ),
  );

  const border = `+${widths.map((width) => "-".repeat(width + 2)).join("+")}+`;
  const header = `| ${columns.map((column, index) => column.padEnd(widths[index])).join(" | ")} |`;
  const body = normalizedRows.map(
    (row) =>
      `| ${row.map((cell, index) => cell.padEnd(widths[index])).join(" | ")} |`,
  );

  return [border, header, border, ...body, border].join("\n");
}

function formatCell(value: unknown): string {
  if (value === null) {
    return "NULL";
  }

  if (value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return sanitizeCell(value);
  }

  if (
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return sanitizeCell(JSON.stringify(value) ?? String(value));
}

function sanitizeCell(value: string): string {
  return value.replace(/\r?\n/g, "\\n").replace(/\t/g, " ");
}
