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
  private requestReceived = false;

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
      const srv = this.server;
      if (!srv) {
        reject(new Error("Unreachable: server not started"));
        return;
      }

      srv.on("request", async (req, res) => {
        if (this.requestReceived) {
          res.writeHead(409, { Connection: "close" }).end();
          return;
        }
        this.requestReceived = true;

        const url = new URL(req.url ?? "/", this.address!);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        const stopServerAndResolve = (result: OnCodeReceiptReponse) => {
          res.once("close", () => {
            this.stop();
            resolve(result);
          });
        };

        if (!code) {
          const message = "Authentication failed: no code received";
          res.writeHead(500, {
            Connection: "close",
            "Content-Type": "text/plain",
          });
          stopServerAndResolve({ type: "ERROR", error: new CliError(message) });
          res.end(message);
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
          res.writeHead(500, {
            Connection: "close",
            "Content-Type": "text/plain",
          });
          stopServerAndResolve({
            type: "ERROR",
            error: err instanceof Error ? err : new CliError(message),
          });
          res.end(message);
          return;
        }

        if (result.type === "SUCCESS") {
          if (result.redirectUri) {
            res.writeHead(302, {
              Connection: "close",
              Location: result.redirectUri,
            });
            stopServerAndResolve(result);
            res.end();
          } else {
            res.writeHead(200, {
              Connection: "close",
              "Content-Type": "text/plain",
            });
            stopServerAndResolve(result);
            res.end("Authentication successful");
          }
        } else {
          res.writeHead(500, {
            Connection: "close",
            "Content-Type": "text/plain",
          });
          stopServerAndResolve(result);
          res.end(result.error.message);
        }
      });
    });
  }

  stop(): void {
    const srv = this.server;
    if (!srv) return;
    srv.closeAllConnections();
    srv.close();
    this.server = null;
  }
}
