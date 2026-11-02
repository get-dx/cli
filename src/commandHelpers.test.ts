import { describe, expect, it } from "vitest";

import { parseCommaSeparatedValues } from "./commandHelpers.js";

describe("parseCommaSeparatedValues", () => {
  it("returns undefined when no value is given", () => {
    expect(parseCommaSeparatedValues(undefined)).toBeUndefined();
  });

  it("returns undefined for empty or whitespace-only values", () => {
    expect(parseCommaSeparatedValues("")).toBeUndefined();
    expect(parseCommaSeparatedValues(" , ,")).toBeUndefined();
  });

  it("trims entries and drops empty ones", () => {
    expect(parseCommaSeparatedValues(" a, b ,,c,")).toEqual(["a", "b", "c"]);
  });
});
