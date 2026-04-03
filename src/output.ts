import util from "node:util";

export function printJson(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

export function printHuman(value: unknown): void {
  process.stdout.write(
    util.inspect(value, { depth: null, colors: process.stdout.isTTY }) + "\n",
  );
}
