import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Import cli.js before any mocks that could interfere with module loading
await import("../src/cli.js");

const mockBuildRuntimeSafe = vi.fn();
vi.mock("./runtime.js", () => ({
  buildRuntimeSafe: (...args: unknown[]) => mockBuildRuntimeSafe(...args),
}));

const mockRequest = vi.fn();
vi.mock("./http.js", () => ({
  request: (...args: unknown[]) => mockRequest(...args),
}));

const mockSelect = vi.fn();
vi.mock("@inquirer/prompts", () => ({
  select: (...args: unknown[]) => mockSelect(...args),
}));

const mockExeca = vi.fn();
vi.mock("execa", () => ({
  execa: () => mockExeca,
}));

vi.mock("picocolors", () => ({
  default: {
    bold: (s: string) => s,
    yellow: (s: string) => s,
    green: (s: string) => s,
    cyan: (s: string) => s,
    dim: (s: string) => s,
    red: (s: string) => s,
    blue: (s: string) => s,
    magenta: (s: string) => s,
  },
}));

import {
  checkForNewVersion,
  compareVersions,
  promptVersionUpdate,
  shouldPerformVersionCheck,
  shouldShowVersionPrompt,
} from "./versionCheck.js";

// Use a temp dir so tests never touch the real ~/.config/dx
const testConfigDir = path.join(
  os.tmpdir(),
  `dx-versioncheck-test-${process.pid}`,
);

beforeEach(() => {
  process.env.XDG_CONFIG_HOME = testConfigDir;
  // testSetup.ts sets DX_DISABLE_VERSION_CHECK globally; clear it here so
  // these tests exercise the real version-check code path.
  delete process.env.DX_DISABLE_VERSION_CHECK;
  mockBuildRuntimeSafe.mockReset();
  mockRequest.mockReset();
  mockSelect.mockReset();
  mockExeca.mockReset();
  vi.restoreAllMocks();
  fs.rmSync(testConfigDir, { recursive: true, force: true });
});

afterEach(() => {
  delete process.env.XDG_CONFIG_HOME;
  fs.rmSync(testConfigDir, { recursive: true, force: true });
  vi.unstubAllGlobals();
});

describe("compareVersions", () => {
  it("returns 0 for equal versions", () => {
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
  });

  it("returns positive when a is greater", () => {
    expect(compareVersions("1.2.4", "1.2.3")).toBeGreaterThan(0);
    expect(compareVersions("2.0.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareVersions("1.3.0", "1.2.9")).toBeGreaterThan(0);
  });

  it("returns negative when a is less", () => {
    expect(compareVersions("0.3.6", "0.3.7")).toBeLessThan(0);
    expect(compareVersions("0.3.7", "1.0.0")).toBeLessThan(0);
  });
});

describe("shouldPerformVersionCheck", () => {
  it("returns true when there is no cache", () => {
    expect(shouldPerformVersionCheck({})).toBe(true);
  });

  it("returns true when updatedAt is more than 24 hours ago", () => {
    const twoDaysAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    expect(
      shouldPerformVersionCheck({
        currentVersionCache: {
          updatedAt: twoDaysAgo,
          contents: { cli: "0.3.7" },
        },
      }),
    ).toBe(true);
  });

  it("returns false when updatedAt is less than 24 hours ago", () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(
      shouldPerformVersionCheck({
        currentVersionCache: {
          updatedAt: oneHourAgo,
          contents: { cli: "0.3.7" },
        },
      }),
    ).toBe(false);
  });

  it("returns false when updatedAt is exactly 23 hours ago", () => {
    const twentyThreeHoursAgo = new Date(
      Date.now() - 23 * 60 * 60 * 1000,
    ).toISOString();
    expect(
      shouldPerformVersionCheck({
        currentVersionCache: {
          updatedAt: twentyThreeHoursAgo,
          contents: { cli: "0.3.7" },
        },
      }),
    ).toBe(false);
  });
});

describe("shouldShowVersionPrompt", () => {
  it("returns true when there is no prompt state", () => {
    expect(shouldShowVersionPrompt("0.4.0")).toBe(true);
  });

  it("returns false when version is skipped", () => {
    expect(
      shouldShowVersionPrompt("0.4.0", { type: "SKIP", skipVersion: "0.4.0" }),
    ).toBe(false);
  });

  it("returns true when SKIP is for a different (older) version", () => {
    expect(
      shouldShowVersionPrompt("0.4.1", { type: "SKIP", skipVersion: "0.4.0" }),
    ).toBe(true);
  });

  it("returns false when SNOOZE is still active", () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      shouldShowVersionPrompt("0.4.0", { type: "SNOOZE", snoozeUntil: future }),
    ).toBe(false);
  });

  it("returns true when SNOOZE has expired", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(
      shouldShowVersionPrompt("0.4.0", { type: "SNOOZE", snoozeUntil: past }),
    ).toBe(true);
  });
});

const fakeRuntime = {
  apiBaseUrl: "https://api.getdx.com",
  webBaseUrl: "https://app.getdx.com",
  token: "tok",
  context: { json: false },
  version: "0.3.7",
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn() },
};

const scorecardsList = ["node", "dx", "scorecards", "list"];

describe("checkForNewVersion", () => {
  it("returns 'disabled' for 'auth' command", async () => {
    const result = await checkForNewVersion(["node", "dx", "auth", "login"]);
    expect(result).toEqual({ status: "disabled" });
    expect(mockBuildRuntimeSafe).not.toHaveBeenCalled();
  });

  it("returns 'disabled' for 'init' command", async () => {
    const result = await checkForNewVersion(["node", "dx", "init"]);
    expect(result).toEqual({ status: "disabled" });
    expect(mockBuildRuntimeSafe).not.toHaveBeenCalled();
  });

  it("returns 'disabled' when user is not logged in", async () => {
    mockBuildRuntimeSafe.mockResolvedValue(null);
    const result = await checkForNewVersion(scorecardsList);
    expect(result).toEqual({ status: "disabled" });
  });

  it("returns 'disabled' gracefully when fetch fails", async () => {
    mockBuildRuntimeSafe.mockResolvedValue(fakeRuntime);
    mockRequest.mockRejectedValue(new Error("network error"));
    const result = await checkForNewVersion(scorecardsList);
    expect(result).toEqual({ status: "disabled" });
  });

  it("returns 'up-to-date' when already on latest version", async () => {
    mockBuildRuntimeSafe.mockResolvedValue(fakeRuntime);
    mockRequest.mockResolvedValue({ body: { versions: { cli: "0.3.7" } } }); // same as package.json
    const result = await checkForNewVersion(scorecardsList);
    expect(result).toEqual({ status: "up-to-date" });
  });

  it("returns 'up-to-date' when the version is already skipped in config", async () => {
    fs.mkdirSync(path.join(testConfigDir, "dx"), { recursive: true });
    fs.writeFileSync(
      path.join(testConfigDir, "dx", "config.json"),
      JSON.stringify({
        versionPromptSelection: { type: "SKIP", skipVersion: "0.4.0" },
      }),
    );
    mockBuildRuntimeSafe.mockResolvedValue(fakeRuntime);
    mockRequest.mockResolvedValue({ body: { versions: { cli: "0.4.0" } } });
    const result = await checkForNewVersion(scorecardsList);
    expect(result).toEqual({ status: "up-to-date" });
  });

  it("returns 'available' when a newer version exists", async () => {
    mockBuildRuntimeSafe.mockResolvedValue(fakeRuntime);
    mockRequest.mockResolvedValue({ body: { versions: { cli: "0.4.0" } } });
    const result = await checkForNewVersion(scorecardsList);
    expect(result).toEqual({ status: "available", latestVersion: "0.4.0" });
  });

  it("uses cached version and skips fetch when cache is fresh", async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    fs.mkdirSync(path.join(testConfigDir, "dx"), { recursive: true });
    fs.writeFileSync(
      path.join(testConfigDir, "dx", "config.json"),
      JSON.stringify({
        currentVersionCache: {
          updatedAt: oneHourAgo,
          contents: { cli: "0.3.7" },
        },
      }),
    );
    mockBuildRuntimeSafe.mockResolvedValue(fakeRuntime);
    const result = await checkForNewVersion(scorecardsList);
    expect(result).toEqual({ status: "up-to-date" });
    expect(mockRequest).not.toHaveBeenCalled();
  });
});

describe("promptVersionUpdate", () => {
  it("shows non-interactive warning to stderr when not a TTY", async () => {
    // Test environment is non-TTY by default
    const stderrChunks: string[] = [];
    vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
      stderrChunks.push(String(chunk));
      return true;
    });

    const result = await promptVersionUpdate("0.4.0");
    expect(result).toEqual({ shouldUpdate: false });
    expect(stderrChunks.join("")).toContain("0.4.0");
  });

  it("returns { shouldUpdate: true } when user chooses 'update'", async () => {
    mockSelect.mockResolvedValue("update");
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      configurable: true,
    });
    Object.defineProperty(process.stderr, "isTTY", {
      value: true,
      configurable: true,
    });

    const result = await promptVersionUpdate("0.4.0");
    expect(result).toEqual({ shouldUpdate: true, latestVersion: "0.4.0" });

    Object.defineProperty(process.stdin, "isTTY", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(process.stderr, "isTTY", {
      value: undefined,
      configurable: true,
    });
  });

  it("persists SNOOZE state and returns no-update when user chooses 'snooze'", async () => {
    mockSelect.mockResolvedValue("snooze");
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      configurable: true,
    });
    Object.defineProperty(process.stderr, "isTTY", {
      value: true,
      configurable: true,
    });

    const result = await promptVersionUpdate("0.4.0");
    expect(result).toEqual({ shouldUpdate: false });

    Object.defineProperty(process.stdin, "isTTY", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(process.stderr, "isTTY", {
      value: undefined,
      configurable: true,
    });

    const configPath = path.join(testConfigDir, "dx", "config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    expect(config.versionPromptSelection.type).toBe("SNOOZE");
    expect(config.versionPromptSelection.snoozeUntil).toBeDefined();
  });

  it("persists SKIP state and returns no-update when user chooses 'skip'", async () => {
    mockSelect.mockResolvedValue("skip");
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      configurable: true,
    });
    Object.defineProperty(process.stderr, "isTTY", {
      value: true,
      configurable: true,
    });

    const result = await promptVersionUpdate("0.4.0");
    expect(result).toEqual({ shouldUpdate: false });

    Object.defineProperty(process.stdin, "isTTY", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(process.stderr, "isTTY", {
      value: undefined,
      configurable: true,
    });

    const configPath = path.join(testConfigDir, "dx", "config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    expect(config.versionPromptSelection).toEqual({
      type: "SKIP",
      skipVersion: "0.4.0",
    });
  });
});
