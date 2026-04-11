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

export async function k8sDelete(apiPath: string): Promise<void> {
  await k8sFetch(apiPath, { method: "DELETE" });
}

export interface KubeList<T> {
  apiVersion: string;
  kind: string;
  metadata: {
    resourceVersion?: string;
  };
  items: T[];
}
