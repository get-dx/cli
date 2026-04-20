import { execaSync } from "execa";

import { CliError } from "./errors.js";

const SERVICE = "dx-cli";

interface SecretStore {
  get(baseUrl: string): string | null;
  set(baseUrl: string, token: string): void;
  delete(baseUrl: string): void;
}

export function getToken(baseUrl: string): string | null {
  if (process.env.DX_API_TOKEN) {
    return process.env.DX_API_TOKEN;
  }

  return getSecretStore().get(baseUrl);
}

export function setToken(baseUrl: string, token: string): void {
  getSecretStore().set(baseUrl, token);
}

export function deleteToken(baseUrl: string): void {
  getSecretStore().delete(baseUrl);
}

function getSecretStore(platform = process.platform): SecretStore {
  if (platform === "darwin") {
    return macosSecretStore();
  }

  if (platform === "linux") {
    return linuxSecretStore();
  }

  throw new CliError(
    `Unsupported platform for secure token storage: ${platform}`,
  );
}

function macosSecretStore(): SecretStore {
  return {
    get(baseUrl) {
      try {
        return execaSync("security", [
          "find-generic-password",
          "-s",
          SERVICE,
          "-a",
          baseUrl,
          "-w",
        ]).stdout.trim();
      } catch {
        return null;
      }
    },
    set(baseUrl, token) {
      execaSync("security", [
        "add-generic-password",
        "-U",
        "-s",
        SERVICE,
        "-a",
        baseUrl,
        "-w",
        token,
      ]);
    },
    delete(baseUrl) {
      try {
        execaSync("security", [
          "delete-generic-password",
          "-s",
          SERVICE,
          "-a",
          baseUrl,
        ]);
      } catch {
        // No-op if missing.
      }
    },
  };
}

function linuxSecretStore(): SecretStore {
  return {
    get(baseUrl) {
      try {
        return execaSync("secret-tool", [
          "lookup",
          "service",
          SERVICE,
          "account",
          baseUrl,
        ]).stdout.trim();
      } catch {
        return null;
      }
    },
    set(baseUrl, token) {
      execaSync(
        "secret-tool",
        ["store", "--label=dx-cli", "service", SERVICE, "account", baseUrl],
        { input: token },
      );
    },
    delete(_baseUrl) {
      throw new CliError(
        "Linux token deletion is not supported by secret-tool in this implementation",
      );
    },
  };
}
