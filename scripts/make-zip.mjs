#!/usr/bin/env node
import { createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import archiver from "archiver";

const [, , srcArg, outArg] = process.argv;
const src = resolve(srcArg);
const out = resolve(outArg);

const srcStat = await stat(src).catch(() => null);
if (!srcStat?.isDirectory()) {
  console.error(`error: source is not a directory: ${src}`);
  process.exit(1);
}

const output = createWriteStream(out);
const archive = archiver("zip", { zlib: { level: 9 }, forceLocalTime: true });

output.on("close", () => {
  const mb = (archive.pointer() / (1024 * 1024)).toFixed(2);
  console.log(`wrote ${out} (${mb} MB, ${archive.pointer()} bytes)`);
});
archive.on("warning", (err) => {
  if (err.code === "ENOENT") console.warn(err);
  else throw err;
});
archive.on("error", (err) => {
  throw err;
});

archive.pipe(output);
archive.glob("**/*", { cwd: src, dot: true });
await archive.finalize();
