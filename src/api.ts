import { request } from "./http.js";
import type { Runtime } from "./types.js";

export type Entity = {
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
): Promise<{ ok: true; entity: Entity }> {
  const response = await request(runtime.baseUrl, "/catalog.entities.info", {
    ...requestOptions(runtime),
    method: "GET",
    query: { identifier },
  });

  return { ok: true, entity: response.entity as Entity };
}

export type ListEntitiesParams = {
  cursor?: string;
  limit?: number;
  type?: string;
  search_term?: string;
};

export type ListEntitiesResponse = {
  ok: true;
  entities: unknown[];
  response_metadata?: { next_cursor?: string | null };
};

export async function listEntities(
  runtime: Runtime,
  params: ListEntitiesParams,
): Promise<ListEntitiesResponse> {
  const query: Record<string, string | number | undefined> = {};
  if (params.cursor !== undefined) {
    query.cursor = params.cursor;
  }
  if (params.limit !== undefined) {
    query.limit = params.limit;
  }
  if (params.type !== undefined) {
    query.type = params.type;
  }
  if (params.search_term !== undefined) {
    query.search_term = params.search_term;
  }

  const response = await request(runtime.baseUrl, "/catalog.entities.list", {
    ...requestOptions(runtime),
    method: "GET",
    query,
  });

  return response as ListEntitiesResponse;
}

export type ListEntityTypesParams = {
  cursor?: string;
  limit?: number;
};

export type ListEntityTypesResponse = {
  ok: true;
  entity_types: unknown[];
  response_metadata?: { next_cursor?: string | null };
};

export async function listEntityTypes(
  runtime: Runtime,
  params: ListEntityTypesParams,
): Promise<ListEntityTypesResponse> {
  const query: Record<string, string | number | undefined> = {};
  if (params.cursor !== undefined) {
    query.cursor = params.cursor;
  }
  if (params.limit !== undefined) {
    query.limit = params.limit;
  }

  const response = await request(
    runtime.baseUrl,
    "/catalog.entityTypes.list",
    {
      ...requestOptions(runtime),
      method: "GET",
      query,
    },
  );

  return response as ListEntityTypesResponse;
}
