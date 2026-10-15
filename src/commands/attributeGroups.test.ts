import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getToken = vi.fn();

vi.mock("../secrets.js", () => ({
  getToken,
}));

const originalEnv = { ...process.env };
const stdoutWrites: string[] = [];
const stderrWrites: string[] = [];

beforeEach(() => {
  process.env = { ...originalEnv };
  getToken.mockReset();
  stdoutWrites.length = 0;
  stderrWrites.length = 0;

  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdoutWrites.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderrWrites.push(String(chunk));
    return true;
  });
});

afterEach(() => {
  process.env = originalEnv;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("attributeGroups command", () => {
  const mockResponse = {
    ok: true as const,
    attribute_groups: [
      {
        id: "grp_1",
        name: "Region",
        type: "ADMIN_MANAGED",
        hidden: false,
        position: 0,
        privileged: false,
        attributes: [
          { id: "attr_1", name: "North America", position: 0 },
          { id: "attr_2", name: "Europe", position: 1 },
        ],
      },
      {
        id: "grp_2",
        name: "Tenure",
        type: "SELF_REPORTED",
        hidden: false,
        position: 1,
        privileged: true,
        attributes: [{ id: "attr_3", name: "0-2 years", position: 0 }],
      },
      {
        id: "grp_3",
        name: "Department",
        type: "DX_MANAGED",
        hidden: true,
        position: 2,
        privileged: false,
        attributes: [],
      },
    ],
  };

  it("lists attribute groups in human-readable output", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(mockResponse), { status: 200 }),
        ),
    );

    const { run } = await import("../cli.js");
    await run(["node", "dx", "attributeGroups", "list"]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/attributeGroups.list",
      expect.objectContaining({ method: "GET" }),
    );
    const output = stdoutWrites.join("");
    expect(output).toContain("Attribute Groups");
    expect(output).toContain("Region");
    expect(output).toContain("Admin managed");
    expect(output).toContain("grp_1");
    expect(output).toContain("North America");
    expect(output).toContain("attr_1");
    expect(output).toContain("Self reported");
    expect(output.match(/Privileged/g)).toHaveLength(1);
    expect(output.match(/Hidden/g)).toHaveLength(1);
    expect(output.indexOf("Region")).toBeLessThan(output.indexOf("Tenure"));
    expect(output.indexOf("Tenure")).toBeLessThan(output.indexOf("Department"));
    expect(output.indexOf("North America")).toBeLessThan(
      output.indexOf("Europe"),
    );
    expect(output).toContain("DX managed");
    expect(output).toContain("Attributes: (None)");
  });

  it("prints raw JSON with --json", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(mockResponse), { status: 200 }),
        ),
    );

    const { run } = await import("../cli.js");
    await run(["node", "dx", "--json", "attributeGroups", "list"]);

    expect(JSON.parse(stdoutWrites.join(""))).toEqual(mockResponse);
  });

  it("prints a clear empty state when no attribute groups exist", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, attribute_groups: [] }), {
          status: 200,
        }),
      ),
    );

    const { run } = await import("../cli.js");
    await run(["node", "dx", "attributeGroups", "list"]);

    const output = stdoutWrites.join("");
    expect(output).toContain("Displaying 0 attribute groups.");
    expect(output).toContain(
      "No attribute groups are available for this account.",
    );
  });

  it("shows command help with examples", async () => {
    vi.spyOn(process, "exit").mockImplementation(((
      code?: string | number | null,
    ) => {
      throw new Error(`process.exit called with ${code}`);
    }) as typeof process.exit);

    const { run } = await import("../cli.js");
    await expect(
      run(["node", "dx", "attributeGroups", "list", "--help"]),
    ).rejects.toThrow("process.exit called with 0");

    const output = stdoutWrites.join("");
    expect(output).toContain(
      "List attribute groups and their attribute values",
    );
    expect(output).toContain("dx attributeGroups list");
    expect(output).toContain("dx --json attributeGroups list");
  });
});
