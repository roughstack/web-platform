"use client";

import { useCallback, useRef } from "react";
import Editor, { type OnMount, type OnChange } from "@monaco-editor/react";

export interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  /** Called when a paste event exceeds the suspicious-paste threshold. */
  onSuspiciousPaste?: (pastedLength: number) => void;
}

/**
 * The paste threshold above which a paste is considered "suspicious" and
 * reported to the parent. 120 chars is roughly the length of a typical
 * function body — a single hand-typed edit is almost always shorter, while
 * an LLM response pasted in one shot is almost always longer.
 */
const SUSPICIOUS_PASTE_THRESHOLD = 120;

export function CodeEditor({ value, onChange, language, onSuspiciousPaste }: EditorProps) {
  const pasteWarnedRef = useRef(false);

  const handleMount: OnMount = (editor, _monaco) => {
    editor.focus();

    // Block copy and cut from the editor. This is a friction defense, not a
    // wall — the text is in the DOM — but it removes the one-click path to
    // exfiltrating challenge code into an LLM. Monaco doesn't expose
    // clipboard hooks on the editor instance, so we intercept the native
    // events on the underlying textarea and the editor DOM.
    const editorDom = editor.getDomNode();
    if (editorDom) {
      const blockClipboard = (e: Event) => {
        e.preventDefault();
      };
      editorDom.addEventListener("copy", blockClipboard);
      editorDom.addEventListener("cut", blockClipboard);

      // Detect large pastes. We don't block paste (that would break
      // legitimate workflows like pasting a snippet from a local file), but
      // we report pastes above the threshold so the parent can flag the
      // submission.
      editorDom.addEventListener("paste", (e) => {
        const pasted = (e as ClipboardEvent).clipboardData?.getData("text") ?? "";
        if (pasted.length > SUSPICIOUS_PASTE_THRESHOLD && !pasteWarnedRef.current) {
          pasteWarnedRef.current = true;
          onSuspiciousPaste?.(pasted.length);
        }
      });

      // Disable the context menu (right-click) so "Copy" can't be reached
      // that way.
      editorDom.addEventListener("contextmenu", (e) => e.preventDefault());
    }
  };

  const handleChange: OnChange = useCallback((v) => {
    onChange(v ?? "");
  }, [onChange]);

  return (
    <div className="h-[50vh] min-h-[300px] w-full lg:h-[60vh] lg:min-h-[400px]">
      <Editor
        height="100%"
        defaultLanguage={language}
        language={language}
        value={value}
        onChange={handleChange}
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
          contextmenu: false,
          copyWithSyntaxHighlighting: false,
        }}
      />
    </div>
  );
}

