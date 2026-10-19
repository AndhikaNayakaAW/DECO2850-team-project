// The watch's only door to the laptop: forwards /api/watch to the Offshift server on :3000 and
// refuses everything else, so a public https tunnel pointed here exposes nothing but the watch route.
//
//   npm run dev                                          (the server, :3000)
//   npm run watch-gateway                                (this, :3001)
//   cloudflared tunnel --url http://127.0.0.1:3001       (prints the https address for the watch)
import http from "node:http";

const PORT = Number(process.env.WATCH_GATEWAY_PORT ?? 3001);
const SERVER = { host: "127.0.0.1", port: Number(process.env.OFFSHIFT_PORT ?? 3000) };

http
  .createServer((req, res) => {
    const path = (req.url || "").split("?")[0];
    // /api/watch, or /w/<access code>/api/watch when the server has an access code.
    if (!/^\/(w\/[^/]+\/)?api\/watch$/.test(path)) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Not here");
      return;
    }
    const upstream = http.request(
      { ...SERVER, path: req.url, method: req.method, headers: { ...req.headers, host: `localhost:${SERVER.port}` } },
      (r) => {
        res.writeHead(r.statusCode || 502, r.headers);
        r.pipe(res);
      },
    );
    upstream.on("error", () => {
      res.writeHead(502, { "content-type": "text/plain" });
      res.end("Offshift server is not running");
    });
    req.pipe(upstream);
    console.log(new Date().toTimeString().slice(0, 8), req.method, req.url);
  })
  .listen(PORT, "127.0.0.1", () => console.log(`watch gateway on 127.0.0.1:${PORT}`));
