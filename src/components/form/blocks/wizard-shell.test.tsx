import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WizardShell } from "./wizard-shell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/apps/postgreses/new",
  useSearchParams: () => new URLSearchParams("namespace=tenant-root"),
}));

const POSTGRES_SCHEMA = {
  properties: {
    version: { type: "string", default: "v17", enum: ["v17", "v16"] },
    replicas: { type: "integer", default: 2 },
    backup: {
      type: "object",
      default: {},
      properties: {
        enabled: { type: "boolean", default: false },
        schedule: { type: "string", default: "0 2 * * * *" },
      },
    },
  },
};

describe("WizardShell", () => {
  it("renders name input and submit button", () => {
    render(
      <WizardShell
        schema={POSTGRES_SCHEMA}
        plural="postgreses"
        namespace="tenant-root"
        apiGroup="apps.cozystack.io"
        apiVersion="v1alpha1"
        kind="Postgres"
        backHref="/apps/postgreses"
        submitLabel="PostgreSQL"
      >
        <div>child content</div>
      </WizardShell>
    );

    expect(screen.getByPlaceholderText("my-instance")).toBeInTheDocument();
    expect(screen.getByText("Create PostgreSQL")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("child content")).toBeInTheDocument();
  });
});
