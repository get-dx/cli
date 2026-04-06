import { request } from "./http.js";
import type { Runtime } from "./types.js";

type ApiErrorResponse = {
  ok: false;
  error: string;
  status: number;
  body: Record<string, unknown>;
};

type Entity = {
  identifier: string;
  name: string | null;
  type: string;
  created_at: string;
  updated_at: string;
  description: string;
  owner_teams: { id: string; name: string }[];
  owner_users: { id: string; email: string }[];
  properties: Record<string, unknown>;
  aliases: Record<string, unknown[]>;
};

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

export async function getEntity(
  runtime: Runtime,
  identifier: string,
): Promise<{ ok: true; entity: Entity } | ApiErrorResponse> {
  const response = await request(runtime.baseUrl, "/catalog.entities.info", {
    ...requestOptions(runtime),
    method: "GET",
    query: { identifier },
  });

  return { ok: true, entity: response.entity as Entity };
}
