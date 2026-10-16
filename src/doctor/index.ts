import { buildLogger } from "../runtime.js";
import type { CliContext, Runtime } from "../types.js";
import {
  checkCli,
  defaultLatestVersionLookup,
  detectInstall,
  type InstallInfo,
  type LatestVersionLookup,
} from "./cli.js";
import { checkConfig } from "./config.js";
import { checkEnvironment } from "./environment.js";
import { checkSkill } from "./skill.js";
import type { CheckStatus, DoctorReport, Section } from "./types.js";

import cliPackage from "../../package.json" with { type: "json" };

export type DoctorPhase = "config" | "network" | "auth" | "version";

export type DoctorDependencies = {
  latestVersion: LatestVersionLookup;
  install: () => InstallInfo;
  now: () => Date;
};

const defaultDependencies: DoctorDependencies = {
  latestVersion: defaultLatestVersionLookup,
  install: () => detectInstall(),
  now: () => new Date(),
};

/**
 * Run every doctor check. Never throws: problems are reported as checks.
 */
export async function runDoctor(
  context: CliContext,
  options: {
    dependencies?: Partial<DoctorDependencies>;
    onPhase?: (phase: DoctorPhase) => void;
  } = {},
): Promise<DoctorReport> {
  const deps = { ...defaultDependencies, ...options.dependencies };
  const onPhase = options.onPhase ?? (() => {});
  const now = deps.now();

  onPhase("config");
  const environment = checkEnvironment();
  const config = await checkConfig();
  const { apiBaseUrl, webBaseUrl, token } = config.facts;

  const runtime: Runtime | null = token
    ? {
        apiBaseUrl,
        webBaseUrl,
        token,
        context,
        version: cliPackage.version,
        logger: buildLogger(context),
      }
    : null;

  onPhase("version");
  const cli = await checkCli({
    runtime,
    // Until network checks exist, always try the DX API when there's a token.
    // A failed lookup falls back to the npm registry.
    apiReachable: true,
    install: deps.install(),
    latestVersion: deps.latestVersion,
    now,
  });
  const skill = await checkSkill();

  return buildReport([cli, environment, config.section, skill]);
}

function buildReport(sections: Section[]): DoctorReport {
  const summary: Record<CheckStatus, number> = {
    ok: 0,
    warn: 0,
    fail: 0,
    skip: 0,
  };
  for (const section of sections) {
    for (const check of section.checks) {
      summary[check.status] += 1;
    }
  }
  return { ok: summary.fail === 0, summary, sections };
}
