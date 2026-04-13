import { NextRequest, NextResponse } from "next/server";
import https from "https";
import http from "http";
import { getKubeConfig, getHttpsAgent } from "@/lib/k8s/server";

interface BatchRequest {
  paths: string[];
}

interface BatchResultItem {
  path: string;
  status: number;
  body: unknown;
}

export async function POST(request: NextRequest) {
  const { paths } = (await request.json()) as BatchRequest;

  if (!Array.isArray(paths) || paths.length === 0) {
    return NextResponse.json({ error: "paths must be a non-empty array" }, { status: 400 });
  }

  if (paths.length > 50) {
    return NextResponse.json({ error: "max 50 paths per batch" }, { status: 400 });
  }

  const config = getKubeConfig();
  const agent = getHttpsAgent();

  const headers: Record<string, string> = { Accept: "application/json" };
  if (config.token) {
    headers["Authorization"] = `Bearer ${config.token}`;
  }

  const results: BatchResultItem[] = await Promise.all(
    paths.map(async (path) => {
      try {
        const url = new URL(path, config.server);
        const response = await makeRequest(url, { method: "GET", headers, agent });
        return {
          path,
          status: response.status,
          body: JSON.parse(response.body),
        };
      } catch {
        return { path, status: 502, body: { error: "Failed to fetch" } };
      }
    })
  );

  return NextResponse.json({ results });
}

function makeRequest(
  url: URL,
  options: {
    method: string;
    headers: Record<string, string>;
    agent: https.Agent;
  }
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const reqModule = url.protocol === "https:" ? https : http;
    const req = reqModule.request(
      url,
      {
        method: options.method,
        headers: options.headers,
        agent: url.protocol === "https:" ? options.agent : undefined,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 500,
            body: Buffer.concat(chunks).toString("utf-8"),
          });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}
