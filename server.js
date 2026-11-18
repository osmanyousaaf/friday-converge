// FRIDAY - tiny zero-dependency server.
// Serves the web app and proxies chat requests to Groq so the API key
// stays on the server and is NEVER sent to the browser.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize } from "node:path";
import { existsSync, readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- load .env (no dependency) ---
function loadEnv() {
  const path = join(__dirname, ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();

const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

const SYSTEM_PROMPT =
  "You are FRIDAY, a calm, concise, friendly AI assistant. " +
  "You help the user with short, clear answers. Keep replies brief unless asked for detail.";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

async function handleChat(req, res) {
  if (!GROQ_API_KEY) {
    return send(res, 500, { error: "GROQ_API_KEY missing. Copy .env.example to .env and add your key." });
  }
  let raw = "";
  for await (const chunk of req) raw += chunk;
  let messages;
  try {
    messages = JSON.parse(raw).messages;
    if (!Array.isArray(messages)) throw new Error("messages must be an array");
  } catch (e) {
    return send(res, 400, { error: "Bad request: " + e.message });
  }

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.7,
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      return send(res, r.status, { error: data?.error?.message || "Groq error" });
    }
    const reply = data.choices?.[0]?.message?.content ?? "(no reply)";
    return send(res, 200, { reply });
  } catch (e) {
    return send(res, 502, { error: "Could not reach Groq: " + e.message });
  }
}

async function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  // prevent path traversal
  const safe = normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(__dirname, "public", safe);
  try {
    const content = await readFile(filePath);
    const type = MIME[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  }
}

const server = createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/chat") return handleChat(req, res);
  if (req.method === "GET") return serveStatic(req, res);
  send(res, 405, { error: "Method not allowed" });
});

server.listen(PORT, () => {
  console.log(`FRIDAY is awake  →  http://localhost:${PORT}`);
  if (!GROQ_API_KEY) console.log("WARNING: no GROQ_API_KEY found in .env — chat will not work.");
});
