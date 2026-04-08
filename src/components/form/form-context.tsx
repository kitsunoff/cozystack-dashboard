"use client";

import { createContext, useContext, useCallback, useState } from "react";

interface FormContextValue {
  values: Record<string, unknown>;
  getValue: (path: string[]) => unknown;
  setValue: (path: string[], value: unknown) => void;
  namespace: string;
}

const FormContext = createContext<FormContextValue | null>(null);

export function useFormContext() {
  const ctx = useContext(FormContext);
  if (!ctx) throw new Error("useFormContext must be used within FormProvider");
  return ctx;
}

interface FormProviderProps {
  initialValues: Record<string, unknown>;
  namespace: string;
  children: React.ReactNode;
}

export function FormProvider({
  initialValues,
  namespace,
  children,
}: FormProviderProps) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);

  const getValue = useCallback(
    (path: string[]): unknown => {
      let current: unknown = values;
      for (const key of path) {
        if (current == null || typeof current !== "object") return undefined;
        current = (current as Record<string, unknown>)[key];
      }
      return current;
    },
    [values]
  );

  const setValue = useCallback((path: string[], value: unknown) => {
    setValues((prev) => {
      const next = structuredClone(prev);
      let current = next as Record<string, unknown>;
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (current[key] == null || typeof current[key] !== "object") {
          current[key] = {};
        }
        current = current[key] as Record<string, unknown>;
      }
      current[path[path.length - 1]] = value;
      return next;
    });
  }, []);

  return (
    <FormContext value={{ values, getValue, setValue, namespace }}>
      {children}
    </FormContext>
  );
}
