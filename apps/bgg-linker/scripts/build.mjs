import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { build } from "esbuild";

const appDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(appDirectory, "dist");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await build({
  entryPoints: {
    background: path.join(appDirectory, "src/background.ts"),
    content: path.join(appDirectory, "src/content.ts"),
    options: path.join(appDirectory, "src/options.ts")
  },
  outdir: outputDirectory,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "chrome120",
  sourcemap: true
});

await cp(path.join(appDirectory, "manifest.json"), path.join(outputDirectory, "manifest.json"));
await cp(path.join(appDirectory, "public"), outputDirectory, { recursive: true });
