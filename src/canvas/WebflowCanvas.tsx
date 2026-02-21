import { useEffect, useRef, useState } from "react";
import type { Editor } from "grapesjs";
import { initViteHtmlEditor } from "../editor/initViteHtmlEditor";

type Props = { onReady: (editor: Editor) => void };

type DeviceId = "Desktop" | "Tablet" | "Mobile";

type LayoutMode = "block" | "flex" | "grid" | "unknown";

function getStyleValue(obj: any, key: string): string {
  if (!obj) return "";
  const v = obj[key];
  return typeof v === "string" ? v : "";
}

function normalizeLayoutMode(display: string): LayoutMode {
  const d = (display || "").trim().toLowerCase();
  if (!d) return "unknown";
  if (d === "flex" || d === "inline-flex") return "flex";
  if (d === "grid" || d === "inline-grid") return "grid";
  if (d === "block" || d === "inline" || d === "inline-block") return "block";
  return "unknown";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parsePx(v: string, fallback: number) {
  const m = String(v || "").match(/(-?\d+(?:\.\d+)?)/);
  if (!m) return fallback;
  const num = Number(m[1]);
  return Number.isFinite(num) ? num : fallback;
}

export default function WebflowCanvas({ onReady }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Editor | null>(null);

  const [leftW, setLeftW] = useState(280);
  const [rightW, setRightW] = useState(320);

  const [resizing, setResizing] = useState<null | "left" | "right">(null);

  // ✅ Device preview (replaces the GrapesJS panels device buttons)
  const [device, setDevice] = useState<DeviceId>("Desktop");

  // Selection + layout info (read-only display + parent helpers)
  const [selectedLabel, setSelectedLabel] = useState<string>("None");
  const [parentLabel, setParentLabel] = useState<string>("—");
  const [parentMode, setParentMode] = useState<LayoutMode>("unknown");
  const [gapPx, setGapPx] = useState<number>(16);

  const applyDevice = (next: DeviceId) => {
    setDevice(next);
    editorRef.current?.setDevice(next);
  };

  const refreshSelectionInfo = () => {
    const ed = editorRef.current;
    if (!ed) return;

    const sel: any = (ed as any).getSelected?.();
    if (!sel) {
      setSelectedLabel("None");
      setParentLabel("—");
      setParentMode("unknown");
      return;
    }

    const name = sel.getName?.() || sel.get("tagName") || "Element";
    setSelectedLabel(String(name));

    const parent = sel.parent?.();
    if (!parent) {
      setParentLabel("—");
      setParentMode("unknown");
      return;
    }

    const pName = parent.getName?.() || parent.get("tagName") || "Parent";
    setParentLabel(String(pName));

    const style = parent.getStyle?.() || {};
    const display = getStyleValue(style, "display");
    setParentMode(normalizeLayoutMode(display));

    const gap = getStyleValue(style, "gap") || getStyleValue(style, "columnGap") || getStyleValue(style, "rowGap");
    setGapPx(clamp(parsePx(gap, 16), 0, 80));
  };

  const ensureParent = () => {
    const ed = editorRef.current as any;
    const sel = ed?.getSelected?.();
    const parent = sel?.parent?.();
    return { ed, sel, parent };
  };

  const applyParentStyles = (styles: Record<string, string>) => {
    const { parent } = ensureParent();
    if (!parent?.addStyle) return;
    parent.addStyle(styles);
    refreshSelectionInfo();
  };

  const setParentFlex = (dir: "row" | "column") => {
    applyParentStyles({
      display: "flex",
      flexDirection: dir,
      alignItems: "stretch",
      justifyContent: "flex-start",
      gap: `${gapPx}px`,
    });
  };

  const setParentGrid = (cols: 2 | 3) => {
    applyParentStyles({
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      gap: `${gapPx}px`,
    });
  };

  const setParentCenter = () => {
    // If not flex/grid, default to flex row for centering
    if (parentMode !== "flex") {
      setParentFlex("row");
    }
    applyParentStyles({
      justifyContent: "center",
      alignItems: "center",
    });
  };

  const setParentSpaceBetween = () => {
    if (parentMode !== "flex") {
      setParentFlex("row");
    }
    applyParentStyles({ justifyContent: "space-between" });
  };

  const setGap = (nextGap: number) => {
    const g = clamp(nextGap, 0, 80);
    setGapPx(g);
    if (parentMode !== "flex" && parentMode !== "grid") {
      // Make it useful immediately
      setParentFlex("row");
      return;
    }
    applyParentStyles({ gap: `${g}px` });
  };

  // Toolbar actions
  const runUndo = () => editorRef.current?.runCommand("core:undo");
  const runRedo = () => editorRef.current?.runCommand("core:redo");
  const runDuplicate = () => {
    const { sel } = ensureParent();
    if (sel?.clone) sel.clone();
  };
  const runDelete = () => {
    const { sel } = ensureParent();
    if (sel?.remove) sel.remove();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizing || !hostRef.current) return;

      const rect = hostRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;

      if (resizing === "left") {
        setLeftW(Math.max(220, Math.min(520, x)));
      } else {
        const newRight = Math.max(260, Math.min(600, rect.width - x));
        setRightW(newRight);
      }
    };

    const onUp = () => {
      if (!resizing) return;
      setResizing(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.body.classList.remove("ve-resizing");
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  useEffect(() => {
    if (!hostRef.current) return;
    if (editorRef.current) return; // StrictMode-safe

    const ed = initViteHtmlEditor(hostRef.current);
    editorRef.current = ed;

    // ✅ make sure our local state matches editor device
    ed.setDevice("Desktop");
    setDevice("Desktop");

    // Selection listeners (keep Layout panel in sync)
    (ed as any).on?.("component:selected", refreshSelectionInfo);
    (ed as any).on?.("component:deselected", refreshSelectionInfo);
    (ed as any).on?.("component:update", refreshSelectionInfo);
    // Also update after undo/redo
    (ed as any).on?.("undo", refreshSelectionInfo);
    (ed as any).on?.("redo", refreshSelectionInfo);

    // Initial
    refreshSelectionInfo();

    onReady(ed);

    return () => {
      try {
        editorRef.current?.destroy();
      } finally {
        editorRef.current = null;
      }
    };
  }, [onReady]);

  const startResize = (side: "left" | "right") => {
    setResizing(side);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.body.classList.add("ve-resizing");
  };

  return (
    <>
      {/* Resize overlay prevents iframe stealing mouse events */}
      {resizing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            cursor: "col-resize",
            background: "transparent",
          }}
          onMouseDown={(e) => e.preventDefault()}
        />
      )}

      <div
        ref={hostRef}
        style={{
          height: "100%",
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: `${leftW}px 8px 1fr 8px ${rightW}px`,
        }}
      >
        {/* Left */}
        <div style={{ minHeight: 0, overflow: "hidden", display: "grid", gridTemplateRows: "40px 1fr" }}>
          <div className="wfPanelHeader">Add</div>
          <div className="wfPanelBody">
            <div id="gjs-blocks" />
            <div className="wfDivider" />
            <div className="wfPanelHeader" style={{ borderTop: "1px solid var(--border)" }}>
              Layers
            </div>
            <div className="wfPanelBody">
              <div id="gjs-layers" />
            </div>
          </div>
        </div>

        {/* Left resizer */}
        <div title="Drag to resize" onMouseDown={() => startResize("left")} style={{ cursor: "col-resize" }} />

        {/* Center */}
        <div style={{ minHeight: 0, overflow: "hidden", display: "grid", gridTemplateRows: "40px 1fr" }}>
          <div className="wfCanvasTopbar" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="wfCanvasTitle">Canvas</span>

            {/* ✅ Device switcher */}
            <div style={{ display: "flex", gap: 6 }}>
              {(["Desktop", "Tablet", "Mobile"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => applyDevice(d)}
                  aria-pressed={device === d}
                  title={`Preview ${d}`}
                  className={`wfToolBtn ${device === d ? "active" : ""}`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Toolbar */}
            <div className="wfToolbarGroup" style={{ marginLeft: 8 }}>
              <button type="button" className="wfIconBtn" onClick={runUndo} title="Undo (Ctrl+Z)">
                ↶
              </button>
              <button type="button" className="wfIconBtn" onClick={runRedo} title="Redo (Ctrl+Y)">
                ↷
              </button>
              <div className="wfToolbarSep" />
              <button type="button" className="wfIconBtn" onClick={runDuplicate} title="Duplicate">
                ⧉
              </button>
              <button type="button" className="wfIconBtn danger" onClick={runDelete} title="Delete">
                🗑
              </button>
            </div>

            <span className="wfCanvasHint" style={{ marginLeft: "auto" }}>
              Scroll inside canvas • Select element → style
            </span>
          </div>

          <div id="gjs-canvas" style={{ minHeight: 0, overflow: "auto" }} />
        </div>

        {/* Right resizer */}
        <div title="Drag to resize" onMouseDown={() => startResize("right")} style={{ cursor: "col-resize" }} />

        {/* Right */}
        <div style={{ minHeight: 0, overflow: "hidden", display: "grid", gridTemplateRows: "40px 1fr" }}>
          <div className="wfPanelHeader">Style</div>
          <div className="wfPanelBody">
            {/* Layout helpers */}
            <div className="wfLayoutCard">
              <div className="wfLayoutHead">
                <div className="wfLayoutTitle">Layout</div>
                <div className="wfLayoutSub">
                  Selected: <strong>{selectedLabel}</strong>
                </div>
              </div>

              <div className="wfLayoutRow">
                <span className="wfLayoutLabel">Parent</span>
                <span className="wfLayoutValue">{parentLabel}</span>
              </div>

              <div className="wfLayoutRow">
                <span className="wfLayoutLabel">Mode</span>
                <span className="wfLayoutPill">{parentMode === "unknown" ? "default" : parentMode}</span>
              </div>

              <div className="wfLayoutActions">
                <button type="button" className="wfMiniBtn" onClick={() => setParentFlex("row")} title="Set parent to flex row">
                  Row
                </button>
                <button type="button" className="wfMiniBtn" onClick={() => setParentFlex("column")} title="Set parent to flex column">
                  Column
                </button>
                <button type="button" className="wfMiniBtn" onClick={() => setParentGrid(2)} title="Set parent to 2-column grid">
                  Grid 2
                </button>
                <button type="button" className="wfMiniBtn" onClick={() => setParentGrid(3)} title="Set parent to 3-column grid">
                  Grid 3
                </button>
              </div>

              <div className="wfLayoutActions">
                <button type="button" className="wfMiniBtn" onClick={setParentCenter} title="Center items in parent (flex)">
                  Center
                </button>
                <button type="button" className="wfMiniBtn" onClick={setParentSpaceBetween} title="Space-between (flex)">
                  Space
                </button>
              </div>

              <div className="wfLayoutRow" style={{ marginTop: 8 }}>
                <span className="wfLayoutLabel">Gap</span>
                <div className="wfGapWrap">
                  <input
                    type="range"
                    min={0}
                    max={80}
                    step={2}
                    value={gapPx}
                    onChange={(e) => setGap(Number(e.target.value))}
                    title="Gap (px)"
                  />
                  <span className="wfGapValue">{gapPx}px</span>
                </div>
              </div>

              <div className="wfLayoutHint">
                Tip: “snapping” usually means the <strong>parent</strong> is flex/grid. Use Row/Column/Grid + Align/Gap instead of trying to
                drag pixels.
              </div>
            </div>

            <div id="gjs-style" />
            <div className="wfDivider" />
            <div className="wfPanelHeader" style={{ borderTop: "1px solid var(--border)" }}>
              Settings
            </div>
            <div className="wfPanelBody">
              <div id="gjs-traits" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
