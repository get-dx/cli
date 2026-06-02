import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export async function isSkillInstalled(): Promise<boolean> {
  const skillPath = join(homedir(), ".agents", "skills", "dx-cli");
  return access(skillPath)
    .then(() => true)
    .catch(() => false);
}
