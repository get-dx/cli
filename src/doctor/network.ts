import { describeError, errorCode, timed } from "./format.js";
import {
  CHECK_TIMEOUT_MS,
  DOCTOR_HEADER,
  type NetworkProbes,
} from "./probes.js";
import { check, type Check, type Section } from "./types.js";

export type NetworkFacts = {
  /** Whether the DX API answered an HTTPS request. */
  apiReachable: boolean;
};

const TLS_VERIFY_HINT =
  "Your network may be intercepting HTTPS traffic with its own certificate.\nSet NODE_EXTRA_CA_CERTS to your corporate CA bundle (PEM), or ask your network team to allow {host}.";

const CONNECTION_RESET_HINT =
  "A firewall or proxy on your network is likely interrupting HTTPS traffic to {host}.\nAsk your network team to allow {host}, or set NODE_EXTRA_CA_CERTS to your corporate CA bundle.";

export async function checkNetwork(options: {
  apiBaseUrl: string;
  webBaseUrl: string;
  version: string;
  probes: NetworkProbes;
}): Promise<{ section: Section; facts: NetworkFacts }> {
  const { apiBaseUrl, webBaseUrl, version, probes } = options;
  const checks: Check[] = [];

  let url: URL;
  try {
    url = new URL(apiBaseUrl);
  } catch {
    checks.push(
      check("dns", "DNS", "fail", `invalid API base URL "${apiBaseUrl}"`, {
        hint: "Check DX_API_BASE_URL or the apiBaseUrl in your config file.",
      }),
      await webAppCheck(webBaseUrl, version, probes),
    );
    return {
      section: { id: "network", title: "Network", checks },
      facts: { apiReachable: false },
    };
  }

  const host = url.hostname;
  const isHttps = url.protocol === "https:";
  const port = url.port ? Number(url.port) : isHttps ? 443 : 80;
  const fill = (text: string) => text.replaceAll("{host}", host);

  let skipReason: string | null = null;
  const skip = (id: string, label: string) =>
    check(id, label, "skip", `skipped because ${skipReason}`);

  // 1. DNS
  try {
    const { value: addresses, ms } = await timed(() => probes.lookup(host));
    checks.push(
      check(
        "dns",
        "DNS",
        "ok",
        `resolved to ${addresses.join(", ")} (${ms}ms)`,
        { data: { addresses, ms } },
      ),
    );
  } catch (error) {
    const code = errorCode(error);
    checks.push(
      check("dns", "DNS", "fail", describeError(error, "DNS lookup"), {
        hint:
          code === "ENOTFOUND"
            ? fill(
                "{host} could not be resolved. Check the API base URL, your VPN, and your DNS settings.",
              )
            : "Check your network connection, VPN, and DNS settings.",
        data: { code },
      }),
    );
    skipReason = "DNS lookup failed";
  }

  // 2. TCP
  if (skipReason) {
    checks.push(skip("tcp", "TCP connect"));
  } else {
    try {
      const { ms } = await timed(() => probes.tcpConnect(host, port));
      checks.push(
        check("tcp", "TCP connect", "ok", `port ${port} open (${ms}ms)`, {
          data: { port, ms },
        }),
      );
    } catch (error) {
      checks.push(
        check(
          "tcp",
          "TCP connect",
          "fail",
          describeError(error, `connecting to port ${port}`),
          {
            hint: fill(
              `A firewall may be blocking outbound connections to {host} on port ${port}.`,
            ),
            data: { port, code: errorCode(error) },
          },
        ),
      );
      skipReason = "the TCP connection failed";
    }
  }

  // 3. TLS
  if (!isHttps) {
    checks.push(
      check(
        "tls",
        "TLS handshake",
        "skip",
        "skipped because the API base URL does not use HTTPS",
      ),
    );
  } else if (skipReason) {
    checks.push(skip("tls", "TLS handshake"));
  } else {
    const tlsCheck = await tlsHandshakeCheck(host, port, probes, fill);
    checks.push(tlsCheck);
    if (tlsCheck.status === "fail") {
      skipReason = "the TLS handshake failed";
    }
  }

  // 4. HTTPS request to the API
  let apiReachable = false;
  if (skipReason) {
    checks.push(skip("https", "HTTPS"));
  } else {
    const httpsCheck = await apiRequestCheck(apiBaseUrl, version, probes, fill);
    checks.push(httpsCheck);
    apiReachable = httpsCheck.status === "ok";
  }

  // 5. Web app, independent of the API checks
  checks.push(await webAppCheck(webBaseUrl, version, probes));

  return {
    section: { id: "network", title: `Network (${host})`, checks },
    facts: { apiReachable },
  };
}

async function tlsHandshakeCheck(
  host: string,
  port: number,
  probes: NetworkProbes,
  fill: (text: string) => string,
): Promise<Check> {
  try {
    const { value: result, ms } = await timed(() =>
      probes.tlsHandshake(host, port),
    );
    const { certificate } = result;
    const parts = [
      result.protocol,
      certificate.issuer ? `issuer "${certificate.issuer}"` : null,
      certificate.validTo
        ? `valid until ${certificate.validTo.slice(0, 10)}`
        : null,
    ].filter(Boolean);
    const summary = `${parts.join("; ")} (${ms}ms)`;
    const data = {
      protocol: result.protocol,
      subject: certificate.subject,
      issuer: certificate.issuer,
      valid_to: certificate.validTo,
      authorized: result.authorized,
      authorization_error: result.authorizationError,
      root: result.rootIssuer,
      root_is_bundled: result.rootIsBundled,
      ms,
    };

    if (!result.authorized) {
      return check(
        "tls",
        "TLS handshake",
        "fail",
        `certificate not trusted (${result.authorizationError ?? "unknown error"}); ${summary}`,
        { hint: fill(TLS_VERIFY_HINT), data },
      );
    }

    if (result.rootIsBundled === false) {
      return check(
        "tls",
        "TLS handshake",
        "warn",
        `trusted via a non-public CA "${result.rootIssuer}"; ${summary}`,
        {
          hint: `Traffic appears to be intercepted by "${result.rootIssuer}". This works because that CA is trusted locally, but requests are being inspected by your network.`,
          data,
        },
      );
    }

    return check("tls", "TLS handshake", "ok", summary, { data });
  } catch (error) {
    const code = errorCode(error);
    const reset = code === "ECONNRESET" || code === "EPIPE";
    return check(
      "tls",
      "TLS handshake",
      "fail",
      reset
        ? `connection reset by peer during handshake (${code})`
        : describeError(error, "TLS handshake"),
      {
        hint: fill(reset ? CONNECTION_RESET_HINT : TLS_VERIFY_HINT),
        data: { code },
      },
    );
  }
}

async function apiRequestCheck(
  apiBaseUrl: string,
  version: string,
  probes: NetworkProbes,
  fill: (text: string) => string,
): Promise<Check> {
  const url = `${apiBaseUrl}/auth.info`;
  try {
    const { value: response, ms } = await timed(async () => {
      const response = await probes.fetch(url, {
        headers: {
          ...clientHeaders(version),
          ...DOCTOR_HEADER,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      });
      return { status: response.status, text: await response.text() };
    });
    const data = { url, status: response.status, ms };

    if (!isJson(response.text)) {
      return check(
        "https",
        "HTTPS",
        "fail",
        `unexpected non-JSON response (HTTP ${response.status}) (${ms}ms)`,
        {
          hint: fill(
            "Something other than the DX API answered. A proxy, firewall, or captive portal may be intercepting requests to {host}.",
          ),
          data,
        },
      );
    }

    if (response.status >= 500) {
      return check(
        "https",
        "HTTPS",
        "fail",
        `DX API returned HTTP ${response.status} (${ms}ms)`,
        {
          hint: "The DX API is having problems. Try again in a few minutes.",
          data,
        },
      );
    }

    const message =
      response.status === 401
        ? `DX API responded (401 without token, as expected) (${ms}ms)`
        : `DX API responded (HTTP ${response.status}) (${ms}ms)`;
    return check("https", "HTTPS", "ok", message, { data });
  } catch (error) {
    return check("https", "HTTPS", "fail", describeError(error, "request"), {
      hint: fill(
        "Requests to {host} are failing even though the connection succeeded. A proxy or firewall may be interfering.",
      ),
      data: { url, code: errorCode(error) },
    });
  }
}

async function webAppCheck(
  webBaseUrl: string,
  version: string,
  probes: NetworkProbes,
): Promise<Check> {
  try {
    const { value: status, ms } = await timed(async () => {
      const response = await probes.fetch(webBaseUrl, {
        headers: { ...clientHeaders(version), ...DOCTOR_HEADER },
        signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      });
      await response.body?.cancel();
      return response.status;
    });
    const data = { url: webBaseUrl, status, ms };
    if (status >= 500) {
      return check(
        "web_app",
        "Web app reachable",
        "fail",
        `${webBaseUrl} returned HTTP ${status} (${ms}ms)`,
        {
          hint: "The DX web app is having problems. Browser login may not work.",
          data,
        },
      );
    }
    if (status >= 400) {
      return check(
        "web_app",
        "Web app reachable",
        "warn",
        `${webBaseUrl} returned HTTP ${status} (${ms}ms)`,
        {
          hint: "The web app answered with an error. A proxy or firewall may be blocking it, and browser login may not work.",
          data,
        },
      );
    }
    return check(
      "web_app",
      "Web app reachable",
      "ok",
      `${webBaseUrl} responded ${status} (${ms}ms)`,
      { data },
    );
  } catch (error) {
    return check(
      "web_app",
      "Web app reachable",
      "fail",
      `${webBaseUrl}: ${describeError(error, "request")}`,
      {
        hint: "Browser login (`dx auth login` without --token) needs the web app. Check your network, or log in with --token instead.",
        data: { url: webBaseUrl, code: errorCode(error) },
      },
    );
  }
}

function clientHeaders(version: string): Record<string, string> {
  return {
    "X-Client-Type": "dx-cli",
    "X-Client-Version": version,
    "User-Agent": `dx-cli/${version}`,
  };
}

function isJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}
