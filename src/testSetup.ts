import { afterEach, beforeEach } from "vitest";

const originalStdoutWrite = process.stdout.write;
const originalStderrWrite = process.stderr.write;

const silentWrite = (() => {
  return true;
}) as typeof process.stdout.write;

beforeEach(() => {
  process.stdout.write = silentWrite;
  process.stderr.write = silentWrite;
});

afterEach(() => {
  process.stdout.write = originalStdoutWrite;
  process.stderr.write = originalStderrWrite;
});
