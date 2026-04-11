import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider } from "@/components/form/form-context";
import { ReplicasPicker } from "./replicas-picker";

function renderWithForm(schema: Record<string, unknown>, initial = {}) {
  return render(
    <FormProvider initialValues={initial} namespace="test">
      <ReplicasPicker schema={schema} />
    </FormProvider>
  );
}

describe("ReplicasPicker", () => {
  it("renders nothing when schema has no replicas", () => {
    const { container } = renderWithForm({ properties: { version: { type: "string" } } });
    expect(container.innerHTML).toBe("");
  });

  it("renders replica buttons", () => {
    const schema = { properties: { replicas: { type: "integer", default: 2 } } };
    renderWithForm(schema);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("highlights default value", () => {
    const schema = { properties: { replicas: { type: "integer", default: 3 } } };
    renderWithForm(schema, { replicas: 3 });
    expect(screen.getByText("3").closest("button")).toHaveClass("ring-1");
  });

  it("changes value on click", async () => {
    const user = userEvent.setup();
    const schema = { properties: { replicas: { type: "integer", default: 2 } } };
    renderWithForm(schema, { replicas: 2 });

    await user.click(screen.getByText("5"));
    expect(screen.getByText("5").closest("button")).toHaveClass("ring-1");
  });
});
