const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const APP_FILE = path.join(__dirname, "beforest-document-generator-branded.html");

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

function send(res, statusCode, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": statusCode === 200 ? "public, max-age=300" : "no-store"
  });
  res.end(body);
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

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (requestUrl.pathname === "/healthz") {
    send(res, 200, JSON.stringify({ ok: true }), "application/json; charset=utf-8");
    return;
  }

  if (requestUrl.pathname === "/" || requestUrl.pathname === "/index.html") {
    serveFile(res, APP_FILE);
    return;
  }

  if (requestUrl.pathname === "/beforest-document-generator-branded.html") {
    res.writeHead(308, { Location: "/" });
    res.end();
    return;
  }

  send(res, 404, "Not found");
});

server.listen(PORT, HOST, () => {
  console.log(`Beforest Document Generator running at http://${HOST}:${PORT}`);
});
