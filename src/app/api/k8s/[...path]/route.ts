import { NextRequest, NextResponse } from "next/server";
import https from "https";
import http from "http";
import { getKubeConfig, getHttpsAgent } from "@/lib/k8s/server";

// Access control is delegated to Kubernetes RBAC — the proxy forwards
// requests with the configured token, and K8s API returns 403 if the
// identity lacks permissions. No client-side allowlist needed.

const MAX_BODY_SIZE = 1_048_576; // 1 MB
const REQUEST_TIMEOUT = 30_000;  // 30 seconds

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyToK8s(request, await params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyToK8s(request, await params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyToK8s(request, await params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyToK8s(request, await params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyToK8s(request, await params);
}

async function proxyToK8s(
  request: NextRequest,
  { path }: { path: string[] }
) {
  const k8sPath = "/" + path.join("/");
  const config = getKubeConfig();
  const agent = getHttpsAgent();

  const searchParams = request.nextUrl.searchParams.toString();
  const fullPath = searchParams ? `${k8sPath}?${searchParams}` : k8sPath;
  const url = new URL(fullPath, config.server);

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (config.token) {
    headers["Authorization"] = `Bearer ${config.token}`;
  }

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  // Request body with size limit
  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.text();
    if (body.length > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: "Request body too large", maxSize: MAX_BODY_SIZE },
        { status: 413 }
      );
    }
  }

  try {
    const response = await makeRequest(url, {
      method: request.method,
      headers,
      body,
      agent,
      timeout: REQUEST_TIMEOUT,
    });

    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.contentType || "application/json",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("timeout") ? 504 : 502;
    return NextResponse.json(
      { error: "Failed to connect to Kubernetes API", details: message },
      { status }
    );
  }
}

function makeRequest(
  url: URL,
  options: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    agent: https.Agent;
    timeout: number;
  }
): Promise<{ status: number; body: string; contentType: string | null }> {
  return new Promise((resolve, reject) => {
    const reqModule = url.protocol === "https:" ? https : http;

    const req = reqModule.request(
      url,
      {
        method: options.method,
        headers: options.headers,
        agent: url.protocol === "https:" ? options.agent : undefined,
        timeout: options.timeout,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 500,
            body: Buffer.concat(chunks).toString("utf-8"),
            contentType: res.headers["content-type"] || null,
          });
        });
      }
    );

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    req.on("error", reject);

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}
