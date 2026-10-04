import { cpSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const source = join(root, "src");
const destination = join(root, "dist");

rmSync(destination, { recursive: true, force: true });
cpSync(source, destination, { recursive: true });

console.log(`Built ${destination}`);
