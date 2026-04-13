import { NextRequest } from "next/server";
import https from "https";
import http from "http";
import { getKubeConfig, getHttpsAgent } from "@/lib/k8s/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const config = getKubeConfig();
  const agent = getHttpsAgent();

  const k8sPath = "/" + path.join("/");
  const searchParams = new URLSearchParams(request.nextUrl.searchParams);
  searchParams.set("watch", "true");
  const fullPath = `${k8sPath}?${searchParams.toString()}`;
  const url = new URL(fullPath, config.server);

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (config.token) {
    headers["Authorization"] = `Bearer ${config.token}`;
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const reqModule = url.protocol === "https:" ? https : http;

      const k8sReq = reqModule.request(
        url,
        {
          method: "GET",
          headers,
          agent: url.protocol === "https:" ? agent : undefined,
        },
        (res) => {
          if (res.statusCode !== 200) {
            controller.enqueue(
              encoder.encode(`event: error\ndata: ${JSON.stringify({ status: res.statusCode })}\n\n`)
            );
            controller.close();
            return;
          }

          let buffer = "";

          res.on("data", (chunk: Buffer) => {
            buffer += chunk.toString("utf-8");

            // K8s watch sends newline-delimited JSON
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.trim()) continue;
              // Convert to SSE format
              controller.enqueue(
                encoder.encode(`data: ${line}\n\n`)
              );
            }
          });

          res.on("end", () => {
            if (buffer.trim()) {
              controller.enqueue(
                encoder.encode(`data: ${buffer}\n\n`)
              );
            }
            controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"));
            controller.close();
          });

          res.on("error", () => {
            controller.enqueue(
              encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "stream error" })}\n\n`)
            );
            controller.close();
          });
        }
      );

      k8sReq.on("error", () => {
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "connection failed" })}\n\n`)
        );
        controller.close();
      });

      // Close K8s connection when client disconnects
      request.signal.addEventListener("abort", () => {
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
