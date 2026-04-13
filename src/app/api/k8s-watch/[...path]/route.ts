import { NextRequest } from "next/server";
import https from "https";
import http from "http";
import { getKubeConfig, getHttpsAgent, resolveToken } from "@/lib/k8s/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const k8sPath = "/" + path.join("/");

  const config = getKubeConfig();
  const agent = getHttpsAgent();

  const searchParams = new URLSearchParams(request.nextUrl.searchParams);
  searchParams.set("watch", "true");
  const fullPath = `${k8sPath}?${searchParams.toString()}`;
  const url = new URL(fullPath, config.server);

  const token = resolveToken(request);
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const reqModule = url.protocol === "https:" ? https : http;
      let closed = false;

      function send(text: string) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          closed = true;
        }
      }

      function close() {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }

      const k8sReq = reqModule.request(
        url,
        {
          method: "GET",
          headers,
          agent: url.protocol === "https:" ? agent : undefined,
        },
        (res) => {
          if (res.statusCode !== 200) {
            send(`event: error\ndata: ${JSON.stringify({ status: res.statusCode })}\n\n`);
            close();
            return;
          }

          let buffer = "";

          res.on("data", (chunk: Buffer) => {
            buffer += chunk.toString("utf-8");

            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.trim()) continue;
              send(`data: ${line}\n\n`);
            }
          });

          res.on("end", () => {
            if (buffer.trim()) {
              send(`data: ${buffer}\n\n`);
            }
            send("event: done\ndata: {}\n\n");
            close();
          });

          res.on("error", () => {
            send(`event: error\ndata: ${JSON.stringify({ error: "stream error" })}\n\n`);
            close();
          });
        }
      );

      k8sReq.on("error", () => {
        send(`event: error\ndata: ${JSON.stringify({ error: "connection failed" })}\n\n`);
        close();
      });

      request.signal.addEventListener("abort", () => {
        closed = true;
        k8sReq.destroy();
      });

      k8sReq.end();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
