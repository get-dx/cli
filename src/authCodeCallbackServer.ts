import { createServer } from "node:http";

import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { CliError } from "./errors.js";

export type OnCodeReceiptReponse =
  | { type: "SUCCESS"; token: string; redirectUri: string | null }
  | { type: "ERROR"; error: Error };

export type OnCodeReceiptFn = (
  state: string,
  code: string,
) => Promise<OnCodeReceiptReponse>;

export class AuthCodeCallbackServer {
  private server: Server | null = null;
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

  async listenForCode(
    onCodeReceipt: OnCodeReceiptFn,
  ): Promise<OnCodeReceiptReponse> {
    return new Promise<OnCodeReceiptReponse>((resolve, reject) => {
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
          res.writeHead(500, { "Content-Type": "text/plain" }).end(message);
          resolve({ type: "ERROR", error: new CliError(message) });
          return;
        }

        let result: OnCodeReceiptReponse;
        try {
          result = await onCodeReceipt(state ?? "", code);
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Authentication failed: unknown error";
          res.writeHead(500, { "Content-Type": "text/plain" }).end(message);
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
            res
              .writeHead(200, { "Content-Type": "text/plain" })
              .end("Authentication successful");
          }
        } else {
          res
            .writeHead(500, { "Content-Type": "text/plain" })
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
