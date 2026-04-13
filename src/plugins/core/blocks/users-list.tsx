"use client";

import { useState } from "react";
import { useFormContext } from "@/components/form/form-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { FormBlockProps } from "@/components/form/blocks/types";
import { schemaHas } from "@/components/form/blocks/types";

/**
 * Users list — dynamic key-value map of users with passwords.
 * Works with schema where "users" has additionalProperties with password field.
 * Shows nothing if schema has no "users".
 */
export function UsersList({ schema, basePath = [], title = "Users" }: FormBlockProps) {
  if (!schemaHas(schema, "users")) return null;

  const { getValue, setValue } = useFormContext();
  const path = [...basePath, "users"];
  const usersObj = (getValue(path) as Record<string, Record<string, unknown>>) ?? {};
  const userEntries = Object.entries(usersObj);

  const [newUsername, setNewUsername] = useState("");

  const addUser = () => {
    if (!newUsername.trim()) return;
    const updated = { ...usersObj, [newUsername.trim()]: { password: "" } };
    setValue(path, updated);
    setNewUsername("");
  };

  const removeUser = (name: string) => {
    const updated = { ...usersObj };
    delete updated[name];
    setValue(path, updated);
  };

  const setPassword = (name: string, password: string) => {
    const updated = {
      ...usersObj,
      [name]: { ...usersObj[name], password },
    };
    setValue(path, updated);
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">{title}</label>

      {userEntries.length === 0 && (
        <p className="text-sm text-muted-foreground">No users configured</p>
      )}

      {userEntries.map(([name, config]) => (
        <div key={name} className="flex items-center gap-2">
          <div className="w-32">
            <Label className="text-xs text-muted-foreground">{name}</Label>
          </div>
          <Input
            value={(config?.password as string) ?? ""}
            onChange={(e) => setPassword(name, e.target.value)}
            placeholder="password"
            type="password"
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => removeUser(name)}
          >
            Remove
          </Button>
        </div>
      ))}

      <div className="flex gap-2">
        <Input
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          placeholder="username"
          className="w-48"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUser())}
        />
        <Button type="button" variant="outline" size="sm" onClick={addUser}>
          + Add User
        </Button>
      </div>
    </div>
  );
}
