import { NextRequest } from "next/server";
import https from "https";
import http from "http";
import type { IncomingMessage } from "http";
import { getKubeConfig, getHttpsAgent, resolveToken } from "@/lib/k8s/server";

export const dynamic = "force-dynamic";

const TAIL_LINES_DEFAULT = 500;
const TAIL_LINES_MAX = 5000;

function parseTailLines(raw: string | null): number {
  if (!raw) return TAIL_LINES_DEFAULT;
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 0) return TAIL_LINES_DEFAULT;
  return Math.min(n, TAIL_LINES_MAX);
}

const VALID_NAME = /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/;

function isValidK8sName(name: string): boolean {
  return name.length > 0 && name.length <= 253 && VALID_NAME.test(name);
}

/**
 * Open a raw HTTP request to the K8s pod log endpoint.
 * Resolves with the IncomingMessage once headers arrive so the
 * caller can inspect the status code before committing to a
 * streaming or error Response.
 */
function openK8sLogStream(
  url: URL,
  headers: Record<string, string>,
  agent: https.Agent | undefined,
  signal: AbortSignal
): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const reqModule = url.protocol === "https:" ? https : http;

    const k8sReq = reqModule.request(
      url,
      {
        method: "GET",
        headers,
        agent: url.protocol === "https:" ? agent : undefined,
      },
      (res) => resolve(res)
    );

    k8sReq.on("error", reject);
    signal.addEventListener("abort", () => k8sReq.destroy());
    k8sReq.end();
  });
}

function drainBody(res: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    res.on("data", (chunk: Buffer) => {
      body += chunk.toString("utf-8");
    });
    res.on("end", () => resolve(body));
    res.on("error", () => resolve(body));
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const namespace = searchParams.get("namespace") ?? "";
  const pod = searchParams.get("pod") ?? "";
  const container = searchParams.get("container") ?? "";
  const follow = searchParams.get("follow") !== "false";
  const tailLines = parseTailLines(searchParams.get("tailLines"));

  if (!namespace || !pod) {
    return Response.json(
      { error: "namespace and pod parameters required" },
      { status: 400 }
    );
  }

  if (!isValidK8sName(namespace) || !isValidK8sName(pod)) {
    return Response.json(
      { error: "invalid namespace or pod name" },
      { status: 400 }
    );
  }

  if (container && !isValidK8sName(container)) {
    return Response.json(
      { error: "invalid container name" },
      { status: 400 }
    );
  }

  const config = getKubeConfig();
  const agent = getHttpsAgent();
  const token = resolveToken(request);

  const params = new URLSearchParams();
  if (follow) params.set("follow", "true");
  params.set("tailLines", String(tailLines));
  if (container) params.set("container", container);

  const k8sPath = `/api/v1/namespaces/${namespace}/pods/${pod}/log?${params.toString()}`;
  const url = new URL(k8sPath, config.server);

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let k8sRes: IncomingMessage;
  try {
    k8sRes = await openK8sLogStream(url, headers, agent, request.signal);
  } catch {
    return Response.json(
      { error: "failed to connect to Kubernetes API" },
      { status: 502 }
    );
  }

  // Non-200: drain the error body and return a proper HTTP error
  if (k8sRes.statusCode !== 200) {
    const body = await drainBody(k8sRes);
    return new Response(body, {
      status: k8sRes.statusCode ?? 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 200: pipe the stream through
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      function close() {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }

      k8sRes.on("data", (chunk: Buffer) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          closed = true;
        }
      });

      k8sRes.on("end", close);
      k8sRes.on("error", close);

      request.signal.addEventListener("abort", () => {
        closed = true;
        k8sRes.destroy();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
