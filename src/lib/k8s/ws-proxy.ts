import type { IncomingMessage } from "http";
import type { Duplex } from "stream";
import { WebSocketServer, WebSocket } from "ws";
import { getKubeConfig, getHttpsAgent, resolveToken } from "./server";

/**
 * Extract the K8s API path from an incoming WebSocket upgrade request.
 * Strips the `/api/k8s-ws/` prefix and returns the raw API path.
 * Returns null if the path is invalid.
 */
export function parseWsPath(url: string): string | null {
  const prefix = "/api/k8s-ws/";

  // Block path traversal on the raw string before URL normalization
  if (url.includes("/..") || url.includes("/./")) {
    return null;
  }

  let pathname: string;
  try {
    pathname = new URL(url, "http://localhost").pathname;
  } catch {
    return null;
  }
  if (!pathname.startsWith(prefix)) return null;

  return "/" + pathname.slice(prefix.length);
}

/**
 * Build the upstream WebSocket URL for the K8s API server.
 */
export function buildUpstreamUrl(apiPath: string): string {
  const config = getKubeConfig();
  const base = config.server.replace(/\/$/, "");
  const wsBase = base.replace(/^http/, "ws");
  return `${wsBase}${apiPath}`;
}

/**
 * Adapt IncomingMessage headers to the interface resolveToken expects.
 */
function adaptHeaders(req: IncomingMessage): { headers: { get(name: string): string | null } } {
  return {
    headers: {
      get(name: string): string | null {
        const val = req.headers[name.toLowerCase()];
        if (Array.isArray(val)) return val[0] ?? null;
        return val ?? null;
      },
    },
  };
}

/**
 * Build TLS options for the upstream WebSocket connection.
 */
function getTlsOptions(): Record<string, unknown> {
  const config = getKubeConfig();
  const agent = getHttpsAgent();
  const opts: Record<string, unknown> = { agent };

  if (config.skipTLSVerify) {
    opts.rejectUnauthorized = false;
  }

  return opts;
}

const wss = new WebSocketServer({ noServer: true });

/**
 * Handle an HTTP upgrade request by proxying the WebSocket connection
 * to the Kubernetes API server.
 */
export function handleWsUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
  const apiPath = parseWsPath(req.url || "");
  if (!apiPath) {
    socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
    socket.destroy();
    return;
  }

  const upstreamUrl = buildUpstreamUrl(apiPath);
  const token = resolveToken(adaptHeaders(req));
  const tlsOpts = getTlsOptions();

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const upstream = new WebSocket(upstreamUrl, {
    headers,
    ...tlsOpts,
  });

  upstream.on("error", (err) => {
    console.error("[ws-proxy] upstream error:", err.message);
    socket.write("HTTP/1.1 502 Bad Gateway\r\n\r\n");
    socket.destroy();
  });

  upstream.on("open", () => {
    wss.handleUpgrade(req, socket, head, (client) => {
      // Pipe upstream → client
      upstream.on("message", (data, isBinary) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data, { binary: isBinary });
        }
      });

      // Pipe client → upstream
      client.on("message", (data, isBinary) => {
        if (upstream.readyState === WebSocket.OPEN) {
          upstream.send(data, { binary: isBinary });
        }
      });

      // Cleanup
      upstream.on("close", () => client.close());
      client.on("close", () => upstream.close());

      client.on("error", () => upstream.close());
      upstream.on("error", () => client.close());
    });
  });
}
