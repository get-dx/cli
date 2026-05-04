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
      try {
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
      } catch (error) {
        throw new CliError(
          [
            "Unable to save the DX API token securely using macOS Keychain.",
            "",
            "Set DX_API_TOKEN in the environment, or try again from a macOS session with Keychain access.",
            formatErrorDetails(error),
          ]
            .filter(Boolean)
            .join("\n"),
        );
      }
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
      try {
        execaSync(
          "secret-tool",
          ["store", "--label=dx-cli", "service", SERVICE, "account", baseUrl],
          { input: token },
        );
      } catch (error) {
        throw buildLinuxTokenStorageError(error);
      }
    },
    delete(_baseUrl) {
      throw new CliError(
        "Linux token deletion is not supported by secret-tool in this implementation",
      );
    },
  };
}

function buildLinuxTokenStorageError(error: unknown): CliError {
  if (hasErrorCode(error, "ENOENT")) {
    return new CliError(
      [
        "Unable to save the DX API token securely because `secret-tool` is not installed.",
        "",
        "Install `libsecret-tools`, or set DX_API_TOKEN in the environment instead of using `dx auth login` or `dx init` to store credentials.",
      ].join("\n"),
    );
  }

  if (isLinuxSecretServiceUnavailable(error)) {
    return new CliError(
      [
        "Unable to save the DX API token securely because the Linux Secret Service/keyring is not available.",
        "",
        "This often happens in Docker or dev containers, even when `secret-tool` is installed. Set DX_API_TOKEN in the container environment instead of using `dx auth login` or `dx init` to store credentials, or run the CLI in an environment with a working Secret Service provider such as GNOME Keyring.",
        formatErrorDetails(error),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return new CliError(
    [
      "Unable to save the DX API token securely using `secret-tool`.",
      "",
      "Set DX_API_TOKEN in the environment, or configure a working Linux Secret Service provider such as GNOME Keyring.",
      formatErrorDetails(error),
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

function hasErrorCode(error: unknown, code: string): boolean {
  if (!isRecord(error)) {
    return false;
  }

  return error.code === code;
}

function isLinuxSecretServiceUnavailable(error: unknown): boolean {
  const text = errorText(error);
  return [
    "org.freedesktop.secrets",
    "Cannot autolaunch D-Bus",
    "No such secret service",
  ].some((message) => text.includes(message));
}

function formatErrorDetails(error: unknown): string | null {
  if (!isRecord(error) || typeof error.stderr !== "string") {
    return null;
  }

  const stderr = error.stderr.trim();
  return stderr ? `Details: ${stderr}` : null;
}

function errorText(error: unknown): string {
  if (!isRecord(error)) {
    return String(error);
  }

  return [
    typeof error.stderr === "string" ? error.stderr : null,
    typeof error.shortMessage === "string" ? error.shortMessage : null,
    typeof error.message === "string" ? error.message : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
