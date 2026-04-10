import dayjs from "dayjs";
import relativeTimePlugin from "dayjs/plugin/relativeTime.js";
import pc from "picocolors";

export { GLYPHS } from "./ui/glyphs.js";
import {
  DescriptionListBlock,
  DescriptionListItemContainer,
  HeadingBlock,
  JsonBlock,
  ListItemContainer,
  ParagraphBlock,
  UnorderedListBlock,
  DescriptionListBlockOptions,
} from "./ui/blocks.js";

dayjs.extend(relativeTimePlugin);

/**
 * A block of rich text to be rendered to the terminal with `renderRichText`.
 */
export interface Block {
  render(): string;
}

// Block-level elements

export function h1(text: string): Block {
  return new HeadingBlock(text, 1);
}

export function h2(text: string): Block {
  return new HeadingBlock(text, 2);
}

export function h3(text: string): Block {
  return new HeadingBlock(text, 3);
}

export function p(text: string, finalSpace = true): Block {
  return new ParagraphBlock(text, finalSpace);
}

export function ul(items: ListItemContainer[]): Block {
  return new UnorderedListBlock(items);
}

/**
 * Create a list item. Supports both simple text and multi-block content.
 */
export function li(items: string | Block[]): ListItemContainer {
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
): Block {
  return new DescriptionListBlock(items, options);
}

/**
 * Create an item for a description list: a combination of `<dt>` and `<dd>` elements.
 *
 * Supports both simple text and multi-block content.
 */
export function dli(
  term: string,
  detailItems: string | Block[],
): DescriptionListItemContainer {
  if (typeof detailItems === "string") {
    const wrapper = p(detailItems, false);
    return new DescriptionListItemContainer(term, [wrapper]);
  } else {
    return new DescriptionListItemContainer(term, detailItems);
  }
}

export function json(value: Record<string, unknown>): Block {
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

export function warning(text: string): string {
  return pc.yellow(text);
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

/**
 * Prints relative time, then a dim timestamp
 *
 * Example: "1 day ago (2026-01-01:00:00:00Z)"
 */
export function timestampSummary(timestamp: string): string {
  const ts = dayjs(timestamp);
  return `${ts.fromNow()} ${dim(`(${timestamp})`)}`;
}

// Other helpers

export function indent(text: string, level: number): string {
  return text
    .split("\n")
    .map((line) => "  ".repeat(level) + line)
    .join("\n");
}

export function maskToken(token: string | null): string | null {
  if (!token) {
    return null;
  }

  if (token.length <= 8) {
    return "*".repeat(token.length);
  }

  return `${token.slice(0, 4)}${"*".repeat(token.length - 8)}${token.slice(-4)}`;
}
