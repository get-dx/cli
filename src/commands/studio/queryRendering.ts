import { stripVTControlCharacters } from "node:util";

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

export class QueryProgressReporter {
  private readonly enabled = Boolean(process.stderr.isTTY);
  private readonly frames = [
    "⠋",
    "⠙",
    "⠹",
    "⠸",
    "⠼",
    "⠴",
    "⠦",
    "⠧",
    "⠇",
    "⠏",
  ].map((frame) => ui.dim(frame));
  private timer?: ReturnType<typeof setInterval>;
  private frameIndex = 0;
  private currentMessage = "";
  private lastLineLength = 0;

  start(message: string): void {
    if (!this.enabled) {
      return;
    }

    this.currentMessage = message;
    this.render();
    this.timer = setInterval(() => this.render(), 80);
    this.timer.unref?.();
  }

  update(message: string): void {
    if (!this.enabled) {
      return;
    }

    this.currentMessage = message;
    this.render();
  }

  stop(finalMessage?: string): void {
    if (!this.enabled) {
      return;
    }

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    if (finalMessage) {
      process.stderr.write(`\r${this.padLine(finalMessage)}\n`);
      this.lastLineLength = 0;
      return;
    }

    if (this.lastLineLength > 0) {
      process.stderr.write(`\r${" ".repeat(this.lastLineLength)}\r`);
      this.lastLineLength = 0;
    }
  }

  private render(): void {
    const frame = this.frames[this.frameIndex % this.frames.length];
    this.frameIndex += 1;
    process.stderr.write(
      `\r${this.padLine(`${frame} ${this.currentMessage}`)}`,
    );
  }

  private padLine(text: string): string {
    const visibleLength = this.visibleLength(text);
    const padded =
      text + " ".repeat(Math.max(0, this.lastLineLength - visibleLength));
    this.lastLineLength = Math.max(this.lastLineLength, visibleLength);
    return padded;
  }

  private visibleLength(text: string): number {
    return stripVTControlCharacters(text).length;
  }
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
