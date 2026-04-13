"use client";

import { useState, useMemo, useEffect } from "react";
import { useFormContext } from "@/components/form/form-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import type { FormBlockProps } from "./types";
import { schemaHas, schemaProp, schemaProps } from "./types";

/**
 * Access Matrix — manages users + databases with role assignments.
 * Auto-discovers fields from schema or uses props overrides.
 *
 * props.usersField: string (default: auto-detect "users")
 * props.databasesField: string (default: auto-detect "databases")
 * props.roles: string[] (default: auto-detect from schema)
 */
export function AccessMatrix({ schema, basePath = [], title = "Users & Databases", props }: FormBlockProps) {
  const { getValue, setValue } = useFormContext();

  // Resolve field names
  const usersField = (props?.usersField as string) ?? (schemaHas(schema, "users") ? "users" : null);
  const databasesField = (props?.databasesField as string) ?? (schemaHas(schema, "databases") ? "databases" : null);

  if (!usersField) return null;

  // Detect available roles from schema
  const roles = useMemo(() => {
    if (props?.roles) return props.roles as string[];
    if (!databasesField) return [];
    const dbProp = schemaProp(schema, databasesField);
    const addProps = dbProp?.additionalProperties as Record<string, unknown> | undefined;
    const rolesProp = (addProps?.properties as Record<string, unknown>)?.roles as Record<string, unknown> | undefined;
    const rolesProps = rolesProp?.properties as Record<string, unknown> | undefined;
    return rolesProps ? Object.keys(rolesProps) : ["admin", "readonly"];
  }, [schema, databasesField, props?.roles]);

  const usersPath = [...basePath, usersField];
  const dbPath = databasesField ? [...basePath, databasesField] : null;

  const usersObj = (getValue(usersPath) as Record<string, Record<string, unknown>>) ?? {};
  const dbObj = dbPath ? (getValue(dbPath) as Record<string, Record<string, unknown>>) ?? {} : {};

  const userNames = Object.keys(usersObj);
  const dbNames = Object.keys(dbObj);

  // State for new entries
  const [newUser, setNewUser] = useState("");
  const [newDb, setNewDb] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // RFC 1123 validation for K8s resource names
  const rfc1123Regex = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/;
  const validateName = (name: string): string | null => {
    if (!name) return null;
    if (name !== name.toLowerCase()) return "Must be lowercase";
    if (name.length > 63) return "Max 63 characters";
    if (!rfc1123Regex.test(name)) return "Only lowercase letters, numbers, hyphens, dots";
    return null;
  };

  // Init defaults
  useEffect(() => {
    if (getValue(usersPath) === undefined) setValue(usersPath, {});
    if (dbPath && getValue(dbPath) === undefined) setValue(dbPath, {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addUser = () => {
    if (!newUser.trim()) return;
    const name = newUser.trim().toLowerCase();
    const err = validateName(name);
    if (err) { setValidationError(err); return; }
    setValidationError(null);
    setValue(usersPath, { ...usersObj, [name]: { password: "" } });
    // Auto-create first database and assign user if no databases exist
    if (dbPath && dbNames.length === 0) {
      const defaultDb = name + "db";
      setValue(dbPath, {
        [defaultDb]: { roles: { [roles[0]]: [name] } },
      });
    }
    setNewUser("");
  };

  const removeUser = (name: string) => {
    const updated = { ...usersObj };
    delete updated[name];
    setValue(usersPath, updated);
    // Remove user from all database roles
    if (dbPath) {
      const updatedDbs = { ...dbObj };
      for (const [dbName, db] of Object.entries(updatedDbs)) {
        const dbRoles = (db.roles as Record<string, string[]>) ?? {};
        const newRoles: Record<string, string[]> = {};
        for (const [role, members] of Object.entries(dbRoles)) {
          newRoles[role] = members.filter((m) => m !== name);
        }
        updatedDbs[dbName] = { ...db, roles: newRoles };
      }
      setValue(dbPath, updatedDbs);
    }
  };

  const setPassword = (name: string, password: string) => {
    setValue(usersPath, {
      ...usersObj,
      [name]: { ...usersObj[name], password },
    });
  };

  const addDb = () => {
    if (!newDb.trim() || !dbPath) return;
    const name = newDb.trim().toLowerCase();
    const err = validateName(name);
    if (err) { setValidationError(err); return; }
    setValidationError(null);
    const emptyRoles: Record<string, string[]> = {};
    for (const r of roles) emptyRoles[r] = [];
    setValue(dbPath, { ...dbObj, [name]: { roles: emptyRoles } });
    setNewDb("");
  };

  const removeDb = (name: string) => {
    if (!dbPath) return;
    const updated = { ...dbObj };
    delete updated[name];
    setValue(dbPath, updated);
  };

  const assignRole = (dbName: string, role: string, userName: string) => {
    if (!dbPath) return;
    const db = dbObj[dbName] ?? {};
    const dbRoles = (db.roles as Record<string, string[]>) ?? {};
    const members = dbRoles[role] ?? [];
    if (!members.includes(userName)) {
      setValue(dbPath, {
        ...dbObj,
        [dbName]: {
          ...db,
          roles: { ...dbRoles, [role]: [...members, userName] },
        },
      });
    }
  };

  const unassignRole = (dbName: string, role: string, userName: string) => {
    if (!dbPath) return;
    const db = dbObj[dbName] ?? {};
    const dbRoles = (db.roles as Record<string, string[]>) ?? {};
    setValue(dbPath, {
      ...dbObj,
      [dbName]: {
        ...db,
        roles: { ...dbRoles, [role]: (dbRoles[role] ?? []).filter((m) => m !== userName) },
      },
    });
  };

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium">{title}</label>

      {/* Users */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Users</Label>
        {userNames.length === 0 && (
          <p className="text-sm text-muted-foreground">No users configured</p>
        )}
        {userNames.map((name) => (
          <div key={name} className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <span className="text-sm font-medium w-28 shrink-0">{name}</span>
            <Input
              value={(usersObj[name]?.password as string) ?? ""}
              onChange={(e) => setPassword(name, e.target.value)}
              placeholder="password (auto if empty)"
              type="password"
              className="flex-1 h-8 text-sm"
            />
            <Button type="button" variant="ghost" size="icon-xs" onClick={() => removeUser(name)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
        <div className="flex gap-2 items-start">
          <div>
            <Input
              value={newUser}
              onChange={(e) => { setNewUser(e.target.value.toLowerCase()); setValidationError(null); }}
              placeholder="username"
              className="w-40 h-8 text-sm"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUser())}
            />
            {validationError && <p className="text-xs text-destructive mt-1">{validationError}</p>}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addUser}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add User
          </Button>
        </div>
      </div>

      {/* Databases + roles */}
      {databasesField && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Databases</Label>
          {dbNames.length === 0 && (
            <p className="text-sm text-muted-foreground">No databases configured</p>
          )}
          {dbNames.map((dbName) => {
            const db = dbObj[dbName] ?? {};
            const dbRoles = (db.roles as Record<string, string[]>) ?? {};

            return (
              <div key={dbName} className="rounded-lg border overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                  <span className="text-sm font-medium font-mono">{dbName}</span>
                  <Button type="button" variant="ghost" size="icon-xs" onClick={() => removeDb(dbName)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                <div className="px-3 py-2 space-y-2">
                  {roles.map((role) => {
                    const members = dbRoles[role] ?? [];
                    const available = userNames.filter((u) => !members.includes(u));

                    return (
                      <div key={role} className="space-y-1">
                        <Label className="text-xs capitalize">{role}</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {members.map((m) => (
                            <span
                              key={m}
                              className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs"
                            >
                              {m}
                              <button
                                type="button"
                                onClick={() => unassignRole(dbName, role, m)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          {available.length > 0 && (
                            <Select onValueChange={(v) => { if (typeof v === "string" && v) assignRole(dbName, role, v); }}>
                              <SelectTrigger className="h-6 w-28 text-xs">
                                <SelectValue placeholder="+ assign" />
                              </SelectTrigger>
                              <SelectContent>
                                {available.map((u) => (
                                  <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="flex gap-2">
            <Input
              value={newDb}
              onChange={(e) => { setNewDb(e.target.value.toLowerCase()); setValidationError(null); }}
              placeholder="database name"
              className="w-40 h-8 text-sm"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDb())}
            />
            <Button type="button" variant="outline" size="sm" onClick={addDb}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Database
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
