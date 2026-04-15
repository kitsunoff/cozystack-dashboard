import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AppInstance } from "@/lib/k8s/types";
import { VmConsoleTabInner } from "./console-tab-inner";

// Mock noVNC RFB
const mockDisconnect = vi.fn();
const mockSendCtrlAltDel = vi.fn();
const mockAddEventListener = vi.fn();

vi.mock("@novnc/novnc/core/rfb.js", () => ({
  default: vi.fn().mockImplementation(() => ({
    disconnect: mockDisconnect,
    sendCtrlAltDel: mockSendCtrlAltDel,
    addEventListener: mockAddEventListener,
    scaleViewport: true,
    resizeSession: true,
  })),
}));

vi.mock("@/lib/k8s/hooks", () => ({
  useReleasePrefix: vi.fn(() => "vm-instance-"),
  useMarketplacePanels: vi.fn(() => ({ data: [] })),
  useApplicationDefinition: vi.fn(() => ({ data: undefined })),
}));

vi.mock("@/lib/k8s/client", () => ({
  k8sPatch: vi.fn(),
}));

function makeInstance(overrides: Partial<{ runStrategy: string; readyStatus: string }>): AppInstance {
  const { runStrategy = "Always", readyStatus = "True" } = overrides;
  return {
    apiVersion: "apps.cozystack.io/v1alpha1",
    kind: "VMInstance",
    metadata: {
      name: "test-vm",
      namespace: "tenant-test",
      creationTimestamp: new Date().toISOString(),
    },
    spec: {
      runStrategy,
    },
    status: {
      conditions: [
        { type: "Ready", status: readyStatus, reason: readyStatus === "True" ? "Ready" : "Starting" },
      ],
    },
  } as AppInstance;
}

function renderTab(instance: AppInstance) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <VmConsoleTabInner instance={instance} />
    </QueryClientProvider>,
  );
}

describe("VmConsoleTabInner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows stopped state when runStrategy is Halted", () => {
    renderTab(makeInstance({ runStrategy: "Halted" }));
    expect(screen.getByText("VM is stopped. Start the VM to access the console.")).toBeInTheDocument();
    expect(screen.getByText("Start VM")).toBeInTheDocument();
  });

  it("shows starting state when VM is not ready", () => {
    renderTab(makeInstance({ readyStatus: "False" }));
    expect(screen.getByText("VM is starting. Console will be available once the VM is running.")).toBeInTheDocument();
  });

  it("shows connect button when VM is ready", () => {
    renderTab(makeInstance({}));
    expect(screen.getByText("Connect")).toBeInTheDocument();
  });

  it("calls k8sPatch to start VM when Start button clicked", async () => {
    const user = userEvent.setup();
    const { k8sPatch } = await import("@/lib/k8s/client");

    renderTab(makeInstance({ runStrategy: "Halted" }));
    await user.click(screen.getByText("Start VM"));

    expect(k8sPatch).toHaveBeenCalledWith(
      expect.stringContaining("test-vm"),
      { spec: { runStrategy: "Always" } },
    );
  });
});
