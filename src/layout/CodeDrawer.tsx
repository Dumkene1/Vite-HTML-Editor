import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export default function CodeDrawer({ open, onClose, children }: Props) {
  const [heightPct, setHeightPct] = useState(42);
  const [isDragging, setIsDragging] = useState(false);

  const rafRef = useRef<number | null>(null);
  const pendingPctRef = useRef<number>(42);

  const stopDrag = useCallback(() => {
    setIsDragging(false);

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => {
      const vh = window.innerHeight;
      const newPct = Math.max(18, Math.min(80, ((vh - e.clientY) / vh) * 100));
      pendingPctRef.current = newPct;

      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        setHeightPct(pendingPctRef.current);
      });
    };

    const onUp = () => stopDrag();

    // If mouse leaves window or tab loses focus, stop dragging too
    const onLeave = () => stopDrag();
    const onBlur = () => stopDrag();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") stopDrag();
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("blur", onBlur);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isDragging, stopDrag]);

  useEffect(() => {
    // Safety cleanup if drawer is closed while dragging
    if (!open && isDragging) stopDrag();
  }, [open, isDragging, stopDrag]);

  if (!open) return null;

  return (
    <>
      {/* Overlay shown only while dragging. Captures clicks, prevents iframe stealing events */}
      {isDragging && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            cursor: "row-resize",
            background: "transparent",
          }}
          onMouseDown={(e) => e.preventDefault()}
        />
      )}

      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: `${heightPct}vh`,
          borderTop: "1px solid var(--border)",
          background: "var(--panel)",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
          willChange: "height",
          zIndex: 9999,
        }}
      >
        {/* Drag handle */}
        <div
          title="Drag to resize"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDragging(true);
            document.body.style.cursor = "row-resize";
            document.body.style.userSelect = "none";
          }}
          style={{
            height: 8,
            cursor: "row-resize",
            background: "rgba(255,255,255,0.04)",
            borderBottom: "1px solid var(--border)",
            flex: "0 0 auto",
          }}
        />

        {/* Header */}
        <div
          style={{
            height: 40,
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            borderBottom: "1px solid var(--border)",
            background: "var(--panel2)",
            flex: "0 0 auto",
          }}
        >
          <strong>Code</strong>
          <div style={{ flex: 1 }} />
          <button
            className="btn"
            onClick={() => {
              stopDrag();
              onClose();
            }}
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {children}
        </div>
      </div>
    </>
  );
}
