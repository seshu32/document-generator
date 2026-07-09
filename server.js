const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const APP_FILE = path.join(__dirname, "beforest-document-generator-branded.html");
const APP_PASSWORD = process.env.APP_PASSWORD || "";
const SESSION_SECRET = process.env.SESSION_SECRET || APP_PASSWORD || crypto.randomBytes(32).toString("hex");
const SHEET_WEBAPP_URL = process.env.SHEET_WEBAPP_URL || "";
const SESSION_COOKIE = "beforest_doc_session";
const MAX_BODY_BYTES = 2 * 1024 * 1024;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

function send(res, statusCode, body, contentType = "text/plain; charset=utf-8", extraHeaders = {}) {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    ...extraHeaders
  });
  res.end(body);
}

function redirect(res, location) {
  res.writeHead(303, { Location: location, "Cache-Control": "no-store" });
  res.end();
}

function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index === -1 ? [part, ""] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function timingSafeEqual(a, b) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && crypto.timingSafeEqual(aBuffer, bBuffer);
}

function sessionValue() {
  return crypto.createHmac("sha256", SESSION_SECRET).update(APP_PASSWORD).digest("hex");
}

function isAuthenticated(req) {
  if (!APP_PASSWORD) return false;
  const token = parseCookies(req)[SESSION_COOKIE] || "";
  return timingSafeEqual(token, sessionValue());
}

function setSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(sessionValue())}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`
  );
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function loginPage(error = "") {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Beforest Document Generator - Login</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fdfbf7;color:#342e29;font-family:Arial,sans-serif}
    main{width:min(360px,calc(100vw - 32px));border:1px solid rgba(52,46,41,.18);background:#fff;padding:24px;border-radius:8px}
    h1{font-size:20px;margin:0 0 6px;font-weight:600}
    p{font-size:13px;line-height:1.5;color:#51514d;margin:0 0 18px}
    label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#86312b;margin-bottom:6px}
    input{width:100%;border:1px solid rgba(52,46,41,.2);border-radius:6px;padding:11px 12px;font-size:15px}
    button{width:100%;margin-top:14px;border:0;border-radius:4px;background:#344736;color:#fff;padding:11px 14px;font-size:13px;text-transform:uppercase;letter-spacing:.12em;cursor:pointer}
    .error{background:rgba(255,119,74,.1);border:1px solid rgba(134,49,43,.25);color:#86312b;padding:9px 10px;border-radius:6px;margin-bottom:14px;font-size:12px}
  </style>
</head>
<body>
  <main>
    <h1>Beforest Document Generator</h1>
    <p>Enter the app password to continue.</p>
    ${error ? `<div class="error">${error}</div>` : ""}
    <form method="post" action="/login">
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" autofocus>
      <button type="submit">Log in</button>
    </form>
  </main>
</body>
</html>`;
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      send(res, error.code === "ENOENT" ? 404 : 500, error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    send(res, 200, content, contentType);
  });
}

async function handleLogin(req, res) {
  const body = await readBody(req);
  const params = new URLSearchParams(body);
  const password = params.get("password") || "";

  if (APP_PASSWORD && timingSafeEqual(password, APP_PASSWORD)) {
    setSessionCookie(res);
    redirect(res, "/");
    return;
  }

  send(res, 401, loginPage("Incorrect password."), "text/html; charset=utf-8");
}

async function handleSheetSync(req, res) {
  if (!SHEET_WEBAPP_URL) {
    send(res, 503, JSON.stringify({ ok: false, error: "Sheets sync is not configured." }), "application/json; charset=utf-8");
    return;
  }

  const body = await readBody(req);
  const sheetResponse = await fetch(SHEET_WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body
  });

  if (!sheetResponse.ok) {
    send(res, 502, JSON.stringify({ ok: false, error: "Sheets sync failed." }), "application/json; charset=utf-8");
    return;
  }

  send(res, 200, JSON.stringify({ ok: true }), "application/json; charset=utf-8");
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (requestUrl.pathname === "/healthz") {
      send(res, 200, JSON.stringify({ ok: true }), "application/json; charset=utf-8");
      return;
    }

    if (!APP_PASSWORD) {
      send(res, 503, "APP_PASSWORD is not configured.");
      return;
    }

    if (requestUrl.pathname === "/login" && req.method === "GET") {
      if (isAuthenticated(req)) redirect(res, "/");
      else send(res, 200, loginPage(), "text/html; charset=utf-8");
      return;
    }

    if (requestUrl.pathname === "/login" && req.method === "POST") {
      await handleLogin(req, res);
      return;
    }

    if (!isAuthenticated(req)) {
      redirect(res, "/login");
      return;
    }

    if (requestUrl.pathname === "/api/sheet-sync" && req.method === "POST") {
      await handleSheetSync(req, res);
      return;
    }

    if (requestUrl.pathname === "/" || requestUrl.pathname === "/index.html") {
      serveFile(res, APP_FILE);
      return;
    }

    if (requestUrl.pathname === "/beforest-document-generator-branded.html") {
      redirect(res, "/");
      return;
    }

    send(res, 404, "Not found");
  } catch (error) {
    console.error(error);
    send(res, 500, "Server error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Beforest Document Generator running at http://${HOST}:${PORT}`);
});
