import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import AdmZip from "adm-zip";

const appDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryDirectory = path.resolve(appDirectory, "../..");
const distributionDirectory = path.join(appDirectory, "dist");
const artifactsDirectory = path.join(repositoryDirectory, "artifacts");

const manifest = JSON.parse(await readFile(path.join(distributionDirectory, "manifest.json"), "utf8"));
const outputPath = path.join(artifactsDirectory, `bgg-linker-${manifest.version}.zip`);

await mkdir(artifactsDirectory, { recursive: true });

const archive = new AdmZip();
archive.addLocalFolder(distributionDirectory);
archive.writeZip(outputPath);

const entries = new AdmZip(outputPath).getEntries().map((entry) => entry.entryName);
if (!entries.includes("manifest.json")) {
  throw new Error("Invalid extension package: manifest.json is not at the archive root.");
}

console.log(`Created ${path.relative(repositoryDirectory, outputPath)} (${entries.length} files)`);
