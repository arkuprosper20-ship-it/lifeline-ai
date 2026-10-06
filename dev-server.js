// LIFELINE AI — minimal local dev server (zero dependencies)
// Serves the static PWA and proxies /api/* to the local Node handlers.
// Twilio is NOT required: api/notify.js gracefully falls back when it is
// absent or unconfigured.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;
const ROOT = path.resolve(__dirname);
const API_NOTIFY = require(path.join(ROOT, "api", "notify.js"));
const API_TWILIO_WEBHOOK = require(path.join(ROOT, "api", "twilio-webhook.js"));
const API_MESSAGE_STATUS = require(path.join(ROOT, "api", "message-status.js"));

loadDotEnv(path.join(ROOT, ".env"));
process.env.NODE_ENV = process.env.NODE_ENV || "development";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function loadDotEnv(file) {
  try {
    const raw = fs.readFileSync(file, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch (e) {
    // no .env — fine, defaults apply
  }
}

function safePath(reqPath) {
  // Prevent path traversal outside the project root.
  const decoded = decodeURIComponent(reqPath);
  const normalized = path.normalize(decoded).replace(/^([/\\])+\./, "");
  const full = path.join(ROOT, normalized);
  if (!full.startsWith(ROOT + path.sep) && full !== ROOT) return null;
  return full;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  const pathname = url.pathname;

  // API proxy — runs the serverless handler in-process.
  if (pathname === "/api/notify" || pathname.startsWith("/api/notify/")) {
    API_NOTIFY(req, res);
    return;
  }
  if (pathname === "/api/twilio-webhook" || pathname.startsWith("/api/twilio-webhook/")) {
    API_TWILIO_WEBHOOK(req, res);
    return;
  }
  if (pathname === "/api/message-status" || pathname.startsWith("/api/message-status/")) {
    API_MESSAGE_STATUS(req, res);
    return;
  }

  // Route SPA: landing at root, all other unknown paths -> index.html
  let file = pathname === "/" ? "/index.html" : pathname;
  if (file === "/landing") file = "/landing.html";

  const full = safePath(file);
  if (!full) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(full, (err, data) => {
    if (err) {
      // SPA fallback only for non-file routes
      if (file === "/index.html" || pathname === "/" || pathname.startsWith("/#") || pathname.indexOf(".") === -1) {
        const index = path.join(ROOT, "index.html");
        fs.readFile(index, (e, html) => {
          if (e) {
            res.writeHead(500);
            res.end("Internal Server Error");
            return;
          }
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
          res.end(html);
        });
        return;
      }
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    const ext = path.extname(full).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(" LIFELINE AI dev server");
  console.log("   Local:  http://localhost:" + PORT);
  console.log("   API:    http://localhost:" + PORT + "/api/notify");
  console.log("   Webhook: http://localhost:" + PORT + "/api/twilio-webhook");
  console.log("   Status:  http://localhost:" + PORT + "/api/message-status?messageId=...");
  console.log("   (No Twilio required. Device-SMS / phone fallbacks work by default.)");
});
