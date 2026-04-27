import { clearLine, cursorTo } from "node:readline";

import { Block, dim } from "./ui.js";

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
export function renderRichText(
  blocks: (Block | Block[] | null)[],
  options?: {
    /**
     * Whether to print to `stderr` instead of `stdout`.
     *
     * This option should ONLY be used when showing intermediate output in a command,
     * like when showing "running query..." before the result has been returned.
     *
     * This is to keep the end-result of each command clearly separated from everything else.
     */
    useStderr?: boolean;
  },
): void {
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

  if (options?.useStderr) {
    process.stderr.write(renderedBlocks.join("\n"));
  } else {
    process.stdout.write(renderedBlocks.join("\n"));
  }
}

/**
 * Renders a TTY spinner and status on stderr for long-running async work. Does not
 * use `renderRichText` because stdout is reserved for command results; stderr keeps
 * auxiliary output separate from the primary stream.
 */
export class AsyncProgressReporter {
  private readonly enabled = Boolean(process.stderr.isTTY);
  private readonly intervalMs: number;
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
  ].map((frame) => dim(frame));
  private timer?: ReturnType<typeof setInterval>;
  private frameIndex = 0;
  private currentMessage = "";

  constructor(options?: { intervalMs?: number }) {
    this.intervalMs = options?.intervalMs ?? 80;
  }

  start(message: string): void {
    if (!this.enabled) {
      return;
    }

    this.currentMessage = message;
    this.render();
    this.timer = setInterval(() => this.render(), this.intervalMs);
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
      this.clearCurrentLine();
      process.stderr.write(`${finalMessage}\n`);
      return;
    }

    this.clearCurrentLine();
  }

  private render(): void {
    const frame = this.frames[this.frameIndex % this.frames.length];
    this.frameIndex += 1;
    this.clearCurrentLine();
    process.stderr.write(`${frame} ${this.currentMessage}`);
  }

  private clearCurrentLine(): void {
    clearLine(process.stderr, 0);
    cursorTo(process.stderr, 0);
  }
}
