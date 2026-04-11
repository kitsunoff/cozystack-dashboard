import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider } from "@/components/form/form-context";
import { ResourcesPicker } from "./resources-picker";

function renderWithForm(schema: Record<string, unknown>, initial = {}) {
  return render(
    <FormProvider initialValues={initial} namespace="test">
      <ResourcesPicker schema={schema} />
    </FormProvider>
  );
}

const FULL_SCHEMA = {
  properties: {
    resourcesPreset: {
      type: "string",
      default: "micro",
      enum: ["nano", "micro", "small", "medium", "large", "xlarge", "2xlarge"],
    },
    resources: {
      type: "object",
      properties: {
        cpu: { type: "string" },
        memory: { type: "string" },
      },
    },
  },
};

describe("ResourcesPicker", () => {
  it("renders nothing when schema has no resources fields", () => {
    const { container } = renderWithForm({ properties: { version: { type: "string" } } });
    expect(container.innerHTML).toBe("");
  });

  it("renders preset cards", () => {
    renderWithForm(FULL_SCHEMA);
    expect(screen.getByText("nano")).toBeInTheDocument();
    expect(screen.getByText("micro")).toBeInTheDocument();
    expect(screen.getByText("medium")).toBeInTheDocument();
  });

  it("selects preset on click", async () => {
    const user = userEvent.setup();
    renderWithForm(FULL_SCHEMA, { resourcesPreset: "micro" });

    await user.click(screen.getByText("large"));
    expect(screen.getByText("large").closest("button")).toHaveClass("ring-1");
  });

  it("shows custom resources toggle", () => {
    renderWithForm(FULL_SCHEMA);
    expect(screen.getByText("Custom resources")).toBeInTheDocument();
  });

  it("switches to custom mode", async () => {
    const user = userEvent.setup();
    renderWithForm(FULL_SCHEMA);

    await user.click(screen.getByText("Custom resources"));
    expect(screen.getByPlaceholderText("1")).toBeInTheDocument(); // CPU
    expect(screen.getByPlaceholderText("1Gi")).toBeInTheDocument(); // Memory
  });

  it("renders without preset (only custom resources)", () => {
    const schema = {
      properties: {
        resources: {
          type: "object",
          properties: {
            cpu: { type: "string" },
            memory: { type: "string" },
          },
        },
      },
    };
    renderWithForm(schema);
    // Should show custom inputs directly, no preset cards
    expect(screen.queryByText("nano")).not.toBeInTheDocument();
  });
});
