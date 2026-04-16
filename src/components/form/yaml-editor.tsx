"use client";

import { useRef, useEffect, useCallback } from "react";
import Editor, { type OnMount, loader } from "@monaco-editor/react";
import { useTheme } from "next-themes";

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  jsonSchema?: Record<string, unknown>;
}

// Configure monaco-yaml worker before the editor mounts.
// Must run once at module level — the worker handles validation
// and completion for all YAML editors on the page.
let workerConfigured = false;

function ensureYamlWorker() {
  if (workerConfigured) return;
  workerConfigured = true;

  loader.init().then((monaco) => {
    // monaco-yaml configures via setDiagnosticsOptions on the YAML
    // worker. The import pulls in the worker setup as a side effect.
    import("monaco-yaml").then(({ configureMonacoYaml }) => {
      configureMonacoYaml(monaco, {
        enableSchemaRequest: false,
        validate: true,
        format: true,
        hover: true,
        completion: true,
        schemas: [],
      });
    });
  });
}

export function YamlEditor({ value, onChange, jsonSchema }: YamlEditorProps) {
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const schemaUriRef = useRef<string>("");

  useEffect(() => {
    ensureYamlWorker();
  }, []);

  // Update JSON Schema for validation/completion when it changes
  useEffect(() => {
    if (!monacoRef.current || !jsonSchema) return;

    import("monaco-yaml").then(({ configureMonacoYaml }) => {
      const uri = schemaUriRef.current || "inmemory://spec-schema.json";
      schemaUriRef.current = uri;

      configureMonacoYaml(monacoRef.current!, {
        enableSchemaRequest: false,
        validate: true,
        format: true,
        hover: true,
        completion: true,
        schemas: [
          {
            uri,
            fileMatch: ["*"],
            schema: jsonSchema as Record<string, unknown>,
          },
        ],
      });
    });
  }, [jsonSchema]);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  }, []);

  const handleChange = useCallback(
    (val: string | undefined) => {
      onChange(val ?? "");
    },
    [onChange]
  );

  return (
    <div className="rounded-xl border overflow-hidden">
      <Editor
        height="400px"
        language="yaml"
        theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
        value={value}
        onChange={handleChange}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          renderWhitespace: "trailing",
          bracketPairColorization: { enabled: true },
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
}
