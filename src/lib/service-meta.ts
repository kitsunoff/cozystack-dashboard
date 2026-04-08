// Color dots for sidebar items — deterministic by service name
const SERVICE_COLORS: Record<string, string> = {
  Redis: "#DC2626",
  PostgreSQL: "#336791",
  MongoDB: "#4DB33D",
  MariaDB: "#C0765A",
  ClickHouse: "#FFCC00",
  FoundationDB: "#6236FF",
  Qdrant: "#DC2890",
  Kafka: "#231F20",
  NATS: "#27AAE1",
  RabbitMQ: "#FF6600",
  Bucket: "#E67E22",
  "VM Instance": "#8B5CF6",
  "VM Disk": "#6366F1",
  Kubernetes: "#326CE5",
  "HTTP Cache": "#06B6D4",
  "TCP Balancer": "#0EA5E9",
  VPC: "#10B981",
  VPN: "#14B8A6",
  OpenBAO: "#FFEC6E",
};

export function getServiceColor(name: string): string {
  return SERVICE_COLORS[name] ?? "#6B7280";
}

// Group display names and order
const GROUP_ORDER = [
  "database",
  "cache",
  "messaging",
  "compute",
  "storage",
  "network",
  "secrets",
  "ai",
];

const GROUP_LABELS: Record<string, string> = {
  database: "Databases",
  cache: "Cache",
  messaging: "Messaging",
  compute: "Compute",
  storage: "Storage",
  network: "Network",
  secrets: "Secrets",
  ai: "AI / ML",
  other: "Other",
};

export function getGroupLabel(tag: string): string {
  return GROUP_LABELS[tag] ?? tag.charAt(0).toUpperCase() + tag.slice(1);
}

export function getGroupOrder(): string[] {
  return GROUP_ORDER;
}
