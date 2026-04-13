import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FormProvider } from "@/components/form/form-context";
import { StoragePicker } from "@/plugins/core/blocks/storage-picker";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/test",
  useParams: () => ({ namespace: "test" }),
  useSearchParams: () => new URLSearchParams(),
}));

const queryClient = new QueryClient();

function renderWithForm(schema: Record<string, unknown>, initial = {}) {
  return render(
    <QueryClientProvider client={queryClient}>
      <FormProvider initialValues={initial} namespace="test">
        <StoragePicker schema={schema} />
      </FormProvider>
    </QueryClientProvider>
  );
}

describe("StoragePicker", () => {
  it("renders nothing when schema has no storage fields", () => {
    const { container } = renderWithForm({ properties: { version: { type: "string" } } });
    expect(container.innerHTML).toBe("");
  });

  it("renders size input", () => {
    const schema = {
      properties: {
        size: { default: "10Gi" },
        storageClass: { type: "string", default: "replicated" },
      },
    };
    renderWithForm(schema, { size: "10Gi", storageClass: "replicated" });
    expect(screen.getByDisplayValue("10Gi")).toBeInTheDocument();
  });

  it("renders only size when no storageClass", () => {
    const schema = { properties: { size: { default: "5Gi" } } };
    renderWithForm(schema, { size: "5Gi" });
    expect(screen.getByDisplayValue("5Gi")).toBeInTheDocument();
  });
});
