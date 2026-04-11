// New sidebar group structure: IaaS, PaaS, NaaS, Backups
// Maps service name → new group key

const SERVICE_TO_GROUP: Record<string, string> = {
  // IaaS
  VPC: "iaas",
  Kubernetes: "iaas",
  "VM Instance": "iaas",
  "VM Disk": "iaas",
  Bucket: "iaas",

  // PaaS
  ClickHouse: "paas",
  FoundationDB: "paas",
  Kafka: "paas",
  MariaDB: "paas",
  "MongoDB Instance": "paas",
  NATS: "paas",
  OpenBAO: "paas",
  PostgreSQL: "paas",
  Qdrant: "paas",
  RabbitMQ: "paas",
  Redis: "paas",

  // NaaS
  "HTTP Cache": "naas",
  "TCP Balancer": "naas",
  VPN: "naas",

  // Backups
  Plan: "backups",
  BackupJob: "backups",
};

// Color accents used by marketplace app cards
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

export function getServiceGroup(name: string): string {
  return SERVICE_TO_GROUP[name] ?? "other";
}

const GROUP_ORDER = ["iaas", "paas", "naas", "backups", "other"];

const GROUP_LABELS: Record<string, string> = {
  iaas: "IaaS",
  paas: "PaaS",
  naas: "NaaS",
  backups: "Backups",
  other: "Other",
};

export function getGroupLabel(tag: string): string {
  return GROUP_LABELS[tag] ?? tag.charAt(0).toUpperCase() + tag.slice(1);
}

export function getGroupOrder(): string[] {
  return GROUP_ORDER;
}
