import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormProvider } from "@/components/form/form-context";
import { StoragePicker } from "./storage-picker";

function renderWithForm(schema: Record<string, unknown>, initial = {}) {
  return render(
    <FormProvider initialValues={initial} namespace="test">
      <StoragePicker schema={schema} />
    </FormProvider>
  );
}

describe("StoragePicker", () => {
  it("renders nothing when schema has no storage fields", () => {
    const { container } = renderWithForm({ properties: { version: { type: "string" } } });
    expect(container.innerHTML).toBe("");
  });

  it("renders size and storageClass inputs", () => {
    const schema = {
      properties: {
        size: { default: "10Gi" },
        storageClass: { type: "string", default: "replicated" },
      },
    };
    renderWithForm(schema, { size: "10Gi", storageClass: "replicated" });
    expect(screen.getByDisplayValue("10Gi")).toBeInTheDocument();
    expect(screen.getByDisplayValue("replicated")).toBeInTheDocument();
  });

  it("renders only size when no storageClass", () => {
    const schema = { properties: { size: { default: "5Gi" } } };
    renderWithForm(schema, { size: "5Gi" });
    expect(screen.getByDisplayValue("5Gi")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("replicated")).not.toBeInTheDocument();
  });
});
