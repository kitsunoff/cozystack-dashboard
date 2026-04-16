"use client";

import { useCallback } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function YamlEditor({ value, onChange }: YamlEditorProps) {
  const { resolvedTheme } = useTheme();

  const handleMount: OnMount = useCallback((editor) => {
    // Suppress the built-in YAML diagnostics from the default
    // worker — validation is handled by our YAML.parse() on tab
    // switch, so duplicate squigglies would be confusing.
    const model = editor.getModel();
    if (model) {
      editor.getContribution("editor.contrib.quickFix");
    }
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
