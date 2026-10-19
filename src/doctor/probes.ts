import { X509Certificate } from "node:crypto";
import dns from "node:dns";
import net from "node:net";
import tls from "node:tls";

export const CHECK_TIMEOUT_MS = 10_000;

/** Headers sent on doctor's requests, so they can be told apart in logs. */
export const DOCTOR_HEADER = { "X-DX-Doctor": "1" };

export class ProbeTimeoutError extends Error {
  readonly timeoutMs: number;
  constructor(timeoutMs: number) {
    super(`timed out after ${timeoutMs / 1000}s`);
    this.name = "ProbeTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export type TlsCertificateSummary = {
  subject: string | null;
  issuer: string | null;
  validTo: string | null;
};

export type TlsHandshakeResult = {
  protocol: string | null;
  /** Whether the certificate chain verified against Node's trusted CAs. */
  authorized: boolean;
  /** OpenSSL verification error code, e.g. `SELF_SIGNED_CERT_IN_CHAIN`. */
  authorizationError: string | null;
  certificate: TlsCertificateSummary;
  /**
   * Whether the chain's root is in Node's bundled CA store. `false` means the
   * chain was trusted only through an extra CA (e.g. `NODE_EXTRA_CA_CERTS` or
   * the system store), which usually means TLS interception. `null` if the
   * root could not be determined.
   */
  rootIsBundled: boolean | null;
  rootIssuer: string | null;
};

/**
 * Low-level network operations used by `dx doctor`, injectable so tests can
 * simulate DNS failures, connection resets, untrusted certificates, etc.
 */
export interface NetworkProbes {
  lookup(hostname: string): Promise<string[]>;
  tcpConnect(hostname: string, port: number): Promise<void>;
  tlsHandshake(hostname: string, port: number): Promise<TlsHandshakeResult>;
  fetch: typeof fetch;
}

export const defaultProbes: NetworkProbes = {
  lookup: (hostname) =>
    withTimeout(
      dns.promises
        .lookup(hostname, { all: true })
        .then((results) => results.map((result) => result.address)),
    ),
  tcpConnect,
  tlsHandshake,
  fetch: (input, init) => globalThis.fetch(input, init),
};

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new ProbeTimeoutError(CHECK_TIMEOUT_MS)),
      CHECK_TIMEOUT_MS,
    );
    timer.unref?.();
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function tcpConnect(hostname: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: hostname, port });
    socket.setTimeout(CHECK_TIMEOUT_MS, () => {
      socket.destroy();
      reject(new ProbeTimeoutError(CHECK_TIMEOUT_MS));
    });
    socket.once("connect", () => {
      socket.destroy();
      resolve();
    });
    socket.once("error", (error) => {
      socket.destroy();
      reject(error);
    });
  });
}

function tlsHandshake(
  hostname: string,
  port: number,
): Promise<TlsHandshakeResult> {
  return new Promise((resolve, reject) => {
    // Verify manually after the handshake so a bad chain is reported with its
    // details instead of only as an error.
    const socket = tls.connect({
      host: hostname,
      port,
      servername: net.isIP(hostname) ? undefined : hostname,
      rejectUnauthorized: false,
    });
    socket.setTimeout(CHECK_TIMEOUT_MS, () => {
      socket.destroy();
      reject(new ProbeTimeoutError(CHECK_TIMEOUT_MS));
    });
    socket.once("secureConnect", () => {
      const peer = socket.getPeerCertificate(true);
      const root = findChainRoot(peer);
      const authorizationError = socket.authorizationError;
      resolve({
        protocol: socket.getProtocol() ?? null,
        authorized: socket.authorized,
        authorizationError: authorizationError
          ? String(
              (authorizationError as NodeJS.ErrnoException).code ??
                authorizationError,
            )
          : null,
        certificate: {
          subject: certificateName(peer.subject),
          issuer: certificateName(peer.issuer),
          validTo: peer.valid_to ? new Date(peer.valid_to).toISOString() : null,
        },
        rootIsBundled: root
          ? bundledRootFingerprints().has(root.fingerprint256)
          : null,
        rootIssuer: root ? certificateName(root.subject) : null,
      });
      socket.destroy();
    });
    socket.once("error", (error) => {
      socket.destroy();
      reject(error);
    });
  });
}

/** The self-signed root at the top of a peer chain, if Node resolved one. */
function findChainRoot(
  certificate: tls.DetailedPeerCertificate,
): tls.DetailedPeerCertificate | null {
  let current = certificate;
  const seen = new Set<string>();
  while (current?.fingerprint256 && !seen.has(current.fingerprint256)) {
    seen.add(current.fingerprint256);
    const issuer = current.issuerCertificate;
    if (!issuer || issuer.fingerprint256 === current.fingerprint256) {
      return issuer ? current : null;
    }
    current = issuer;
  }
  return null;
}

let bundledFingerprints: Set<string> | undefined;

function bundledRootFingerprints(): Set<string> {
  bundledFingerprints ??= new Set(
    tls.rootCertificates.map((pem) => new X509Certificate(pem).fingerprint256),
  );
  return bundledFingerprints;
}

function certificateName(
  name: tls.PeerCertificate["subject"] | undefined,
): string | null {
  if (!name) {
    return null;
  }
  const value = (key: "CN" | "O") => {
    const field = name[key] as string | string[] | undefined;
    return Array.isArray(field) ? field[0] : field;
  };
  const commonName = value("CN");
  const organization = value("O");
  if (commonName && organization && commonName !== organization) {
    return `${commonName} (${organization})`;
  }
  return commonName ?? organization ?? null;
}
