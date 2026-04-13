const API_PREFIX = "/api/k8s";

export class K8sError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "K8sError";
  }
}

async function k8sFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_PREFIX}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new K8sError(
        "Unauthorized — server credentials may have expired. Restart the dashboard or check your kubeconfig.",
        401
      );
    }
    const body = await response.json().catch(() => null);
    throw new K8sError(
      body?.message || `K8s API error: ${response.status}`,
      response.status,
      body
    );
  }

  return response.json();
}

export async function k8sList<T>(
  apiPath: string,
  params?: { labelSelector?: string; fieldSelector?: string }
): Promise<KubeList<T>> {
  const searchParams = new URLSearchParams();
  if (params?.labelSelector) {
    searchParams.set("labelSelector", params.labelSelector);
  }
  if (params?.fieldSelector) {
    searchParams.set("fieldSelector", params.fieldSelector);
  }
  const query = searchParams.toString();
  const url = query ? `${apiPath}?${query}` : apiPath;
  return k8sFetch<KubeList<T>>(url);
}

export async function k8sGet<T>(apiPath: string): Promise<T> {
  return k8sFetch<T>(apiPath);
}

export async function k8sCreate<T>(
  apiPath: string,
  body: unknown
): Promise<T> {
  return k8sFetch<T>(apiPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function k8sPatch<T>(
  apiPath: string,
  body: unknown
): Promise<T> {
  return k8sFetch<T>(apiPath, {
    method: "PATCH",
    headers: { "Content-Type": "application/merge-patch+json" },
    body: JSON.stringify(body),
  });
}

export async function k8sDelete(apiPath: string): Promise<void> {
  await k8sFetch(apiPath, { method: "DELETE" });
}

// Batch multiple K8s API GET requests into one server call
export async function k8sBatch<T>(
  paths: string[]
): Promise<Map<string, KubeList<T>>> {
  const response = await fetch("/api/k8s-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths }),
  });

  if (!response.ok) {
    throw new K8sError("Batch request failed", response.status);
  }

  const { results } = await response.json() as {
    results: Array<{ path: string; status: number; body: KubeList<T> }>;
  };

  const map = new Map<string, KubeList<T>>();
  for (const r of results) {
    if (r.status >= 200 && r.status < 300) {
      map.set(r.path, r.body);
    }
  }
  return map;
}

export interface KubeList<T> {
  apiVersion: string;
  kind: string;
  metadata: {
    resourceVersion?: string;
  };
  items: T[];
}
