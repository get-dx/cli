import pc from "picocolors";

// Block-level elements

export function h1(text: string): HeadingBlock {
  return new HeadingBlock(text, 1);
}

export function h2(text: string): HeadingBlock {
  return new HeadingBlock(text, 2);
}

export function h3(text: string): HeadingBlock {
  return new HeadingBlock(text, 3);
}

export function p(text: string, finalSpace = true): ParagraphBlock {
  return new ParagraphBlock(text, finalSpace);
}

export function ul(items: ListItemContainer[]): UnorderedListBlock {
  return new UnorderedListBlock(items);
}

/**
 * Create a list item. Supports both simple text and multi-block content.
 */
export function li(items: string | BlockContent[]): ListItemContainer {
  if (typeof items === "string") {
    const wrapper = p(items, false);
    return new ListItemContainer([wrapper]);
  } else {
    return new ListItemContainer(items);
  }
}

export function dl(
  items: DescriptionListItemContainer[],
  options: DescriptionListBlockOptions,
): DescriptionListBlock {
  return new DescriptionListBlock(items, options);
}

/**
 * Create an item for a description list: a combination of `<dt>` and `<dd>` elements.
 *
 * Supports both simple text and multi-block content.
 */
export function dli(
  term: string,
  detailItems: string | BlockContent[],
): DescriptionListItemContainer {
  if (typeof detailItems === "string") {
    const wrapper = p(detailItems, false);
    return new DescriptionListItemContainer(term, [wrapper]);
  } else {
    return new DescriptionListItemContainer(term, detailItems);
  }
}

export function json(value: Record<string, unknown>): JsonBlock {
  return new JsonBlock(value);
}

// Inline elements

export function bold(text: string): string {
  return pc.bold(text);
}

export function dim(text: string): string {
  return pc.dim(text);
}

export function code(text: string): string {
  return pc.cyan(text);
}

export function link(url: string): string {
  return pc.magenta(url);
}

export function success(text: string): string {
  return pc.green(text);
}

export function error(text: string): string {
  return pc.red(text);
}

export function padEnd(text: string, width: number): string {
  if (text.length >= width) {
    return text;
  } else {
    return text + " ".repeat(width - text.length);
  }
}

export class BlockContent {
  render(): string {
    throw new Error("Not implemented");
  }
}

class HeadingBlock extends BlockContent {
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

class ParagraphBlock extends BlockContent {
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

class UnorderedListBlock extends BlockContent {
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

export class ListItemContainer extends BlockContent {
  private readonly items: BlockContent[];
  constructor(items: BlockContent[]) {
    super();
    this.items = items;
  }

  render(): string {
    return this.items.map((item) => item.render()).join("\n");
  }
}

type DescriptionListBlockOptions = {
  termWidth: number;
};

class DescriptionListBlock extends BlockContent {
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

class DescriptionListItemContainer extends BlockContent {
  private readonly term: string;
  private readonly detailItems: BlockContent[];
  private options?: DescriptionListBlockOptions;
  constructor(term: string, detailItems: BlockContent[]) {
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

class JsonBlock extends BlockContent {
  private readonly value: Record<string, unknown>;
  constructor(value: Record<string, unknown>) {
    super();
    this.value = value;
  }

  render(): string {
    return pc.cyan(JSON.stringify(this.value, null, 2)) + "\n";
  }
}

function indent(text: string, level: number): string {
  return text
    .split("\n")
    .map((line) => "  ".repeat(level) + line)
    .join("\n");
}
