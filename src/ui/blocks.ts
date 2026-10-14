import pc from "picocolors";

import { padEnd, indent } from "../ui.js";

export abstract class AbstractBlock {
  abstract render(): string;
}

export class HeadingBlock extends AbstractBlock {
  private readonly text: string;
  private readonly level: number;
  constructor(text: string, level: number) {
    super();
    this.text = text;
    this.level = level;
  }

  render(): string {
    return pc.bold(pc.blue("#".repeat(this.level) + " " + this.text)) + "\n";
  }
}

export class ParagraphBlock extends AbstractBlock {
  private readonly text: string;
  private readonly finalSpace: boolean;
  constructor(text: string, finalSpace = true) {
    super();
    this.text = text;
    this.finalSpace = finalSpace;
  }

  render(): string {
    return this.text + (this.finalSpace ? "\n" : "");
  }
}

export class UnorderedListBlock extends AbstractBlock {
  private readonly items: ListItemContainer[];
  constructor(items: ListItemContainer[]) {
    super();
    this.items = items;
  }

  render(): string {
    const renderedItems = this.items.map((item) => indent(item.render(), 1));
    return (
      renderedItems
        .map((renderedItem) => "- " + renderedItem.substring(2))
        .join("\n") + "\n"
    );
  }
}

export class ListItemContainer extends AbstractBlock {
  private readonly items: AbstractBlock[];
  constructor(items: AbstractBlock[]) {
    super();
    this.items = items;
  }

  render(): string {
    return this.items.map((item) => item.render()).join("\n");
  }
}

export type DescriptionListBlockOptions = {
  termWidth: number;
};

export class DescriptionListBlock extends AbstractBlock {
  private readonly items: DescriptionListItemContainer[];
  private readonly options?: DescriptionListBlockOptions;
  constructor(
    items: DescriptionListItemContainer[],
    options?: DescriptionListBlockOptions,
  ) {
    super();
    this.items = items;
    this.options = options;
  }

  render(): string {
    this.items.forEach((item) => item.setOptions(this.options));
    return this.items.map((item) => item.render()).join("\n") + "\n";
  }
}

export class DescriptionListItemContainer extends AbstractBlock {
  private readonly term: string;
  private readonly detailItems: AbstractBlock[];
  private options?: DescriptionListBlockOptions;
  constructor(term: string, detailItems: AbstractBlock[]) {
    super();
    this.term = term;
    this.detailItems = detailItems;
  }

  render(): string {
    if (!this.options) {
      throw new Error("DescriptionListItemContainer: Options are not set");
    }

    const termPart = pc.bold(padEnd(`${this.term}:`, this.options.termWidth));
    const detailText = this.detailItems.map((item) => item.render()).join("\n");
    const padding = " ".repeat(this.options.termWidth);
    return termPart + detailText.replace(/\n/g, `\n${padding}`);
  }

  setOptions(options?: DescriptionListBlockOptions): void {
    this.options = options;
  }
}

export class CodeBlock extends AbstractBlock {
  private readonly text: string;
  constructor(text: string) {
    super();
    this.text = text;
  }

  render(): string {
    return pc.cyan(this.text) + "\n";
  }
}

export class JsonBlock extends AbstractBlock {
  private readonly value: Record<string, unknown>;
  constructor(value: Record<string, unknown>) {
    super();
    this.value = value;
  }

  render(): string {
    return pc.cyan(JSON.stringify(this.value, null, 2)) + "\n";
  }
}

export type StatusListStatus = "ok" | "warn" | "fail" | "skip";

export type StatusListRow = {
  status: StatusListStatus;
  label: string;
  detail: string;
  /** Shown on an indented line below the row. */
  hint?: string | null;
};

export type StatusListBlockOptions = {
  labelWidth: number;
};

function statusMarker(status: StatusListStatus): string {
  switch (status) {
    case "ok":
      return pc.green("[ OK ]");
    case "warn":
      return pc.yellow("[WARN]");
    case "fail":
      return pc.red("[FAIL]");
    case "skip":
      return pc.dim("[SKIP]");
  }
}

/**
 * A titled list of `[ OK ]` / `[WARN]` / `[FAIL]` / `[SKIP]` rows, e.g.:
 *
 * ```
 * Network
 *   [ OK ] DNS              resolved to 104.18.20.33
 *   [FAIL] TLS handshake    connection reset by peer
 *          → A firewall or proxy is likely interrupting HTTPS traffic.
 * ```
 */
export class StatusListBlock extends AbstractBlock {
  private readonly title: string;
  private readonly rows: StatusListRow[];
  private readonly options: StatusListBlockOptions;
  constructor(
    title: string,
    rows: StatusListRow[],
    options: StatusListBlockOptions,
  ) {
    super();
    this.title = title;
    this.rows = rows;
    this.options = options;
  }

  render(): string {
    const lines = [pc.bold(this.title)];
    for (const row of this.rows) {
      const label = padEnd(row.label, this.options.labelWidth);
      lines.push(`  ${statusMarker(row.status)} ${label}${row.detail}`);
      if (row.hint) {
        const [first, ...rest] = row.hint.split("\n");
        lines.push(`         → ${first}`);
        lines.push(...rest.map((line) => `           ${line}`));
      }
    }
    return lines.join("\n") + "\n";
  }
}
