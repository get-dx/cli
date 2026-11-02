import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DoctorReport } from "../doctor/types.js";

const { runDoctor } = vi.hoisted(() => ({
  runDoctor: vi.fn<() => Promise<DoctorReport>>(),
}));

vi.mock("../doctor/index.js", () => ({ runDoctor }));

const failingReport: DoctorReport = {
  ok: false,
  summary: { ok: 1, warn: 1, fail: 1, skip: 1 },
  sections: [
    {
      id: "config",
      title: "Config",
      checks: [
        {
          id: "api_base_url",
          label: "API base URL",
          status: "ok",
          message: "https://api.getdx.com",
          hint: null,
          source: "config",
          data: null,
        },
        {
          id: "https_proxy",
          label: "HTTPS_PROXY",
          status: "warn",
          message: "http://proxy:8080",
          hint: "dx-cli does not use proxy environment variables.",
          source: null,
          data: null,
        },
      ],
    },
    {
      id: "network",
      title: "Network (api.getdx.com)",
      checks: [
        {
          id: "tls",
          label: "TLS handshake",
          status: "fail",
          message: "connection reset by peer during handshake (ECONNRESET)",
          hint: "A firewall is likely interfering.\nAsk your network team.",
          source: null,
          data: null,
        },
        {
          id: "https",
          label: "HTTPS",
          status: "skip",
          message: "skipped because the TLS handshake failed",
          hint: null,
          source: null,
          data: null,
        },
      ],
    },
  ],
};

let output: string;

beforeEach(() => {
  output = "";
  vi.spyOn(process.stdout, "write").mockImplementation(((
    chunk: string | Uint8Array,
  ) => {
    output += String(chunk);
    return true;
  }) as typeof process.stdout.write);
  runDoctor.mockReset();
});

afterEach(() => {
  process.exitCode = undefined;
  vi.restoreAllMocks();
});

describe("doctor command", () => {
  it("renders status rows, sources, hints, and a summary", async () => {
    runDoctor.mockResolvedValue(failingReport);

    const { run } = await import("../cli.js");
    await run(["node", "dx", "doctor"]);

    expect(output).toContain("Config\n");
    expect(output).toContain(
      "  [ OK ] API base URL              https://api.getdx.com [from config file]\n",
    );
    expect(output).toContain(
      "  [WARN] HTTPS_PROXY               http://proxy:8080\n" +
        "         → dx-cli does not use proxy environment variables.\n",
    );
    expect(output).toContain(
      "  [FAIL] TLS handshake             connection reset by peer during handshake (ECONNRESET)\n" +
        "         → A firewall is likely interfering.\n" +
        "           Ask your network team.\n",
    );
    expect(output).toContain(
      "  [SKIP] HTTPS                     skipped because the TLS handshake failed\n",
    );
    expect(output).toContain("1 check failed, 1 warning.");
    expect(process.exitCode).toBe(1);
  });

  it("prints the full report as JSON with --json", async () => {
    runDoctor.mockResolvedValue(failingReport);

    const { run } = await import("../cli.js");
    await run(["node", "dx", "--json", "doctor"]);

    expect(JSON.parse(output)).toEqual(failingReport);
    expect(process.exitCode).toBe(1);
  });

  it("exits 0 when only warnings are reported", async () => {
    runDoctor.mockResolvedValue({
      ...failingReport,
      ok: true,
      summary: { ok: 1, warn: 1, fail: 0, skip: 0 },
      sections: [failingReport.sections[0]],
    });

    const { run } = await import("../cli.js");
    await run(["node", "dx", "doctor"]);

    expect(output).toContain("All required checks passed, 1 warning.");
    expect(process.exitCode).toBeUndefined();
  });

  it("says so when everything passed", async () => {
    runDoctor.mockResolvedValue({
      ok: true,
      summary: { ok: 1, warn: 0, fail: 0, skip: 0 },
      sections: [
        {
          ...failingReport.sections[0],
          checks: [failingReport.sections[0].checks[0]],
        },
      ],
    });

    const { run } = await import("../cli.js");
    await run(["node", "dx", "doctor"]);

    expect(output).toContain("All checks passed.");
  });
});
