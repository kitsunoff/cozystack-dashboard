import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormProvider } from "@/components/form/form-context";
import { ExternalToggle } from "@/plugins/core/blocks/external-toggle";

function renderWithForm(schema: Record<string, unknown>, initial = {}) {
  return render(
    <FormProvider initialValues={initial} namespace="test">
      <ExternalToggle schema={schema} />
    </FormProvider>
  );
}

describe("ExternalToggle", () => {
  it("renders nothing when schema has no external", () => {
    const { container } = renderWithForm({ properties: { replicas: { type: "integer" } } });
    expect(container.innerHTML).toBe("");
  });

  it("renders toggle when schema has external", () => {
    const schema = { properties: { external: { type: "boolean", default: false } } };
    renderWithForm(schema);
    expect(screen.getByText("External Access")).toBeInTheDocument();
  });
});
