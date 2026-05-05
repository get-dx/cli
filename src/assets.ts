import fs from "fs";

let assets: Record<string, string> | null = null;

export function getAssets(): Record<string, string> {
  if (assets === null) {
    assets = {
      logoD: loadAsset("logo-d.txt"),
      logoX: loadAsset("logo-x.txt"),
    };
  }

  return assets;
}

function loadAsset(filename: string): string {
  const filePath = new URL(`../assets/${filename}`, import.meta.url);
  return fs.readFileSync(filePath, "utf8");
}
