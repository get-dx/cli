import util from "node:util";

import { Block } from "./ui.js";

/**
 * @deprecated use `renderJson` and `renderRichText` instead
 */
export function renderStructuredResponse(
  response: unknown,
  json: boolean,
): void {
  if (json) {
    renderJson(response as Record<string, unknown>);
    return;
  }

  process.stdout.write(
    util.inspect(response, { depth: null, colors: process.stdout.isTTY }) +
      "\n",
  );
}

/**
 * Render an object in plain JSON formatting.
 *
 * Should be used when the `--flag` is present.
 */
export function renderJson(value: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

/**
 * Render rich text to the terminal.
 *
 * Should be used when the `--flag` is NOT present.
 */
export function renderRichText(blocks: (Block | Block[] | null)[]): void {
  const normalizedBlocks: Block[] = blocks
    .filter((block) => block !== null)
    .flatMap((block) => {
      if (Array.isArray(block)) {
        return block;
      }
      return [block];
    });

  const renderedBlocks = [];
  for (const block of normalizedBlocks) {
    const blockContent = block.render();
    renderedBlocks.push(blockContent);
  }
  process.stdout.write(renderedBlocks.join("\n"));
}
