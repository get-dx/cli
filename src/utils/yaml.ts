import fs from "fs";

import { parse as parseYaml } from "yaml";

import { CliError, EXIT_CODES } from "../errors.js";

export function readYamlFile(filePath: string): unknown {
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    throw new CliError(
      `Could not read file "${filePath}": ${(err as Error).message}`,
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }
  return parseYaml(content);
}

export async function readYamlStdin(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on("end", () => {
      const content = Buffer.concat(chunks).toString("utf8");
      try {
        resolve(parseYaml(content));
      } catch (err) {
        reject(
          new CliError(
            `Could not parse YAML from stdin: ${(err as Error).message}`,
            EXIT_CODES.ARGUMENT_ERROR,
          ),
        );
      }
    });
    process.stdin.on("error", reject);
  });
}

export function parseYamlObject(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new CliError(
      "YAML content must be an object",
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }

  return raw as Record<string, unknown>;
}
