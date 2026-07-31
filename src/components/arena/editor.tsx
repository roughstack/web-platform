"use client";

import Editor, { type OnMount } from "@monaco-editor/react";

export interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
}

export function CodeEditor({ value, onChange, language }: EditorProps) {
  const handleMount: OnMount = (editor) => {
    editor.focus();
  };

  return (
    <div className="h-[50vh] min-h-[300px] w-full lg:h-[60vh] lg:min-h-[400px]">
      <Editor
        height="100%"
        defaultLanguage={language}
        language={language}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        onMount={handleMount}
        theme="vs-dark"
        options={{
          fontSize: 13,
          fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 16, bottom: 16 },
          lineNumbers: "on",
          renderWhitespace: "selection",
          tabSize: 2,
          automaticLayout: true,
          wordWrap: "on",
          bracketPairColorization: { enabled: true },
          smoothScrolling: true,
        }}
      />
    </div>
  );
}
