import { afterEach, beforeEach } from "vitest";

const originalStdoutWrite = process.stdout.write;
const originalStderrWrite = process.stderr.write;

const silentWrite = (() => {
  return true;
}) as typeof process.stdout.write;

beforeEach(() => {
  process.stdout.write = silentWrite;
  process.stderr.write = silentWrite;

  // Disable the version check globally across all tests. Tests that exercise
  // version-check logic (versionCheck.test.ts) delete this in their own
  // beforeEach so the real code path runs.
  process.env.DX_DISABLE_VERSION_CHECK = "1";
});

afterEach(() => {
  process.stdout.write = originalStdoutWrite;
  process.stderr.write = originalStderrWrite;
  delete process.env.DX_DISABLE_VERSION_CHECK;
});
