import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import { CliError } from "./errors.js";

export type CodeResponse =
  | { type: "SUCCESS"; token: string; redirectUri: string | null }
  | { type: "ERROR"; error: Error };

export type CodeListenerFn = (
  state: string,
  code: string,
) => Promise<CodeResponse>;

export class AuthCodeCallbackServer {
  private server: import("node:http").Server | null = null;
  private address: string | null = null;

  async start(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const srv = createServer();
      srv.on("error", reject);
      srv.listen(0, "127.0.0.1", () => {
        this.server = srv;
        const { address, port } = srv.address() as AddressInfo;
        this.address = `http://${address}:${port}`;
        resolve();
      });
    });
  }

  getAddress(): string {
    if (!this.address) {
      throw new Error("Unreachable: server not started");
    }
    return this.address;
  }

  async listenForCodeResponse(listener: CodeListenerFn): Promise<CodeResponse> {
    return new Promise<CodeResponse>((resolve, reject) => {
      if (!this.server) {
        reject(new Error("Unreachable: server not started"));
        return;
      }

      this.server.on("request", async (req, res) => {
        this.stop();

        const url = new URL(req.url ?? "/", this.address!);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        if (!code) {
          const message = "Authentication failed: no code received";
          res.writeHead(400, { "Content-Type": "text/plain" }).end(message);
          resolve({ type: "ERROR", error: new CliError(message) });
          return;
        }

        let result: CodeResponse;
        try {
          result = await listener(state ?? "", code);
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Authentication failed: unknown error";
          res.writeHead(400, { "Content-Type": "text/plain" }).end(message);
          resolve({
            type: "ERROR",
            error: err instanceof Error ? err : new CliError(message),
          });
          return;
        }

        if (result.type === "SUCCESS") {
          if (result.redirectUri) {
            res.writeHead(302, { Location: result.redirectUri }).end();
          } else {
            res.writeHead(200).end();
          }
        } else {
          res
            .writeHead(400, { "Content-Type": "text/plain" })
            .end(result.error.message);
        }
        resolve(result);
      });
    });
  }

  stop(): void {
    this.server?.close();
    this.server = null;
  }
}
