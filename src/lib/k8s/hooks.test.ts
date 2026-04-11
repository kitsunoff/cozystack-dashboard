import { describe, it, expect } from "vitest";
import {
  filterTenantNamespaces,
  verbsToOpType,
  parseRulesReview,
  type NamespaceInfo,
  type SelfSubjectRulesReviewResponse,
} from "./hooks";

describe("filterTenantNamespaces", () => {
  const namespaces: NamespaceInfo[] = [
    { name: "tenant-root", status: "Active", labels: {}, creationTimestamp: "" },
    { name: "tenant-dev", status: "Active", labels: {}, creationTimestamp: "" },
    { name: "kube-system", status: "Active", labels: {}, creationTimestamp: "" },
    { name: "default", status: "Active", labels: {}, creationTimestamp: "" },
    { name: "cozy-system", status: "Active", labels: {}, creationTimestamp: "" },
  ];

  it("returns only tenant-* namespaces", () => {
    const result = filterTenantNamespaces(namespaces);
    expect(result.map((n) => n.name)).toEqual(["tenant-root", "tenant-dev"]);
  });

  it("returns empty array when no tenants", () => {
    const noTenants = namespaces.filter((n) => !n.name.startsWith("tenant-"));
    expect(filterTenantNamespaces(noTenants)).toEqual([]);
  });

  it("handles empty input", () => {
    expect(filterTenantNamespaces([])).toEqual([]);
  });
});

describe("verbsToOpType", () => {
  it("returns * for wildcard verbs", () => {
    expect(verbsToOpType(["*"])).toBe("*");
  });

  it("returns delete for delete verb", () => {
    expect(verbsToOpType(["get", "list", "delete"])).toBe("delete");
  });

  it("returns write for create/update/patch", () => {
    expect(verbsToOpType(["get", "create"])).toBe("write");
    expect(verbsToOpType(["update"])).toBe("write");
    expect(verbsToOpType(["patch"])).toBe("write");
  });

  it("returns read for get/list/watch only", () => {
    expect(verbsToOpType(["get", "list", "watch"])).toBe("read");
  });

  it("returns read for empty verbs", () => {
    expect(verbsToOpType([])).toBe("read");
  });

  it("wildcard takes priority over delete", () => {
    expect(verbsToOpType(["*", "delete"])).toBe("*");
  });
});

describe("parseRulesReview", () => {
  it("parses simple rules", () => {
    const response: SelfSubjectRulesReviewResponse = {
      status: {
        resourceRules: [
          { verbs: ["get", "list"], apiGroups: [""], resources: ["pods"] },
          { verbs: ["create", "delete"], apiGroups: [""], resources: ["services"] },
        ],
      },
    };
    const result = parseRulesReview(response);
    expect(result.wildcardOp).toBeNull();
    expect(result.resources).toEqual([
      { resource: "pods", opType: "read" },
      { resource: "services", opType: "delete" },
    ]);
  });

  it("handles wildcard resources", () => {
    const response: SelfSubjectRulesReviewResponse = {
      status: {
        resourceRules: [
          { verbs: ["*"], apiGroups: ["*"], resources: ["*"] },
          { verbs: ["get"], apiGroups: [""], resources: ["configmaps"] },
        ],
      },
    };
    const result = parseRulesReview(response);
    expect(result.wildcardOp).toBe("*");
    // configmaps should be elevated to * by wildcard
    expect(result.resources.find((r) => r.resource === "configmaps")?.opType).toBe("*");
  });

  it("keeps highest privilege per resource", () => {
    const response: SelfSubjectRulesReviewResponse = {
      status: {
        resourceRules: [
          { verbs: ["get"], apiGroups: [""], resources: ["pods"] },
          { verbs: ["delete"], apiGroups: [""], resources: ["pods"] },
        ],
      },
    };
    const result = parseRulesReview(response);
    expect(result.resources.find((r) => r.resource === "pods")?.opType).toBe("delete");
  });

  it("ignores system review resources", () => {
    const response: SelfSubjectRulesReviewResponse = {
      status: {
        resourceRules: [
          { verbs: ["create"], apiGroups: [""], resources: ["selfsubjectrulesreviews"] },
          { verbs: ["get"], apiGroups: [""], resources: ["pods"] },
        ],
      },
    };
    const result = parseRulesReview(response);
    expect(result.resources.map((r) => r.resource)).toEqual(["pods"]);
  });

  it("sorts resources alphabetically", () => {
    const response: SelfSubjectRulesReviewResponse = {
      status: {
        resourceRules: [
          { verbs: ["get"], apiGroups: [""], resources: ["zebra", "alpha", "middle"] },
        ],
      },
    };
    const result = parseRulesReview(response);
    expect(result.resources.map((r) => r.resource)).toEqual(["alpha", "middle", "zebra"]);
  });

  it("handles empty rules", () => {
    const response: SelfSubjectRulesReviewResponse = {
      status: { resourceRules: [] },
    };
    const result = parseRulesReview(response);
    expect(result.wildcardOp).toBeNull();
    expect(result.resources).toEqual([]);
  });
});
