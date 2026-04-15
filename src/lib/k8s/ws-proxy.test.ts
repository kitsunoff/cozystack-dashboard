import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseWsPath, buildUpstreamUrl } from "./ws-proxy";

vi.mock("./server", () => ({
  getKubeConfig: vi.fn(() => ({
    server: "https://k8s.example.com:6443",
    token: "test-token",
    ca: null,
    clientCert: null,
    clientKey: null,
    skipTLSVerify: false,
  })),
  getHttpsAgent: vi.fn(),
  resolveToken: vi.fn(() => "test-token"),
}));

describe("parseWsPath", () => {
  it("extracts API path from valid URL", () => {
    expect(
      parseWsPath("/api/k8s-ws/apis/subresources.kubevirt.io/v1/namespaces/tenant-test/virtualmachineinstances/my-vm/vnc")
    ).toBe("/apis/subresources.kubevirt.io/v1/namespaces/tenant-test/virtualmachineinstances/my-vm/vnc");
  });

  it("returns null for path without prefix", () => {
    expect(parseWsPath("/api/k8s/some/path")).toBeNull();
  });

  it("returns null for empty path after prefix", () => {
    expect(parseWsPath("/api/k8s-ws/")).toBe("/");
  });

  it("rejects path traversal with /../", () => {
    expect(parseWsPath("/api/k8s-ws/apis/../secrets")).toBeNull();
  });

  it("rejects path traversal with /./", () => {
    expect(parseWsPath("/api/k8s-ws/apis/./something")).toBeNull();
  });

  it("rejects path ending with /..", () => {
    expect(parseWsPath("/api/k8s-ws/apis/v1/..")).toBeNull();
  });

  it("handles URL with query parameters", () => {
    expect(
      parseWsPath("/api/k8s-ws/apis/subresources.kubevirt.io/v1/namespaces/ns/virtualmachineinstances/vm/vnc?timeout=60")
    ).toBe("/apis/subresources.kubevirt.io/v1/namespaces/ns/virtualmachineinstances/vm/vnc");
  });

  it("returns null for completely invalid URL", () => {
    expect(parseWsPath("")).toBeNull();
  });
});

describe("buildUpstreamUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("constructs wss URL from https server", () => {
    const url = buildUpstreamUrl("/apis/subresources.kubevirt.io/v1/namespaces/ns/virtualmachineinstances/vm/vnc");
    expect(url).toBe("wss://k8s.example.com:6443/apis/subresources.kubevirt.io/v1/namespaces/ns/virtualmachineinstances/vm/vnc");
  });

  it("strips trailing slash from server URL", async () => {
    const { getKubeConfig } = await import("./server");
    vi.mocked(getKubeConfig).mockReturnValueOnce({
      server: "https://k8s.example.com:6443/",
      token: "t",
      ca: null,
      clientCert: null,
      clientKey: null,
      skipTLSVerify: false,
    });
    const url = buildUpstreamUrl("/apis/v1/test");
    expect(url).toBe("wss://k8s.example.com:6443/apis/v1/test");
  });
});
