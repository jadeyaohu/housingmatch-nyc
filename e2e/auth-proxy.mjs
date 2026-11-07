// Test-only stand-in for a cookie-protected deployment (e.g. Vercel Authentication on Previews).
// Every request must carry the session cookie, otherwise 401 — pages and /api/events alike.
// Forwards everything else to the local `next start` server. Never logs headers or bodies.
import http from "node:http";

const PORT = Number(process.env.E2E_AUTH_PORT ?? 3211);
const TARGET = Number(process.env.E2E_PORT ?? 3210);
const COOKIE = "_vercel_jwt=e2e-test-token";

http
  .createServer((req, res) => {
    const cookies = (req.headers.cookie ?? "").split(/;\s*/);
    if (!cookies.includes(COOKIE)) {
      res.writeHead(401, { "content-type": "application/json", "cache-control": "no-store" });
      res.end('{"error":"authentication_required"}');
      return;
    }
    const upstream = http.request(
      { host: "127.0.0.1", port: TARGET, method: req.method, path: req.url, headers: { ...req.headers, host: `localhost:${PORT}` } },
      (up) => {
        res.writeHead(up.statusCode ?? 502, up.headers);
        up.pipe(res);
      },
    );
    upstream.on("error", () => {
      res.writeHead(502);
      res.end();
    });
    req.pipe(upstream);
  })
  .listen(PORT, () => console.log(`auth proxy :${PORT} -> :${TARGET}`));
