import { cpSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const source = join(root, "src");
const destination = join(root, "dist");

rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });

for (const entry of readdirSync(source)) {
  cpSync(join(source, entry), join(destination, entry), { recursive: true });
}

console.log(`Built ${destination}`);
