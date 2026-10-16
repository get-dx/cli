import { Command } from "commander";

import {
  createExampleText,
  getContext,
  wrapAction,
} from "../commandHelpers.js";
import { runDoctor, type DoctorPhase } from "../doctor/index.js";
import type { Check, DoctorReport, CheckSource } from "../doctor/types.js";
import {
  AsyncProgressReporter,
  renderJson,
  renderRichText,
} from "../renderers.js";
import * as ui from "../ui.js";

const MIN_LABEL_WIDTH = 26;

const PHASE_MESSAGES: Record<DoctorPhase, string> = {
  config: "Checking configuration…",
  network: "Checking network…",
  auth: "Checking authentication…",
  version: "Checking for updates…",
};

export function doctorCommand(): Command {
  return new Command("doctor")
    .description(
      "Diagnose problems with your CLI instance's installation, configuration, networking, and authentication",
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        { label: "Check your setup", command: "dx doctor" },
        { label: "Print the report as JSON", command: "dx doctor --json" },
      ]),
    )
    .action(
      wrapAction(async (_options: unknown, command: Command) => {
        const context = getContext(command);

        const progress = new AsyncProgressReporter();
        progress.start(PHASE_MESSAGES.config);
        let report: DoctorReport;
        try {
          report = await runDoctor(context, {
            onPhase: (phase) => progress.update(PHASE_MESSAGES[phase]),
          });
        } finally {
          progress.stop();
        }

        if (context.json) {
          renderJson(report);
        } else {
          renderDoctorReport(report);
        }

        if (!report.ok) {
          process.exitCode = 1;
        }
      }),
    );
}

export function renderDoctorReport(report: DoctorReport): void {
  const labelWidth = Math.max(
    MIN_LABEL_WIDTH,
    ...report.sections.flatMap((section) =>
      section.checks.map((check) => check.label.length + 2),
    ),
  );

  renderRichText([
    ...report.sections.map((section) =>
      ui.statusList(
        section.title,
        section.checks.map((check) => ({
          status: check.status,
          label: check.label,
          detail: formatDetail(check),
          hint: check.hint,
        })),
        { labelWidth },
      ),
    ),
    ui.p(summaryLine(report)),
  ]);
}

function formatDetail(check: Check): string {
  if (!check.source) {
    return check.message;
  }
  return `${check.message} ${ui.dim(`[from ${sourceName(check.source)}]`)}`;
}

function sourceName(source: CheckSource): string {
  switch (source) {
    case "env":
      return "env";
    case "config":
      return "config file";
    case "default":
      return "default";
    case "keychain":
      return "keychain";
  }
}

function summaryLine(report: DoctorReport): string {
  const { fail, warn } = report.summary;
  const plural = (count: number, word: string) =>
    `${count} ${word}${count === 1 ? "" : "s"}`;

  if (fail > 0) {
    const failed = ui.error(`${plural(fail, "check")} failed`);
    return warn > 0 ? `${failed}, ${plural(warn, "warning")}.` : `${failed}.`;
  }
  if (warn > 0) {
    return ui.warning(
      `All required checks passed, ${plural(warn, "warning")}.`,
    );
  }
  return ui.success("All checks passed.");
}
