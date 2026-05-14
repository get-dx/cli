import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CliError } from "./errors.js";
import { setToken } from "./secrets.js";

const { mockExeca } = vi.hoisted(() => ({
  mockExeca: vi.fn(),
}));

vi.mock("execa", () => ({
  execa: mockExeca,
}));

const originalEnv = { ...process.env };
const originalPlatform = process.platform;

beforeEach(() => {
  process.env = { ...originalEnv };
  mockExeca.mockReset();
  setPlatform("linux");
});

afterEach(() => {
  process.env = { ...originalEnv };
  setPlatform(originalPlatform);
});

describe("secrets", () => {
  describe("setToken", () => {
    it("stores Linux tokens with secret-tool", async () => {
      await setToken("https://api.getdx.com", "secret-token");

      expect(mockExeca).toHaveBeenCalledWith(
        "secret-tool",
        [
          "store",
          "--label=dx-cli",
          "service",
          "dx-cli",
          "account",
          "https://api.getdx.com",
        ],
        { input: "secret-token" },
      );
    });

    it("explains when secret-tool is missing on Linux", async () => {
      mockExeca.mockRejectedValue(
        Object.assign(new Error("spawnSync secret-tool ENOENT"), {
          code: "ENOENT",
        }),
      );

      const error = await captureError(() =>
        setToken("https://api.getdx.com", "secret-token"),
      );

      expect(error).toBeInstanceOf(CliError);
      expect(error.message).toContain("`secret-tool` is not installed");
      expect(error.message).toContain("libsecret-tools");
      expect(error.message).toContain("DX_API_TOKEN");
      expect(error.message).not.toContain("spawnSync secret-tool ENOENT");
    });

    it("explains when the Linux Secret Service is unavailable", async () => {
      const stderr =
        "secret-tool: The name org.freedesktop.secrets was not provided by any .service files";
      mockExeca.mockRejectedValue(
        Object.assign(
          new Error(
            "Command failed with exit code 1: secret-tool store '--label=dx-cli'",
          ),
          {
            exitCode: 1,
            stderr,
          },
        ),
      );

      const error = await captureError(() =>
        setToken("https://api.getdx.com", "secret-token"),
      );

      expect(error).toBeInstanceOf(CliError);
      expect(error.message).toContain(
        "Linux Secret Service/keyring is not available",
      );
      expect(error.message).toContain("Docker or dev containers");
      expect(error.message).toContain("DX_API_TOKEN");
      expect(error.message).toContain(stderr);
    });
  });
});

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", {
    configurable: true,
    value: platform,
  });
}

async function captureError(action: () => Promise<void>): Promise<Error> {
  try {
    await action();
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }

    throw error;
  }

  throw new Error("Expected action to throw");
}
