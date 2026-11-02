import os from "node:os";
import path from "node:path";

import { isSkillInstalled } from "../skill.js";
import { tildify } from "./format.js";
import { check, type Section } from "./types.js";

export async function checkSkill(): Promise<Section> {
  const installed = await isSkillInstalled();
  const skillPath = tildify(
    path.join(os.homedir(), ".agents", "skills", "dx-cli"),
  );
  return {
    id: "skill",
    title: "Agent skill",
    checks: [
      check(
        "skill",
        "dx-cli skill",
        "ok",
        installed ? `installed (${skillPath})` : "not installed",
        { data: { installed, path: installed ? skillPath : null } },
      ),
    ],
  };
}
