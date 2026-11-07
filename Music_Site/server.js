const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DATA_FILE = path.join(ROOT_DIR, "data", "site.json");
const AUTH_FILE = path.join(ROOT_DIR, "data", "auth.json");
const DEFAULT_JS_FILE = path.join(ROOT_DIR, "js", "default-data.js");
const UPLOADS_DIR = path.join(ROOT_DIR, "assets", "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function hashPassword(password, salt = "1arutyun_salt_v2") {
  return crypto.createHmac("sha256", salt).update(String(password)).digest("hex");
}

// Initialize auth.json if not present (Default: admin / 1arutyun2026)
if (!fs.existsSync(AUTH_FILE)) {
  const defaultAuth = {
    username: "admin",
    passwordHash: hashPassword("1arutyun2026"),
    secret: crypto.randomBytes(32).toString("hex")
  };
  fs.writeFileSync(AUTH_FILE, JSON.stringify(defaultAuth, null, 2), "utf8");
}

function getAuthConfig() {
  try {
    return JSON.parse(fs.readFileSync(AUTH_FILE, "utf8"));
  } catch (e) {
    return {
      username: "admin",
      passwordHash: hashPassword("1arutyun2026"),
      secret: "fallback_secret_key"
    };
  }
}

function createAuthToken(username) {
  const cfg = getAuthConfig();
  const payload = `${username}.${Date.now()}`;
  const sig = crypto.createHmac("sha256", cfg.secret).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

function verifyAuthToken(req) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token || !token.includes(".")) return false;
  const [b64, sig] = token.split(".");
  try {
    const cfg = getAuthConfig();
    const payload = Buffer.from(b64, "base64url").toString("utf8");
    const expectedSig = crypto.createHmac("sha256", cfg.secret).update(payload).digest("hex");
    return sig === expectedSig;
  } catch (e) {
    return false;
  }
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".mov": "video/quicktime",
  ".m4v": "video/mp4"
};

function syncDefaultJsFile(siteData) {
  try {
    const content = `// Auto-generated fallback data synced with data/site.json\nwindow.DEFAULT_SITE_DATA = ${JSON.stringify(siteData, null, 2)};\n`;
    fs.writeFileSync(DEFAULT_JS_FILE, content, "utf8");
  } catch (err) {
    console.error("Failed to sync default-data.js:", err);
  }
}

if (fs.existsSync(DATA_FILE)) {
  try {
    const initialData = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    syncDefaultJsFile(initialData);
  } catch (e) {
    console.error("Error reading initial data/site.json:", e);
  }
}

function sendJson(res, statusCode, payload) {
  const data = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(data);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function serveStaticFile(req, res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    const range = req.headers.range;
    if (range && [".mp4", ".webm", ".mov", ".ogg", ".m4v"].includes(ext)) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;

      if (start >= stats.size || end >= stats.size) {
        res.writeHead(416, { "Content-Range": `bytes */${stats.size}` });
        res.end();
        return;
      }

      const chunkSize = end - start + 1;
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stats.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": contentType
      });

      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stats.size,
      "Accept-Ranges": "bytes",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });

    fs.createReadStream(filePath).pipe(res);
  });
}

function serveHtmlNoCache(res, htmlFileName) {
  const ver = Date.now();
  const html = fs
    .readFileSync(path.join(ROOT_DIR, htmlFileName), "utf8")
    .replace("<head>", '<head>\n  <base href="/">')
    .replace(/href="css\/style\.css(?:\?[^"]*)?"/g, `href="css/style.css?v=${ver}"`)
    .replace(/src="js\/(default-data|translations|app|admin)\.js(?:\?[^"]*)?"/g, `src="js/$1.js?v=${ver}"`);

  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  });
  return res.end(html);
}

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = decodeURIComponent(parsedUrl.pathname);

    // --- AUTH API ROUTES ---
    if (pathname === "/api/auth/login" && req.method === "POST") {
      const { username, password } = await readJsonBody(req);
      const cfg = getAuthConfig();
      const inputHash = hashPassword(password || "");
      if (
        String(username || "").trim().toLowerCase() === String(cfg.username).toLowerCase() &&
        inputHash === cfg.passwordHash
      ) {
        const token = createAuthToken(cfg.username);
        return sendJson(res, 200, { ok: true, token, username: cfg.username });
      }
      return sendJson(res, 401, { ok: false, error: "Неверный логин или пароль" });
    }

    if (pathname === "/api/auth/verify" && req.method === "GET") {
      if (verifyAuthToken(req)) {
        const cfg = getAuthConfig();
        return sendJson(res, 200, { ok: true, username: cfg.username });
      }
      return sendJson(res, 401, { ok: false });
    }

    if (pathname === "/api/auth/change-credentials" && req.method === "POST") {
      if (!verifyAuthToken(req)) {
        return sendJson(res, 401, { ok: false, error: "Unauthorized" });
      }
      const { newUsername, newPassword } = await readJsonBody(req);
      if (!newPassword || newPassword.length < 4) {
        return sendJson(res, 400, { ok: false, error: "Пароль должен содержать минимум 4 символа" });
      }
      const cfg = getAuthConfig();
      cfg.username = (newUsername || cfg.username || "admin").trim();
      cfg.passwordHash = hashPassword(newPassword);
      cfg.secret = crypto.randomBytes(32).toString("hex");
      fs.writeFileSync(AUTH_FILE, JSON.stringify(cfg, null, 2), "utf8");
      const newToken = createAuthToken(cfg.username);
      return sendJson(res, 200, { ok: true, token: newToken, username: cfg.username });
    }

    // --- SITE DATA & MEDIA ROUTES ---
    if (pathname === "/api/site" && req.method === "GET") {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      return sendJson(res, 200, JSON.parse(raw));
    }

    if (pathname === "/api/site" && req.method === "POST") {
      if (!verifyAuthToken(req)) {
        return sendJson(res, 401, { ok: false, error: "Требуется авторизация администратора" });
      }
      const newSiteData = await readJsonBody(req);
      fs.writeFileSync(DATA_FILE, JSON.stringify(newSiteData, null, 2), "utf8");
      syncDefaultJsFile(newSiteData);
      return sendJson(res, 200, { ok: true, message: "Site data saved successfully" });
    }

    if (pathname === "/api/reaction" && req.method === "POST") {
      const { postId } = await readJsonBody(req);
      const siteData = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      const post = (siteData.posts || []).find((p) => p.id === postId);
      if (post) {
        post.reactions = (post.reactions || 0) + 1;
        fs.writeFileSync(DATA_FILE, JSON.stringify(siteData, null, 2), "utf8");
        syncDefaultJsFile(siteData);
        return sendJson(res, 200, { ok: true, reactions: post.reactions });
      }
      return sendJson(res, 404, { ok: false, error: "Post not found" });
    }

    if (pathname === "/api/upload" && req.method === "POST") {
      if (!verifyAuthToken(req)) {
        return sendJson(res, 401, { ok: false, error: "Требуется авторизация администратора" });
      }
      const rawName = req.headers["x-file-name"]
        ? decodeURIComponent(req.headers["x-file-name"])
        : `file-${Date.now()}`;
      const ext = path.extname(rawName).toLowerCase() || ".bin";
      const base = path
        .basename(rawName, ext)
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 40);
      const finalName = `${Date.now()}-${base}${ext}`;
      const destPath = path.join(UPLOADS_DIR, finalName);

      const writeStream = fs.createWriteStream(destPath);
      req.pipe(writeStream);

      writeStream.on("finish", () => {
        const publicUrl = `/assets/uploads/${finalName}`;
        const isVideo = [".mp4", ".webm", ".mov", ".ogg", ".m4v"].includes(ext);
        sendJson(res, 200, {
          ok: true,
          url: publicUrl,
          name: finalName,
          mediaType: isVideo ? "video" : "image"
        });
      });

      writeStream.on("error", (err) => {
        console.error("Upload error:", err);
        sendJson(res, 500, { ok: false, error: "Upload failed" });
      });
      return;
    }

    if (pathname === "/api/media" && req.method === "GET") {
      const files = [];
      if (fs.existsSync(UPLOADS_DIR)) {
        for (const f of fs.readdirSync(UPLOADS_DIR)) {
          const full = path.join(UPLOADS_DIR, f);
          const stat = fs.statSync(full);
          if (stat.isFile()) {
            const ext = path.extname(f).toLowerCase();
            const isVideo = [".mp4", ".webm", ".mov", ".ogg", ".m4v"].includes(ext);
            files.push({
              name: f,
              url: `/assets/uploads/${f}`,
              size: stat.size,
              mtime: stat.mtimeMs,
              type: isVideo ? "video" : "image",
              deletable: true
            });
          }
        }
      }
      const assetsDir = path.join(ROOT_DIR, "assets");
      if (fs.existsSync(assetsDir)) {
        for (const f of fs.readdirSync(assetsDir)) {
          const full = path.join(assetsDir, f);
          const stat = fs.statSync(full);
          if (stat.isFile() && /\.(jpg|jpeg|png|webp|gif|svg|mp4|webm|mov)$/i.test(f)) {
            const ext = path.extname(f).toLowerCase();
            const isVideo = [".mp4", ".webm", ".mov", ".ogg", ".m4v"].includes(ext);
            files.push({
              name: f,
              url: `/assets/${f}`,
              size: stat.size,
              mtime: stat.mtimeMs,
              type: isVideo ? "video" : "image",
              deletable: false
            });
          }
        }
      }
      files.sort((a, b) => b.mtime - a.mtime);
      return sendJson(res, 200, { files });
    }

    if (pathname === "/api/media" && req.method === "DELETE") {
      if (!verifyAuthToken(req)) {
        return sendJson(res, 401, { ok: false, error: "Требуется авторизация администратора" });
      }
      const { url } = await readJsonBody(req);
      if (!url || !url.startsWith("/assets/uploads/")) {
        return sendJson(res, 400, { ok: false, error: "Only uploaded files can be deleted" });
      }
      const filename = path.basename(url);
      const targetPath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
      return sendJson(res, 200, { ok: true });
    }

    // --- PAGE & STATIC ROUTES ---
    if (pathname === "/admin" || pathname === "/admin/" || pathname === "/admin.html") {
      return serveHtmlNoCache(res, "admin.html");
    }

    if (
      pathname === "/" ||
      pathname === "/index.html" ||
      pathname === "/releases" ||
      pathname.startsWith("/release/") ||
      pathname.startsWith("/page/") ||
      pathname === "/videos" ||
      pathname === "/thoughts"
    ) {
      return serveHtmlNoCache(res, "index.html");
    }

    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, "");
    const filePath = path.join(ROOT_DIR, safePath);
    if (filePath.startsWith(ROOT_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return serveStaticFile(req, res, filePath);
    }

    return serveHtmlNoCache(res, "index.html");
  } catch (err) {
    console.error("Server error:", err);
    sendJson(res, 500, { error: "Internal Server Error" });
  }
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`  1arutyun Official Site & Block Builder Running!`);
  console.log(`  Public Website: http://localhost:${PORT}`);
  console.log(`  Secret Admin:   http://localhost:${PORT}/admin`);
  console.log(`==================================================\n`);
});
