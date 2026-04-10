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
      throw new Error("Options are not set");
    }

    return (
      pc.bold(padEnd(`${this.term}:`, this.options.termWidth)) +
      this.detailItems.map((item) => item.render()).join("\n")
    );
  }

  setOptions(options?: DescriptionListBlockOptions): void {
    this.options = options;
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
