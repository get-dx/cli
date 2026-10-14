import type { CliContext } from "../types.js";
import {
  checkCli,
  defaultLatestVersionLookup,
  detectInstall,
  type InstallInfo,
  type LatestVersionLookup,
} from "./cli.js";
import { checkEnvironment } from "./environment.js";
import { checkSkill } from "./skill.js";
import type { CheckStatus, DoctorReport, Section } from "./types.js";

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
  _context: CliContext,
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

  onPhase("version");
  // Without a token, the latest version comes from the npm registry.
  const cli = await checkCli({
    runtime: null,
    apiReachable: false,
    install: deps.install(),
    latestVersion: deps.latestVersion,
    now,
  });
  const skill = await checkSkill();

  return buildReport([cli, environment, skill]);
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
