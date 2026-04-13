import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider } from "@/components/form/form-context";
import { UsersList } from "@/plugins/core/blocks/users-list";

function renderWithForm(schema: Record<string, unknown>, initial = {}) {
  return render(
    <FormProvider initialValues={initial} namespace="test">
      <UsersList schema={schema} />
    </FormProvider>
  );
}

const USERS_SCHEMA = {
  properties: {
    users: {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: { password: { type: "string" } },
      },
    },
  },
};

describe("UsersList", () => {
  it("renders nothing when schema has no users", () => {
    const { container } = renderWithForm({ properties: { replicas: { type: "integer" } } });
    expect(container.innerHTML).toBe("");
  });

  it("renders empty state", () => {
    renderWithForm(USERS_SCHEMA);
    expect(screen.getByText("No users configured")).toBeInTheDocument();
  });

  it("renders existing users", () => {
    renderWithForm(USERS_SCHEMA, { users: { admin: { password: "secret" } } });
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("adds a user", async () => {
    const user = userEvent.setup();
    renderWithForm(USERS_SCHEMA);

    await user.type(screen.getByPlaceholderText("username"), "newuser");
    await user.click(screen.getByText("+ Add User"));

    expect(screen.getByText("newuser")).toBeInTheDocument();
  });

  it("removes a user", async () => {
    const user = userEvent.setup();
    renderWithForm(USERS_SCHEMA, { users: { alice: { password: "" } } });

    expect(screen.getByText("alice")).toBeInTheDocument();
    await user.click(screen.getByText("Remove"));
    expect(screen.queryByText("alice")).not.toBeInTheDocument();
  });
});
