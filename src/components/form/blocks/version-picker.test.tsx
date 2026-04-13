import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider } from "@/components/form/form-context";
import { VersionPicker } from "@/plugins/core/blocks/version-picker";

function renderWithForm(schema: Record<string, unknown>, initial = {}) {
  return render(
    <FormProvider initialValues={initial} namespace="test">
      <VersionPicker schema={schema} />
    </FormProvider>
  );
}

describe("VersionPicker", () => {
  it("renders nothing when schema has no version enum", () => {
    const { container } = renderWithForm({ properties: { replicas: { type: "integer" } } });
    expect(container.innerHTML).toBe("");
  });

  it("renders version buttons from schema enum", () => {
    const schema = {
      properties: {
        version: { type: "string", default: "v17", enum: ["v17", "v16", "v15"] },
      },
    };
    renderWithForm(schema);
    expect(screen.getByText("v17")).toBeInTheDocument();
    expect(screen.getByText("v16")).toBeInTheDocument();
    expect(screen.getByText("v15")).toBeInTheDocument();
  });

  it("filters empty strings from enum", () => {
    const schema = {
      properties: {
        version: { type: "string", default: "v8", enum: ["v8", "v7", ""] },
      },
    };
    renderWithForm(schema);
    expect(screen.getByText("v8")).toBeInTheDocument();
    expect(screen.getByText("v7")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(2);
  });

  it("selects version on click", async () => {
    const user = userEvent.setup();
    const schema = {
      properties: {
        version: { type: "string", default: "v17", enum: ["v17", "v16"] },
      },
    };
    renderWithForm(schema, { version: "v17" });

    const v16Button = screen.getByText("v16");
    await user.click(v16Button);

    // After click, v16 should have the active style (ring-1)
    expect(v16Button.closest("button")).toHaveClass("ring-1");
  });
});
