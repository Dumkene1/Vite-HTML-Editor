import { useCallback, useEffect, useMemo, useState } from "react";
import type { Editor } from "grapesjs";

import WebflowCanvas from "./canvas/WebflowCanvas";
import CodeTabs from "./code/CodeTabs";
import AdvancedModeWarning from "./ui/AdvancedModeWarning";
import CodeDrawer from "./layout/CodeDrawer";

import { getEditorCss, getEditorHtml } from "./editor";


type ThemeChoice = "auto" | "dark" | "dim" | "light";

type HeadSettings = {
  pageTitle: string;
  headHtml: string; // inserted inside <head> on export
  exportBaseName: string; // file base: name.html, name.css, name.js
};

type CustomPalette = Partial<{
  bg: string;
  panel: string;
  panel2: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
}>;

const LS_PROJECT_KEY = "vite-html-editor:projectData";
const LS_THEME_KEY = "vite-html-editor:theme";
const LS_HEAD_KEY = "vite-html-editor:headSettings";
const LS_CUSTOM_PALETTE_KEY = "vite-html-editor:customPalette";
const LS_CUSTOM_PALETTE_ENABLED_KEY = "vite-html-editor:customPaletteEnabled";

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function getSystemTheme(): "dark" | "light" {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function applyCustomPaletteVars(custom: CustomPalette) {
  const root = document.documentElement.style;
  if (custom.bg) root.setProperty("--bg", custom.bg);
  if (custom.panel) root.setProperty("--panel", custom.panel);
  if (custom.panel2) root.setProperty("--panel2", custom.panel2);
  if (custom.border) root.setProperty("--border", custom.border);
  if (custom.text) root.setProperty("--text", custom.text);
  if (custom.muted) root.setProperty("--muted", custom.muted);
  if (custom.accent) root.setProperty("--accent", custom.accent);
}

function clearCustomPaletteVars() {
  const root = document.documentElement.style;
  root.removeProperty("--bg");
  root.removeProperty("--panel");
  root.removeProperty("--panel2");
  root.removeProperty("--border");
  root.removeProperty("--text");
  root.removeProperty("--muted");
  root.removeProperty("--accent");
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export default function App() {
  const [editor, setEditor] = useState<Editor | null>(null);

  const [advancedMode, setAdvancedMode] = useState(false);
  const [codeOpen, setCodeOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [jsValue, setJsValue] = useState(`// JS exported with your document
console.log("Hello from Vite HTML Editor export!");`);

  // Theme selection (persisted)
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>(() => {
    const saved = localStorage.getItem(LS_THEME_KEY) as ThemeChoice | null;
    return saved ?? "auto";
  });

  // Page head settings (persisted)
  const [headSettings, setHeadSettings] = useState<HeadSettings>(() => {
    return safeJsonParse<HeadSettings>(localStorage.getItem(LS_HEAD_KEY), {
      pageTitle: "Vite HTML Editor Export",
      headHtml: "",
      exportBaseName: "vite-html-editor-export",
    });
  });

  // Custom palette (persisted)
  const [customEnabled, setCustomEnabled] = useState<boolean>(() => {
    const raw = localStorage.getItem(LS_CUSTOM_PALETTE_ENABLED_KEY);
    return raw ? raw === "1" : false;
  });

  const [customPalette, setCustomPalette] = useState<CustomPalette>(() => {
    return safeJsonParse<CustomPalette>(localStorage.getItem(LS_CUSTOM_PALETTE_KEY), {
      accent: "",
      bg: "",
      panel: "",
      panel2: "",
      border: "",
      text: "",
      muted: "",
    });
  });

  // Apply theme + auto OS updates + custom palette
  useEffect(() => {
    localStorage.setItem(LS_THEME_KEY, themeChoice);

    const apply = () => {
      const resolved = themeChoice === "auto" ? getSystemTheme() : themeChoice;
      document.documentElement.setAttribute("data-theme", resolved);

      if (customEnabled) applyCustomPaletteVars(customPalette);
      else clearCustomPaletteVars();
    };

    apply();

    if (themeChoice === "auto" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => apply();

      if (mq.addEventListener) mq.addEventListener("change", handler);
      else mq.addListener(handler);

      return () => {
        if (mq.removeEventListener) mq.removeEventListener("change", handler);
        else mq.removeListener(handler);
      };
    }

    return;
  }, [themeChoice, customEnabled, customPalette]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem(LS_HEAD_KEY, JSON.stringify(headSettings));
  }, [headSettings]);

  useEffect(() => {
    localStorage.setItem(LS_CUSTOM_PALETTE_ENABLED_KEY, customEnabled ? "1" : "0");
  }, [customEnabled]);

  useEffect(() => {
    localStorage.setItem(LS_CUSTOM_PALETTE_KEY, JSON.stringify(customPalette));
  }, [customPalette]);

  const onReady = useCallback((ed: Editor) => {
    setEditor(ed);
  }, []);

  const selectedInfo = useMemo(() => {
    if (!editor) return "No editor";
    const sel = editor.getSelected();
    if (!sel) return "No selection";
    return `Selected: ${sel.getName?.() ?? sel.get("type") ?? "component"}`;
  }, [editor]);

  function saveTemplate() {
    if (!editor) return;
    const data = editor.getProjectData();
    localStorage.setItem(
      LS_PROJECT_KEY,
      JSON.stringify({
        data,
        jsValue,
        headSettings,
        themeChoice,
        customEnabled,
        customPalette,
        savedAt: Date.now(),
      })
    );
    alert("Template saved (localStorage).");
  }

  function loadTemplate() {
    if (!editor) return;
    const raw = localStorage.getItem(LS_PROJECT_KEY);
    if (!raw) {
      alert("No saved template found.");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      editor.loadProjectData(parsed.data);
      if (typeof parsed.jsValue === "string") setJsValue(parsed.jsValue);
      if (parsed.headSettings) setHeadSettings(parsed.headSettings);
      if (parsed.themeChoice) setThemeChoice(parsed.themeChoice);
      if (typeof parsed.customEnabled === "boolean") setCustomEnabled(parsed.customEnabled);
      if (parsed.customPalette) setCustomPalette(parsed.customPalette);
      alert("Template loaded.");
    } catch (e: any) {
      alert(`Failed to load template: ${String(e?.message ?? e)}`);
    }
  }

  function clearProject() {
    if (!editor) return;
    editor.loadProjectData({ pages: [] } as any);
    editor.setComponents(
      `<header style="padding:24px;border-bottom:1px solid #ddd;"><div style="max-width:1100px;margin:0 auto;"><strong>Site Title</strong></div></header>
<main style="padding:40px;"><div style="max-width:1100px;margin:0 auto;"><h1>New Project</h1><p>Start building...</p></div></main>
<footer style="padding:24px;border-top:1px solid #ddd;"><div style="max-width:1100px;margin:0 auto;opacity:0.75;">Footer</div></footer>`
    );
    editor.setStyle(`body{margin:0;font-family:system-ui;}`);
    alert("Cleared.");
  }

  function exportProjectFiles() {
    if (!editor) return;

    const html = getEditorHtml(editor);
    const css = getEditorCss(editor);
    const js = jsValue;

    const base = (headSettings.exportBaseName || "vite-html-editor-export")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-");

    const pageTitle = (headSettings.pageTitle || "Vite HTML Editor Export").trim();
    const headHtml = headSettings.headHtml || "";

    const htmlDoc = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(pageTitle)}</title>
${headHtml}
  <link rel="stylesheet" href="./${base}.css" />
</head>
<body>
${html}
<script src="./${base}.js"></script>
</body>
</html>`;

    downloadFile(`${base}.html`, htmlDoc, "text/html;charset=utf-8");
    downloadFile(`${base}.css`, css, "text/css;charset=utf-8");
    downloadFile(`${base}.js`, js, "text/javascript;charset=utf-8");
  }

  return (
    <div className="app">
      <div className="topbar">
        <strong>Vite HTML Editor</strong>
        <span className="badge">{selectedInfo}</span>

        <div className="spacer" />

        <select
          value={themeChoice}
          onChange={(e) => setThemeChoice(e.target.value as ThemeChoice)}
          className="btn"
          title="Theme"
        >
          <option value="auto">Auto</option>
          <option value="dark">Dark</option>
          <option value="dim">Dim</option>
          <option value="light">Light</option>
        </select>

        <button className="btn" onClick={() => setSettingsOpen(true)}>
          Settings
        </button>

        <button className="btn" onClick={saveTemplate} disabled={!editor}>
          Save
        </button>
        <button className="btn" onClick={loadTemplate} disabled={!editor}>
          Load
        </button>
        <button className="btn" onClick={exportProjectFiles} disabled={!editor}>
          Export
        </button>
        <button className="btn" onClick={clearProject} disabled={!editor}>
          Clear
        </button>

        <button className="btn" onClick={() => setAdvancedMode((v) => !v)}>
          {advancedMode ? "Advanced: ON" : "Advanced: OFF"}
        </button>

        <button className="btn" onClick={() => setCodeOpen((v) => !v)}>
          {codeOpen ? "Hide Code" : "Show Code"}
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <WebflowCanvas onReady={onReady} />
      </div>

      <CodeDrawer open={codeOpen} onClose={() => setCodeOpen(false)}>
        <AdvancedModeWarning advancedMode={advancedMode} />
        <CodeTabs editor={editor} advancedMode={advancedMode} jsValue={jsValue} setJsValue={setJsValue} />
      </CodeDrawer>

      {settingsOpen && (
        <div
          className="modalBackdrop"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSettingsOpen(false);
          }}
        >
          <div className="modal">
            <div className="modalHeader">
              <strong>Settings</strong>
              <div className="spacer" />
              <button className="btn" onClick={() => setSettingsOpen(false)}>
                Close
              </button>
            </div>

            <div className="modalBody">
              <section className="settingsSection">
                <div className="settingsTitle">Page head</div>

                <label className="field">
                  <span>Page title</span>
                  <input
                    className="input"
                    value={headSettings.pageTitle}
                    onChange={(e) => setHeadSettings((s) => ({ ...s, pageTitle: e.target.value }))}
                    placeholder="My Website"
                  />
                </label>

                <label className="field">
                  <span>Export base name</span>
                  <input
                    className="input"
                    value={headSettings.exportBaseName}
                    onChange={(e) => setHeadSettings((s) => ({ ...s, exportBaseName: e.target.value }))}
                    placeholder="my-site"
                  />
                  <small className="help">Exports: name.html, name.css, name.js</small>
                </label>

                <label className="field">
                  <span>Extra &lt;head&gt; HTML (advanced)</span>
                  <textarea
                    className="textarea"
                    value={headSettings.headHtml}
                    onChange={(e) => setHeadSettings((s) => ({ ...s, headHtml: e.target.value }))}
                    placeholder={`<!-- Example: -->\n<meta name="description" content="..." />\n<link rel="icon" href="favicon.png" />`}
                  />
                  <small className="help">
                    This is inserted inside &lt;head&gt; during export. Paste only head tags (meta/link/script), not a full HTML
                    document.
                  </small>
                </label>
              </section>

              <section className="settingsSection">
                <div className="settingsTitle">Theme colors</div>

                <label className="fieldRow">
                  <span>Use custom palette</span>
                  <input type="checkbox" checked={customEnabled} onChange={(e) => setCustomEnabled(e.target.checked)} />
                </label>

                <div className="paletteGrid">
                  <PaletteColor
                    label="Accent"
                    value={customPalette.accent ?? ""}
                    disabled={!customEnabled}
                    onChange={(v) => setCustomPalette((p) => ({ ...p, accent: v }))}
                  />
                  <PaletteColor
                    label="Background"
                    value={customPalette.bg ?? ""}
                    disabled={!customEnabled}
                    onChange={(v) => setCustomPalette((p) => ({ ...p, bg: v }))}
                  />
                  <PaletteColor
                    label="Panel"
                    value={customPalette.panel ?? ""}
                    disabled={!customEnabled}
                    onChange={(v) => setCustomPalette((p) => ({ ...p, panel: v }))}
                  />
                  <PaletteColor
                    label="Panel 2"
                    value={customPalette.panel2 ?? ""}
                    disabled={!customEnabled}
                    onChange={(v) => setCustomPalette((p) => ({ ...p, panel2: v }))}
                  />
                  <PaletteColor
                    label="Border"
                    value={customPalette.border ?? ""}
                    disabled={!customEnabled}
                    onChange={(v) => setCustomPalette((p) => ({ ...p, border: v }))}
                  />
                  <PaletteColor
                    label="Text"
                    value={customPalette.text ?? ""}
                    disabled={!customEnabled}
                    onChange={(v) => setCustomPalette((p) => ({ ...p, text: v }))}
                  />
                  <PaletteColor
                    label="Muted"
                    value={customPalette.muted ?? ""}
                    disabled={!customEnabled}
                    onChange={(v) => setCustomPalette((p) => ({ ...p, muted: v }))}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  <button
                    className="btn"
                    onClick={() => {
                      setCustomPalette({
                        accent: "",
                        bg: "",
                        panel: "",
                        panel2: "",
                        border: "",
                        text: "",
                        muted: "",
                      });
                    }}
                    disabled={!customEnabled}
                  >
                    Reset custom colors
                  </button>

                  <button
                    className="btn"
                    onClick={() => {
                      setCustomEnabled(false);
                      setCustomPalette({
                        accent: "",
                        bg: "",
                        panel: "",
                        panel2: "",
                        border: "",
                        text: "",
                        muted: "",
                      });
                    }}
                  >
                    Disable custom palette
                  </button>
                </div>

                <small className="help">Tip: pick accent first, then background/panels. Borders should be subtle but visible.</small>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaletteColor({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className={`paletteItem ${disabled ? "disabled" : ""}`}>
      <span>{label}</span>
      <div className="paletteControls">
        <input
          className="color"
          type="color"
          disabled={disabled}
          value={normalizeColor(value)}
          onChange={(e) => onChange(e.target.value)}
          title={label}
        />
        <input className="input" disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} placeholder="#RRGGBB" />
      </div>
    </label>
  );
}

function normalizeColor(v: string) {
  return /^#([0-9a-fA-F]{6})$/.test(v) ? v : "#4fd1ff";
}
