import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CliError } from "./errors.js";
import { getTokenWithSource, setToken } from "./secrets.js";

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

describe("getTokenWithSource", () => {
  it("prefers DX_API_TOKEN", async () => {
    process.env.DX_API_TOKEN = "env-token";

    expect(await getTokenWithSource("https://api.getdx.com")).toEqual({
      source: "env",
      token: "env-token",
    });
    expect(mockExeca).not.toHaveBeenCalled();
  });

  it("returns a token found in the Linux Secret Service", async () => {
    delete process.env.DX_API_TOKEN;
    mockExeca.mockResolvedValue({ stdout: "stored-token\n" });

    expect(await getTokenWithSource("https://api.getdx.com")).toEqual({
      source: "keychain",
      token: "stored-token",
      storeName: "Linux Secret Service (secret-tool)",
    });
  });

  it("reports a missing Linux token separately from an error", async () => {
    delete process.env.DX_API_TOKEN;
    mockExeca.mockRejectedValue(
      Object.assign(new Error("Command failed with exit code 1"), {
        exitCode: 1,
        stderr: "",
      }),
    );

    expect(await getTokenWithSource("https://api.getdx.com")).toEqual({
      source: "none",
      storeName: "Linux Secret Service (secret-tool)",
    });
  });

  it("reports when secret-tool is not installed", async () => {
    delete process.env.DX_API_TOKEN;
    mockExeca.mockRejectedValue(
      Object.assign(new Error("spawn secret-tool ENOENT"), { code: "ENOENT" }),
    );

    expect(await getTokenWithSource("https://api.getdx.com")).toEqual({
      source: "error",
      storeName: "Linux Secret Service (secret-tool)",
      error: "`secret-tool` is not installed",
    });
  });

  it("reports when the Linux Secret Service is unavailable", async () => {
    delete process.env.DX_API_TOKEN;
    mockExeca.mockRejectedValue(
      Object.assign(new Error("Command failed with exit code 1"), {
        exitCode: 1,
        stderr: "Cannot autolaunch D-Bus without X11 $DISPLAY",
      }),
    );

    const result = await getTokenWithSource("https://api.getdx.com");

    expect(result).toMatchObject({
      source: "error",
      error: "Cannot autolaunch D-Bus without X11 $DISPLAY",
    });
  });

  it("treats macOS exit code 44 as a missing token", async () => {
    delete process.env.DX_API_TOKEN;
    setPlatform("darwin");
    mockExeca.mockRejectedValue(
      Object.assign(new Error("Command failed with exit code 44"), {
        exitCode: 44,
        stderr:
          "security: SecKeychainSearchCopyNext: The specified item could not be found in the keychain.",
      }),
    );

    expect(await getTokenWithSource("https://api.getdx.com")).toEqual({
      source: "none",
      storeName: "macOS Keychain",
    });
  });

  it("reports other macOS keychain failures as errors", async () => {
    delete process.env.DX_API_TOKEN;
    setPlatform("darwin");
    mockExeca.mockRejectedValue(
      Object.assign(new Error("Command failed with exit code 51"), {
        exitCode: 51,
        stderr: "User interaction is not allowed.",
      }),
    );

    expect(await getTokenWithSource("https://api.getdx.com")).toEqual({
      source: "error",
      storeName: "macOS Keychain",
      error: "User interaction is not allowed.",
    });
  });

  it("reports unsupported platforms as errors", async () => {
    delete process.env.DX_API_TOKEN;
    setPlatform("aix");

    expect(await getTokenWithSource("https://api.getdx.com")).toEqual({
      source: "error",
      storeName: null,
      error: "Unsupported platform for secure token storage: aix",
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
