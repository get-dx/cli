import { afterEach, beforeEach } from "vitest";

// Disable the version check for all tests. Set at module load time so that
// test files which snapshot `process.env` at their own module load
// (e.g. `const originalEnv = { ...process.env }`) will include this flag and
// won't accidentally clear it when they restore the env in their beforeEach.
// versionCheck.test.ts deletes this in its own beforeEach to exercise the
// real code path.
process.env.DX_DISABLE_VERSION_CHECK = "1";

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
