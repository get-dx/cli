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
  vi.spyOn(globalThis, "setTimeout").mockImplementation(((
    callback: TimerHandler,
  ) => {
    if (typeof callback === "function") {
      callback();
    }
    return 0;
  }) as typeof globalThis.setTimeout);
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("workflowRuns trigger command", () => {
  const runId = "wr-test-1";

  const workflowOne = {
    identifier: "wf-one",
    name: "Workflow One",
    description: null,
    icon: null,
    color: null,
    scope: "GLOBAL",
    entity_filter_type: "ENTITY_TYPES",
    entity_filter_sql: null,
    entity_filter_type_identifiers: null,
    execution_type: "SIMPLE",
    trigger_type: "ANY",
    parameters: [],
  };

  const listWorkflowsResponse = () =>
    new Response(JSON.stringify({ ok: true, workflows: [workflowOne] }), {
      status: 200,
    });

  const pendingRun = {
    id: runId,
    status: "PENDING_RUN",
    started_at: "2026-04-29T12:00:00.000Z",
    completed_at: null,
    events: [],
  };

  const succeededRun = {
    ...pendingRun,
    status: "SUCCEEDED",
    completed_at: "2026-04-29T12:00:05.000Z",
    workflow: {
      identifier: "wf-one",
      name: "Workflow One",
      description: null,
      scope: "GLOBAL",
    },
  };

  it("triggers then polls until succeeded and prints a summary", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(listWorkflowsResponse())
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ ok: true, workflow_run: { id: runId } }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, workflow_run: pendingRun }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, workflow_run: succeededRun }), {
          status: 200,
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const { run } = await import("../../cli.js");
    await run(["node", "dx", "workflowRuns", "trigger", "wf-one"]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.example.com/workflows.list",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.example.com/workflowRuns.trigger",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ workflow_identifier: "wf-one" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `https://api.example.com/workflowRuns.info?id=${runId}`,
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      `https://api.example.com/workflowRuns.info?id=${runId}`,
      expect.objectContaining({ method: "GET" }),
    );

    const out = stdoutWrites.join("");
    expect(out).toContain("Workflow run");
    expect(out).toContain(runId);
    expect(out).toContain("SUCCEEDED");
    expect(out).toContain("Workflow One");
  });

  it("prints new POST_MESSAGE events to stderr while polling", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    const pendingWithMsg = {
      ...pendingRun,
      events: [
        {
          id: "e1",
          type: "POST_MESSAGE",
          occurred_at: "2026-04-29T12:00:01Z",
          message: "Step one",
          data: {},
        },
      ],
    };
    const pendingWithMore = {
      ...pendingRun,
      events: [
        ...pendingWithMsg.events,
        {
          id: "e2",
          type: "POST_MESSAGE",
          occurred_at: "2026-04-29T12:00:02Z",
          message: "Step two",
          data: {},
        },
      ],
    };

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(listWorkflowsResponse())
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ ok: true, workflow_run: { id: runId } }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ ok: true, workflow_run: pendingWithMsg }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ ok: true, workflow_run: pendingWithMore }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ ok: true, workflow_run: succeededRun }),
            { status: 200 },
          ),
        ),
    );

    const { run } = await import("../../cli.js");
    await run(["node", "dx", "workflowRuns", "trigger", "wf-one"]);

    const err = stderrWrites.join("");
    // Both events are rendered as they become visible
    expect(err).toContain("Step one");
    expect(err).toContain("Step two");
    // e1 was already seen when poll 2 returns it — should not be re-rendered
    expect((err.match(/Step one/g) ?? []).length).toBe(1);
  });

  it("outputs the final workflow run as JSON with --json", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(listWorkflowsResponse())
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ ok: true, workflow_run: { id: runId } }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ ok: true, workflow_run: succeededRun }),
            { status: 200 },
          ),
        ),
    );

    const { run } = await import("../../cli.js");
    await run(["node", "dx", "--json", "workflowRuns", "trigger", "wf-one"]);

    expect(JSON.parse(stdoutWrites.join(""))).toEqual({
      ok: true,
      workflow_run: succeededRun,
    });
  });

  it("sends entity and coerced param data in the trigger body", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(listWorkflowsResponse())
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ ok: true, workflow_run: { id: runId } }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, workflow_run: succeededRun }), {
          status: 200,
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const { run } = await import("../../cli.js");
    await run([
      "node",
      "dx",
      "workflowRuns",
      "trigger",
      "wf-one",
      "--entity",
      "svc-a",
      "--param",
      "count=42",
      "--param",
      "enabled=true",
    ]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.example.com/workflowRuns.trigger",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          workflow_identifier: "wf-one",
          entity_identifier: "svc-a",
          data: { count: 42, enabled: true },
        }),
      }),
    );
  });

  it("exits with an error when the run ends in FAILED", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    const failedRun = {
      ...pendingRun,
      status: "FAILED",
      completed_at: "2026-04-29T12:00:03.000Z",
      events: [
        {
          id: "e1",
          type: "POST_MESSAGE",
          occurred_at: "2026-04-29T12:00:02Z",
          message: "Something broke",
          data: {},
        },
      ],
    };

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(listWorkflowsResponse())
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ ok: true, workflow_run: { id: runId } }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true, workflow_run: failedRun }), {
            status: 200,
          }),
        ),
    );

    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const { run } = await import("../../cli.js");
    await run(["node", "dx", "workflowRuns", "trigger", "wf-one"]);

    expect(stderrWrites.join("")).toContain("Something broke");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("errors on invalid --param format", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(listWorkflowsResponse()),
    );

    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const { run } = await import("../../cli.js");
    await run([
      "node",
      "dx",
      "workflowRuns",
      "trigger",
      "wf-one",
      "--param",
      "nocomma",
    ]);

    expect(stderrWrites.join("")).toContain("Invalid --param format");
    expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
  });
});
