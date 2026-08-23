import { existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const valueAfter = (name: string) => {
  const index = Bun.argv.indexOf(name);
  return index >= 0 ? Bun.argv[index + 1] : undefined;
};

const root = resolve(import.meta.dir, "../src");
const hostname = valueAfter("--host") ?? "127.0.0.1";
const port = Number(valueAfter("--port") ?? "5173");
const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
};

const server = Bun.serve({
  hostname,
  port,
  fetch(request) {
    const url = new URL(request.url);
    const requested = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, "");
    const candidate = resolve(root, requested || "index.html");
    if (!candidate.startsWith(`${root}/`) || !existsSync(candidate) || !statSync(candidate).isFile()) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(Bun.file(candidate), {
      headers: { "content-type": contentTypes[extname(candidate)] ?? "application/octet-stream" },
    });
  },
});

console.log(`Serving ${root} at ${server.url}`);
