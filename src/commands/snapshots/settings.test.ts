import { EventEmitter } from "events";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EXIT_CODES } from "../../errors.js";

const setToken = vi.fn();
const deleteToken = vi.fn();
const getToken = vi.fn();

vi.mock("../../secrets.js", () => ({
  setToken,
  deleteToken,
  getToken,
}));

const originalEnv = { ...process.env };
const stdoutWrites: string[] = [];
const stderrWrites: string[] = [];

beforeEach(() => {
  process.env = { ...originalEnv };
  getToken.mockReset();
  setToken.mockReset();
  deleteToken.mockReset();
  vi.restoreAllMocks();
  stdoutWrites.length = 0;
  stderrWrites.length = 0;
  vi.spyOn(process.stdout, "write").mockImplementation(((
    chunk: string | Uint8Array,
  ) => {
    stdoutWrites.push(String(chunk));
    return true;
  }) as typeof process.stdout.write);
  vi.spyOn(process.stderr, "write").mockImplementation(((
    chunk: string | Uint8Array,
  ) => {
    stderrWrites.push(String(chunk));
    return true;
  }) as typeof process.stderr.write);
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
});

describe("snapshots settings commands", () => {
  it("gets the settings library as JSON", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    const libraryResponse = {
      ok: true,
      drivers: { branches: [], library: [{ id: "DRV1", name: "Docs" }] },
      workflows: { branches: [], library: [] },
      csat: { branches: [], library: [] },
    };

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(libraryResponse), { status: 200 }),
        ),
    );

    const { run } = await import("../../cli.js");
    await run([
      "node",
      "dx",
      "--json",
      "snapshots",
      "settings",
      "library",
      "get",
    ]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/snapshots.settings.library",
      expect.objectContaining({ method: "GET" }),
    );
    expect(JSON.parse(stdoutWrites.join(""))).toEqual(libraryResponse);
  });

  it("lists settings branches as JSON", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    const branchesResponse = {
      ok: true,
      branching_enabled: false,
      branches: [{ id: "single", name: "Default" }],
    };

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(branchesResponse), { status: 200 }),
        ),
    );

    const { run } = await import("../../cli.js");
    await run([
      "node",
      "dx",
      "--json",
      "snapshots",
      "settings",
      "branches",
      "list",
    ]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/snapshots.settings.branches",
      expect.objectContaining({ method: "GET" }),
    );
    expect(JSON.parse(stdoutWrites.join(""))).toEqual(branchesResponse);
  });

  it("gets settings configuration as JSON", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    const configurationResponse = {
      ok: true,
      configuration: {
        editability: { locked: false, survey_changes_allowed: true },
      },
    };

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(configurationResponse), { status: 200 }),
        ),
    );

    const { run } = await import("../../cli.js");
    await run([
      "node",
      "dx",
      "--json",
      "snapshots",
      "settings",
      "configuration",
      "get",
    ]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/snapshots.settings.configuration",
      expect.objectContaining({ method: "GET" }),
    );
    expect(JSON.parse(stdoutWrites.join(""))).toEqual(configurationResponse);
  });

  it("downloads the CSV manifest with locale and output path", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    const csv = "Section,Content\nDrivers,Ease of release\n";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(csv, {
          status: 200,
          headers: { "content-type": "text/csv" },
        }),
      ),
    );

    const outputPath = path.join(
      os.tmpdir(),
      `dx-settings-manifest-${Date.now()}.csv`,
    );

    try {
      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "snapshots",
        "settings",
        "manifest",
        "get",
        "--locale",
        "es",
        "--output",
        outputPath,
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/snapshots.settings.manifest?locale=es",
        expect.objectContaining({
          method: "GET",
          headers: expect.any(Headers),
        }),
      );
      const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock
        .calls[0] as [string, RequestInit];
      expect((init.headers as Headers).get("Accept")).toBe("text/csv");
      expect(fs.readFileSync(outputPath, "utf8")).toBe(csv);
      expect(JSON.parse(stdoutWrites.join(""))).toEqual({
        ok: true,
        path: outputPath,
        bytes: csv.length,
      });
    } finally {
      fs.rmSync(outputPath, { force: true });
    }
  });

  it("creates a driver from stdin with a POST body", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    const createResponse = {
      ok: true,
      driver: { id: "DRV123", name: "Docs" },
      library: [],
      branches: [],
    };

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(createResponse), { status: 200 }),
        ),
    );

    const mockStdin = new EventEmitter();
    vi.spyOn(process, "stdin", "get").mockReturnValue(
      mockStdin as unknown as typeof process.stdin,
    );
    setImmediate(() => {
      mockStdin.emit(
        "data",
        Buffer.from(
          JSON.stringify({
            name: "Docs",
            prompt: "Docs are easy to find.",
            target_role: "all",
          }),
        ),
      );
      mockStdin.emit("end");
    });

    const { run } = await import("../../cli.js");
    await run([
      "node",
      "dx",
      "--json",
      "snapshots",
      "settings",
      "drivers",
      "create",
      "--from-stdin",
    ]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/snapshots.settings.drivers",
      expect.objectContaining({ method: "POST" }),
    );
    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      name: "Docs",
      prompt: "Docs are easy to find.",
      target_role: "all",
    });
    expect(JSON.parse(stdoutWrites.join(""))).toEqual(createResponse);
  });

  it("updates driver selection with a PUT body from a file", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    const updateResponse = { ok: true, library: [], branches: [] };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(updateResponse), { status: 200 }),
        ),
    );

    const filePath = path.join(
      os.tmpdir(),
      `dx-driver-selection-${Date.now()}.json`,
    );
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        drivers: [{ id: "DRV1", enabled: true }],
      }),
      "utf8",
    );

    try {
      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "snapshots",
        "settings",
        "driverSelection",
        "update",
        "--from-file",
        filePath,
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/snapshots.settings.driverSelection",
        expect.objectContaining({ method: "PUT" }),
      );
      const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock
        .calls[0] as [string, RequestInit];
      expect(JSON.parse(String(init.body))).toEqual({
        drivers: [{ id: "DRV1", enabled: true }],
      });
      expect(JSON.parse(stdoutWrites.join(""))).toEqual(updateResponse);
    } finally {
      fs.rmSync(filePath, { force: true });
    }
  });

  it("requires --from-file or --from-stdin for writes", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const { run } = await import("../../cli.js");
    await run(["node", "dx", "snapshots", "settings", "workflows", "create"]);

    expect(stderrWrites.join("")).toContain(
      "One of --from-file or --from-stdin is required",
    );
    expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
  });

  it("creates a settings workflow from a file via POST", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        ),
    );

    const workflowPath = path.join(
      os.tmpdir(),
      `dx-workflow-${Date.now()}.json`,
    );
    fs.writeFileSync(
      workflowPath,
      JSON.stringify({
        name: "Coverage",
        prompt: "Coverage?",
        target_role: "dev",
        target_direction: "d",
        target_position: 0,
        options: [
          { label: "Low", value: 1 },
          { label: "High", value: 2 },
        ],
      }),
      "utf8",
    );

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: number,
    ) => {
      throw new Error(
        `unexpected exit ${code}: stdout=${stdoutWrites.join("")} stderr=${stderrWrites.join("")}`,
      );
    }) as never);

    try {
      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "snapshots",
        "settings",
        "workflows",
        "create",
        "--from-file",
        workflowPath,
      ]);

      expect(exitSpy).not.toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/snapshots.settings.workflows",
        expect.objectContaining({ method: "POST" }),
      );
    } finally {
      fs.rmSync(workflowPath, { force: true });
    }
  });

  it("updates CSAT selection from a file via PUT", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        ),
    );

    const csatSelectionPath = path.join(
      os.tmpdir(),
      `dx-csat-selection-${Date.now()}.json`,
    );
    fs.writeFileSync(
      csatSelectionPath,
      JSON.stringify({ csat: [{ id: "CSAT1", enabled: true }] }),
      "utf8",
    );

    try {
      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "snapshots",
        "settings",
        "csatSelection",
        "update",
        "--from-file",
        csatSelectionPath,
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/snapshots.settings.csatSelection",
        expect.objectContaining({ method: "PUT" }),
      );
    } finally {
      fs.rmSync(csatSelectionPath, { force: true });
    }
  });
});
