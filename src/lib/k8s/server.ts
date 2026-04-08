import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import https from "https";
import { parse as parseYaml } from "./yaml";

export interface KubeConfig {
  server: string;
  token: string | null;
  ca: string | null;
  clientCert: string | null;
  clientKey: string | null;
  skipTLSVerify: boolean;
}

let cachedConfig: KubeConfig | null = null;
let cachedAgent: https.Agent | null = null;

export function getKubeConfig(): KubeConfig {
  if (cachedConfig) return cachedConfig;

  // 1. Explicit env vars take priority
  if (process.env.KUBE_API_URL) {
    cachedConfig = {
      server: process.env.KUBE_API_URL,
      token: process.env.KUBE_TOKEN || readInClusterToken(),
      ca: null,
      clientCert: null,
      clientKey: null,
      skipTLSVerify: process.env.KUBE_SKIP_TLS_VERIFY === "true",
    };
    return cachedConfig;
  }

  // 2. In-cluster config (running inside a pod)
  const inClusterToken = readInClusterToken();
  if (inClusterToken) {
    const caPath = "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt";
    cachedConfig = {
      server: "https://kubernetes.default.svc",
      token: inClusterToken,
      ca: existsSync(caPath) ? readFileSync(caPath, "utf-8") : null,
      clientCert: null,
      clientKey: null,
      skipTLSVerify: false,
    };
    return cachedConfig;
  }

  // 3. Local kubeconfig file
  const kubeconfigPath =
    process.env.KUBECONFIG || join(homedir(), ".kube", "config");

  if (!existsSync(kubeconfigPath)) {
    throw new Error(
      `No Kubernetes configuration found. Set KUBE_API_URL env var or ensure ~/.kube/config exists.`
    );
  }

  const raw = readFileSync(kubeconfigPath, "utf-8");
  const kubeconfig = parseYaml(raw);

  const currentContext = kubeconfig["current-context"];
  const context = kubeconfig.contexts?.find(
    (c: { name: string }) => c.name === currentContext
  );
  if (!context) {
    throw new Error(`Context "${currentContext}" not found in kubeconfig`);
  }

  const clusterName = context.context.cluster;
  const userName = context.context.user;

  const cluster = kubeconfig.clusters?.find(
    (c: { name: string }) => c.name === clusterName
  );
  if (!cluster) {
    throw new Error(`Cluster "${clusterName}" not found in kubeconfig`);
  }

  const user = kubeconfig.users?.find(
    (u: { name: string }) => u.name === userName
  );

  // Token auth
  let token: string | null = null;
  if (user?.user?.token) {
    token = user.user.token;
  } else if (user?.user?.["token-file"]) {
    token = readFileSync(user.user["token-file"], "utf-8").trim();
  }

  // CA certificate
  let ca: string | null = null;
  if (cluster.cluster["certificate-authority-data"]) {
    ca = Buffer.from(
      cluster.cluster["certificate-authority-data"],
      "base64"
    ).toString("utf-8");
  } else if (cluster.cluster["certificate-authority"]) {
    ca = readFileSync(cluster.cluster["certificate-authority"], "utf-8");
  }

  // Client certificate auth
  let clientCert: string | null = null;
  let clientKey: string | null = null;
  if (user?.user?.["client-certificate-data"]) {
    clientCert = Buffer.from(
      user.user["client-certificate-data"],
      "base64"
    ).toString("utf-8");
  } else if (user?.user?.["client-certificate"]) {
    clientCert = readFileSync(user.user["client-certificate"], "utf-8");
  }
  if (user?.user?.["client-key-data"]) {
    clientKey = Buffer.from(
      user.user["client-key-data"],
      "base64"
    ).toString("utf-8");
  } else if (user?.user?.["client-key"]) {
    clientKey = readFileSync(user.user["client-key"], "utf-8");
  }

  cachedConfig = {
    server: cluster.cluster.server,
    token,
    ca,
    clientCert,
    clientKey,
    skipTLSVerify: cluster.cluster["insecure-skip-tls-verify"] === true,
  };

  return cachedConfig;
}

export function getHttpsAgent(): https.Agent {
  if (cachedAgent) return cachedAgent;

  const config = getKubeConfig();

  const agentOptions: https.AgentOptions = {
    rejectUnauthorized: !config.skipTLSVerify,
  };

  if (config.ca) {
    agentOptions.ca = config.ca;
  }
  if (config.clientCert) {
    agentOptions.cert = config.clientCert;
  }
  if (config.clientKey) {
    agentOptions.key = config.clientKey;
  }

  cachedAgent = new https.Agent(agentOptions);
  return cachedAgent;
}

function readInClusterToken(): string | null {
  const tokenPath = "/var/run/secrets/kubernetes.io/serviceaccount/token";
  try {
    if (existsSync(tokenPath)) {
      return readFileSync(tokenPath, "utf-8").trim();
    }
  } catch {
    // Not in cluster
  }
  return null;
}
