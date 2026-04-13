import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider } from "@/components/form/form-context";
import { BackupConfig } from "@/plugins/core/blocks/backup-config";

function renderWithForm(schema: Record<string, unknown>, initial = {}) {
  return render(
    <FormProvider initialValues={initial} namespace="test">
      <BackupConfig schema={schema} />
    </FormProvider>
  );
}

const BACKUP_SCHEMA = {
  properties: {
    backup: {
      type: "object",
      properties: {
        enabled: { type: "boolean", default: false },
        schedule: { type: "string", default: "0 2 * * * *" },
        destinationPath: { type: "string", default: "s3://bucket/" },
        s3SecretKey: { type: "string", default: "" },
      },
    },
  },
};

describe("BackupConfig", () => {
  it("renders nothing when schema has no backup", () => {
    const { container } = renderWithForm({ properties: { replicas: { type: "integer" } } });
    expect(container.innerHTML).toBe("");
  });

  it("renders toggle when schema has backup", () => {
    renderWithForm(BACKUP_SCHEMA);
    expect(screen.getByText("Backup")).toBeInTheDocument();
  });

  it("shows config fields when enabled", async () => {
    const user = userEvent.setup();
    renderWithForm(BACKUP_SCHEMA, { backup: { enabled: true } });

    // Fields should be visible since enabled=true in initial values
    expect(screen.getByDisplayValue("0 2 * * * *")).toBeInTheDocument();
    expect(screen.getByDisplayValue("s3://bucket/")).toBeInTheDocument();
  });

  it("hides config fields when disabled", () => {
    renderWithForm(BACKUP_SCHEMA, { backup: { enabled: false } });
    expect(screen.queryByDisplayValue("0 2 * * * *")).not.toBeInTheDocument();
  });
});
