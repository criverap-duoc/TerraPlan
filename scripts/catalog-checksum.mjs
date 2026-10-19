import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const CATALOG_DIR = join(resolve(SCRIPT_DIR, '..'), 'catalog');
const META_FILE = join(CATALOG_DIR, 'catalog.meta.json');

// Checksum input order is part of the contract with AquaMetric: never reorder.
const CHECKSUM_FILES = [
  'regulations.v1.json',
  'units.v1.json',
  'parameters.v1.json',
  'limits.v1.json',
];

const shouldWrite = process.argv.includes('--write');

const hash = createHash('sha256');

for (const fileName of CHECKSUM_FILES) {
  // Normalize in memory: an editor that reintroduces CRLF must not change the hash.
  hash.update(readFileSync(join(CATALOG_DIR, fileName), 'utf8').replace(/\r\n/g, '\n'));
}

const computed = hash.digest('hex');
const meta = JSON.parse(readFileSync(META_FILE, 'utf8'));
const declared = String(meta.sha256 ?? '').toLowerCase();

if (shouldWrite) {
  meta.sha256 = computed;
  meta.updatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  writeFileSync(META_FILE, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`Catalog checksum updated: ${computed}`);
} else if (declared !== computed) {
  console.error(
    `Catalog checksum MISMATCH. Declared: ${declared || '(missing)'}, computed: ${computed}. ` +
      "Run 'pnpm catalog:checksum --write' to update.",
  );
  process.exitCode = 1;
} else {
  console.log(`Catalog checksum OK: ${computed}`);
}
