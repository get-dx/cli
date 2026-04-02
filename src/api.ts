import { request } from "./http.js";
import type { CliContext } from "./types.js";

interface Runtime {
  baseUrl: string;
  token: string;
  context: CliContext;
  version: string;
}

function requestOptions(runtime: Runtime) {
  return {
    token: runtime.token,
    agent: runtime.context.agent,
    agentSessionId: runtime.context.agentSessionId,
    userAgent: `dx-cli/${runtime.version}`,
  };
}

export async function getAuthInfo(runtime: Runtime): Promise<unknown> {
  return request(runtime.baseUrl, "/auth.info", {
    ...requestOptions(runtime),
    method: "GET",
  });
}

export async function getEntity(runtime: Runtime, identifier: string): Promise<unknown> {
  return request(runtime.baseUrl, "/entities.info", {
    ...requestOptions(runtime),
    method: "GET",
    query: { identifier },
  });
}
