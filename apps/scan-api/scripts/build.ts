import { build } from "esbuild";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";

const root = resolve(import.meta.dirname, "..");
const outDir = resolve(root, "dist/lambdas");

const handlers = [
  "authorizer",
  "create-upload",
  "list-scans",
  "get-scan",
  "get-scan-file",
  "delete-scan",
  "worker",
] as const;

async function gzipFile(input: string, output: string) {
  await mkdir(dirname(output), { recursive: true });
  await pipeline(
    Readable.from((await import("node:fs")).createReadStream(input)),
    createGzip({ level: 9 }),
    createWriteStream(output),
  );
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

for (const handler of handlers) {
  const jsFile = resolve(outDir, `${handler}.mjs`);
  await build({
    entryPoints: [resolve(root, `src/handlers/${handler}.ts`)],
    outfile: jsFile,
    bundle: true,
    platform: "node",
    target: "node24",
    format: "esm",
    sourcemap: false,
    minify: true,
    banner: {
      js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
    },
  });

  // Terraform only needs stable artifacts; Lambda accepts gzip-compressed JS in a zip-like file name poorly,
  // so this file is intentionally just the bundle. Terraform module uses archive_file to zip it.
}

console.log(`Built ${handlers.length} Lambda bundles in ${outDir}`);
