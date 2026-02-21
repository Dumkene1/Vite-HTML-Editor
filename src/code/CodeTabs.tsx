import { useEffect, useMemo, useRef, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import type { Editor } from "grapesjs";

import prettier from "prettier/standalone";
import * as prettierHtml from "prettier/plugins/html";
import * as prettierPostcss from "prettier/plugins/postcss";
import * as prettierBabel from "prettier/plugins/babel";

import { applyGlobalCss, applyHtmlToSelected, getEditorCss, getEditorHtml } from "../editor/sync";

type Tab = "html" | "css" | "js";

type Props = {
  editor: Editor | null;
  advancedMode: boolean;
  jsValue: string;
  setJsValue: (v: string) => void;
};

export default function CodeTabs({ editor, advancedMode, jsValue, setJsValue }: Props) {
  const [tab, setTab] = useState<Tab>("html");
  const [htmlValue, setHtmlValue] = useState("");
  const [cssValue, setCssValue] = useState("");
  const [status, setStatus] = useState("Ready.");

  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!editor) return;

    const sync = () => {
      try {
        const h = getEditorHtml(editor) ?? "";
        const c = getEditorCss(editor) ?? "";
        setHtmlValue(h);
        setCssValue(c);
      } catch (e: any) {
        setStatus(`Sync failed: ${String(e?.message ?? e)}`);
      }
    };

    const scheduleSync = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        sync();
      });
    };

    // Initial + delayed sync
    sync();
    setTimeout(sync, 0);
    setTimeout(sync, 200);

    // Key events that keep code in sync
    editor.on("load", scheduleSync);
    editor.on("update", scheduleSync);
    editor.on("component:add", scheduleSync);
    editor.on("component:remove", scheduleSync);
    editor.on("component:update", scheduleSync);
    editor.on("component:selected", scheduleSync);
    editor.on("styleManager:change", scheduleSync);
    editor.on("style:property:update", scheduleSync);

    return () => {
      try {
        editor.off("load", scheduleSync);
        editor.off("update", scheduleSync);
        editor.off("component:add", scheduleSync);
        editor.off("component:remove", scheduleSync);
        editor.off("component:update", scheduleSync);
        editor.off("component:selected", scheduleSync);
        editor.off("styleManager:change", scheduleSync);
        editor.off("style:property:update", scheduleSync);
      } catch {
        // ignore
      }
    };
  }, [editor]);

  const language = useMemo(() => (tab === "html" ? "html" : tab === "css" ? "css" : "javascript"), [tab]);
  const value = tab === "html" ? htmlValue : tab === "css" ? cssValue : jsValue;
  const setValue = tab === "html" ? setHtmlValue : tab === "css" ? setCssValue : setJsValue;

  async function formatCurrent() {
    try {
      if (tab === "html") {
        const out = await prettier.format(htmlValue, {
          parser: "html",
          plugins: [prettierHtml, prettierPostcss, prettierBabel],
        });
        setHtmlValue(out.trim());
      } else if (tab === "css") {
        const out = await prettier.format(cssValue, {
          parser: "css",
          plugins: [prettierPostcss],
        });
        setCssValue(out.trim());
      } else {
        const out = await prettier.format(jsValue, {
          parser: "babel",
          plugins: [prettierBabel],
        });
        setJsValue(out.trim());
      }
      setStatus("Formatted.");
    } catch (e: any) {
      setStatus(`Format failed: ${String(e?.message ?? e)}`);
    }
  }

  function applyEdits() {
    if (!editor) return;

    if (!advancedMode) {
      setStatus("Enable Advanced Editing Mode to apply changes.");
      return;
    }

    if (tab === "css") {
      applyGlobalCss(editor, cssValue);
      setStatus("Applied CSS globally.");
      return;
    }

    if (tab === "html") {
      const res = applyHtmlToSelected(editor, htmlValue);
      setStatus(res.message);
      return;
    }

    setStatus("JS saved for export.");
  }

  return (
  <div style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>

      <div className="tabs">
        <button className={`tab ${tab === "html" ? "active" : ""}`} onClick={() => setTab("html")}>
          HTML
        </button>
        <button className={`tab ${tab === "css" ? "active" : ""}`} onClick={() => setTab("css")}>
          CSS
        </button>
        <button className={`tab ${tab === "js" ? "active" : ""}`} onClick={() => setTab("js")}>
          JS
        </button>

        <div style={{ flex: 1 }} />

        <button className="btn" onClick={formatCurrent}>
          Format
        </button>
        <button className="btn" onClick={applyEdits} disabled={!editor}>
          Apply
        </button>
      </div>

      <div className="editorWrap" style={{ flex: 1, minHeight: 0 }}>
        <MonacoEditor
        height="100%"
          theme="vs-dark"
          language={language}
          value={value}
          onChange={(v) => setValue(v ?? "")}
          options={{
            readOnly: !advancedMode,
            minimap: { enabled: false },
            fontSize: 13,
            wordWrap: "on",
            automaticLayout: true,
          }}
        />
      </div>

      <div className="statusline">
        <span>{status}</span>
        <span className="monoHint">
          {advancedMode ? "Advanced mode: edits apply." : "Read-only (enable Advanced Mode to edit)."}
        </span>
      </div>
      </div>
);


}
