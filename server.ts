import { createServer } from "http";
import next from "next";
import { handleWsUpgrade } from "./src/lib/k8s/ws-proxy";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => handle(req, res));

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = new URL(req.url || "", `http://${req.headers.host}`);
    if (pathname.startsWith("/api/k8s-ws/")) {
      handleWsUpgrade(req, socket, head);
    }
    // Other upgrade requests (e.g. HMR in dev) pass through to Next.js
  });

  server.listen(port, () => {
    console.log(
      `> Server listening at http://localhost:${port} as ${dev ? "development" : process.env.NODE_ENV}`
    );
  });
});
