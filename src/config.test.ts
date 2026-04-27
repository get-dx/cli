import { describe, expect, it } from "vitest";

import { resolveUiUrl } from "./config.js";

describe("resolveUiUrl", () => {
  it("maps DX cloud API host to app.getdx.com", () => {
    expect(resolveUiUrl("https://api.getdx.com")).toBe("https://app.getdx.com");
    expect(resolveUiUrl("https://api.getdx.com/")).toBe(
      "https://app.getdx.com",
    );
  });

  it("maps dedicated API host to the matching app origin", () => {
    expect(resolveUiUrl("https://api.acme.getdx.io")).toBe(
      "https://acme.getdx.io",
    );
  });

  it("falls back to the API URL origin for other hosts", () => {
    expect(resolveUiUrl("https://api.example.com/v1/")).toBe(
      "https://api.example.com",
    );
  });
});
