const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const APP_FILE = path.join(__dirname, "beforest-document-generator-branded.html");
const LOGIN_HERO_FILE = path.join(__dirname, "assets", "conservation-1.jpg");
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
    :root{color-scheme:light;--forest:#344736;--forest-dark:#26382a;--ink:#292724;--muted:#6f6b64;--line:#ddd9d1;--paper:#fbfaf6;--clay:#9a4b3e}
    body{margin:0;min-height:100vh;display:grid;place-items:center;padding:28px;background:#f2f0ea;color:var(--ink);font-family:Arial,Helvetica,sans-serif}
    main{width:min(1180px,100%);height:min(760px,calc(100vh - 56px));display:grid;grid-template-columns:minmax(390px,43%) 1fr;overflow:hidden;background:var(--paper);border:1px solid rgba(52,71,54,.1);border-radius:26px;box-shadow:0 28px 80px rgba(41,39,36,.12)}
    .login-panel{display:flex;align-items:center;padding:44px clamp(42px,6vw,84px);background:var(--paper)}
    .login-content{width:100%;max-width:390px;margin:auto}
    .brand{display:block;width:min(255px,78%);height:auto;margin:0 0 46px}
    .eyebrow{margin:0 0 16px;color:var(--clay);font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase}
    h1{max-width:360px;margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:clamp(36px,3.4vw,52px);font-weight:400;line-height:1.04;letter-spacing:-.035em;color:var(--ink)}
    .intro{max-width:340px;margin:0 0 38px;color:var(--muted);font-size:15px;line-height:1.7}
    label{display:block;margin-bottom:9px;color:#514e48;font-size:11px;font-weight:700;letter-spacing:.13em;text-transform:uppercase}
    .password-wrap{position:relative}
    input{width:100%;height:58px;border:1px solid var(--line);border-radius:12px;padding:0 76px 0 17px;background:#fff;color:var(--ink);font-size:17px;outline:none;transition:border-color .2s,box-shadow .2s}
    input:focus{border-color:#718274;box-shadow:0 0 0 4px rgba(52,71,54,.1)}
    .toggle{position:absolute;top:50%;right:10px;width:auto;margin:0;transform:translateY(-50%);border:0;border-radius:8px;padding:9px 10px;background:transparent;color:var(--forest);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
    .toggle:hover{background:#f0f2ed}
    .submit{width:100%;height:56px;margin-top:18px;border:0;border-radius:12px;background:var(--forest);color:#fff;font-size:12px;font-weight:700;letter-spacing:.17em;text-transform:uppercase;cursor:pointer;transition:background .2s,transform .2s,box-shadow .2s}
    .submit:hover{background:var(--forest-dark);box-shadow:0 12px 24px rgba(52,71,54,.18);transform:translateY(-1px)}
    .submit:active{transform:translateY(0)}
    .error{margin:0 0 18px;border:1px solid rgba(154,75,62,.25);border-radius:10px;padding:11px 13px;background:rgba(154,75,62,.08);color:#813c32;font-size:13px;line-height:1.4}
    .hero{position:relative;height:100%;overflow:hidden;background:#203627}
    .hero img{display:block;width:100%;height:100%;object-fit:cover;object-position:center}
    @media(max-height:700px) and (min-width:781px){
      body{padding:18px}
      main{height:calc(100vh - 36px)}
      .login-panel{padding:24px clamp(34px,5vw,68px)}
      .brand{width:min(210px,70%);margin-bottom:24px}
      .eyebrow{margin-bottom:10px;font-size:10px}
      h1{margin-bottom:12px;font-size:clamp(34px,3vw,42px);line-height:1}
      .intro{margin-bottom:18px;font-size:13px;line-height:1.5}
      label{margin-bottom:7px;font-size:10px}
      input{height:48px;font-size:15px}
      .submit{height:48px;margin-top:12px}
      .error{margin-bottom:10px;padding:8px 11px}
    }
    @media(max-width:780px){
      body{padding:0;background:var(--paper)}
      main{display:block;width:100%;height:auto;min-height:100vh;border:0;border-radius:0;box-shadow:none}
      .login-panel{min-height:100vh;padding:42px 26px}
      .login-content{max-width:430px}
      .brand{width:220px;margin-bottom:72px}
      h1{font-size:42px}
      .hero{display:none}
    }
    @media(max-width:420px){.brand{margin-bottom:58px}h1{font-size:36px}.intro{margin-bottom:32px}}
  </style>
</head>
<body>
  <main>
    <section class="login-panel">
      <div class="login-content">
        <img class="brand" src="https://i.ibb.co/Xr9S2Tk4/23-Beforest-Black-with-Tagline.png" alt="Beforest — Nature at Work">
        <p class="eyebrow">Secure workspace</p>
        <h1>Finance Document Generator</h1>
        <p class="intro">Enter the application password to create and manage finance documents.</p>
        ${error ? `<div class="error" role="alert">${error}</div>` : ""}
        <form method="post" action="/login">
          <label for="password">Password</label>
          <div class="password-wrap">
            <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
            <button class="toggle" type="button" aria-controls="password" aria-label="Show password">Show</button>
          </div>
          <button class="submit" type="submit">Log in</button>
        </form>
      </div>
    </section>
    <section class="hero" aria-label="Beforest nature estate">
      <img src="/assets/conservation-1.jpg" alt="Lush green Beforest conservation landscape">
    </section>
  </main>
  <script>
    const password = document.getElementById('password');
    const toggle = document.querySelector('.toggle');
    toggle.addEventListener('click', () => {
      const reveal = password.type === 'password';
      password.type = reveal ? 'text' : 'password';
      toggle.textContent = reveal ? 'Hide' : 'Show';
      toggle.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
      password.focus();
    });
  </script>
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

    if (requestUrl.pathname === "/assets/conservation-1.jpg" && req.method === "GET") {
      serveFile(res, LOGIN_HERO_FILE);
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
