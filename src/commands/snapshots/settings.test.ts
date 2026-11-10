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
      drivers: { selections: [], library: [{ id: "DRV1", name: "Docs" }] },
      workflows: { selections: [], library: [] },
      csat: { selections: [], library: [] },
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
      branches: [],
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
        settings_locked: false,
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
      "https://api.example.com/snapshots.settings.drivers.create",
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

  it("updates driver selection with a POST body from a file", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    const updateResponse = {
      ok: true,
      selection: {
        branch_id: null,
        drivers: [{ driver_id: "DRV1", prompt: "Docs" }],
      },
    };
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
        driver_ids: ["DRV1"],
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
        "set",
        "--from-file",
        filePath,
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/snapshots.settings.driverSelection.set",
        expect.objectContaining({ method: "POST" }),
      );
      const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock
        .calls[0] as [string, RequestInit];
      expect(JSON.parse(String(init.body))).toEqual({
        driver_ids: ["DRV1"],
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
        dx_staff_approved: true,
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
        "https://api.example.com/snapshots.settings.workflows.create",
        expect.objectContaining({ method: "POST" }),
      );
    } finally {
      fs.rmSync(workflowPath, { force: true });
    }
  });

  it("updates CSAT selection from a file via POST", async () => {
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
      JSON.stringify({ csat_ids: ["CSAT1"] }),
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
        "set",
        "--from-file",
        csatSelectionPath,
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/snapshots.settings.csatSelection.set",
        expect.objectContaining({ method: "POST" }),
      );
    } finally {
      fs.rmSync(csatSelectionPath, { force: true });
    }
  });
});

describe("current settings write contracts", () => {
  const operations = [
    [
      "drivers",
      "create",
      { name: "Docs", prompt: "Useful docs", target_role: "all" },
      "driver",
    ],
    [
      "drivers",
      "update",
      { driver_id: "MTcwMA", ranking_item: null },
      "driver",
    ],
    [
      "driverSelection",
      "set",
      { branch_id: "MTEw", driver_ids: ["MTcwMA"] },
      "selection",
    ],
    [
      "workflows",
      "create",
      {
        dx_staff_approved: true,
        name: "Builds",
        prompt: "Wait time?",
        target_role: "dev",
        target_position: 0,
        target_direction: "u",
        options: [
          { label: "Fast", value: 1 },
          { label: "Slow", value: 10 },
        ],
      },
      "workflow",
    ],
    [
      "workflows",
      "update",
      { dx_staff_approved: true, workflow_id: "MTU5Mw", target_label: null },
      "workflow",
    ],
    ["workflowSelection", "set", { workflow_ids: ["MTU5Mw"] }, "selection"],
    [
      "csatItems",
      "create",
      {
        name: "Tools",
        prompt: "Satisfied?",
        audience_filters: {
          type: "configured",
          configured: { target_role: "all", team_ids: [], attribute_ids: [] },
          custom: null,
          active_users: null,
        },
      },
      "csat",
    ],
    ["csatItems", "update", { csat_id: "MjcxMjE", group_id: null }, "csat"],
    ["csatSelection", "set", { csat_ids: [] }, "selection"],
    ["csatOrder", "set", { csat_ids: ["MjcxMjE"], group_ids: [] }, "csat_ids"],
  ] as const;

  it.each(operations)(
    "%s %s uses POST action route and preserves payload/response",
    async (group, action, body, resource) => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");
      const response = {
        ok: true,
        [resource]:
          resource === "csat_ids"
            ? ["MjcxMjE"]
            : { id: "encoded", translations: {} },
      };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response(JSON.stringify(response))),
      );
      const { run } = await import("../../cli.js");
      vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(body));
      await run([
        "node",
        "dx",
        "--json",
        "snapshots",
        "settings",
        group,
        action,
        "--from-file",
        "payload.json",
      ]);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        `https://api.example.com/snapshots.settings.${group}.${action}`,
        expect.objectContaining({ method: "POST", body: JSON.stringify(body) }),
      );
      expect(JSON.parse(stdoutWrites.join(""))).toEqual(response);
    },
  );

  it.each([409, 422])(
    "preserves HTTP %s error details and never retries",
    async (status) => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");
      const body = {
        ok: false,
        error: status === 409 ? "snapshot_live" : "validation_error",
        error_details: "Settings rejected",
      };
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(new Response(JSON.stringify(body), { status })),
      );
      const { run } = await import("../../cli.js");
      vi.spyOn(fs, "readFileSync").mockReturnValue('{"csat_ids":[]}');
      const exit = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);
      await run([
        "node",
        "dx",
        "--json",
        "snapshots",
        "settings",
        "csatSelection",
        "set",
        "--from-file",
        "payload.json",
      ]);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(1);
      expect(JSON.parse(stdoutWrites.join(""))).toMatchObject({
        http_status: status,
        body,
      });
    },
  );
});
