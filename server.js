// Serves the frontend from public/ and the coach API. No dependencies: run with `node server.js`.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { plan, reflect, CoachError, MINUTES } from "./coach.js";

const PORT = 8000;
const PUBLIC = fileURLToPath(new URL("./public/", import.meta.url));
const LIBRARY_FILE = fileURLToPath(new URL("./library.json", import.meta.url));
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function readJson(req, limit = 10_000) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new CoachError("Request body too large.", 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new CoachError("Request body must be JSON.", 400);
  }
}

async function handlePlan(req, res) {
  const { feeling, minutes } = await readJson(req);
  if (typeof feeling !== "string" || !feeling.trim() || feeling.length > 500) {
    throw new CoachError("feeling must be a short piece of text (up to 500 characters).", 400);
  }
  if (!Number.isInteger(minutes) || minutes < MINUTES.min || minutes > MINUTES.max) {
    throw new CoachError(`minutes must be a whole number from ${MINUTES.min} to ${MINUTES.max}.`, 400);
  }
  send(res, 200, await plan({ feeling: feeling.trim(), minutes }));
}

async function handleReflect(req, res) {
  const summary = await readJson(req, 2_000);
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new CoachError("The session summary must be a JSON object.", 400);
  }
  send(res, 200, await reflect(summary));
}

async function serveStatic(pathname, res) {
  const file = pathname === "/library.json"
    ? LIBRARY_FILE
    : join(PUBLIC, normalize(pathname === "/" ? "/index.html" : pathname));
  if (file !== LIBRARY_FILE && !file.startsWith(PUBLIC)) return send(res, 404, "Not found", "text/plain");
  try {
    send(res, 200, await readFile(file), TYPES[extname(file)] ?? "application/octet-stream");
  } catch {
    send(res, 404, "Not found", "text/plain");
  }
}

const routes = { "POST /api/plan": handlePlan, "POST /api/reflect": handleReflect };

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  try {
    const route = routes[`${req.method} ${pathname}`];
    if (route) return await route(req, res);
    if (pathname.startsWith("/api/")) return send(res, 404, { error: "Unknown API route." });
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed", "text/plain");
    await serveStatic(decodeURIComponent(pathname), res);
  } catch (err) {
    const status = err instanceof CoachError ? err.status : 500;
    if (status >= 500) console.error(err);
    send(res, status, { error: err instanceof CoachError ? err.message : "Something went wrong on the server." });
  }
}).listen(PORT, () => {
  console.log(`Sloth Mode is running at http://localhost:${PORT}`);
});
