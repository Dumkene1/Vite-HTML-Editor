import type { Editor } from "grapesjs";

export function getEditorHtml(editor: Editor): string {
  // GrapesJS returns body inner HTML by default
  return editor.getHtml();
}

export function getEditorCss(editor: Editor): string {
  return editor.getCss();
}

export function applyGlobalCss(editor: Editor, css: string) {
  // Sets CSS in the editor's CssComposer
  editor.setStyle(css);
}

export function applyHtmlToSelected(editor: Editor, html: string): { ok: boolean; message: string } {
  const sel = editor.getSelected();
  if (!sel) {
    return { ok: false, message: "No component selected. Click an element on the canvas, then apply HTML." };
  }

  try {
    // Replace selected component's inner content with the provided HTML
    sel.components(html);
    return { ok: true, message: "Applied HTML to the selected component." };
  } catch (e: any) {
    return { ok: false, message: `Failed to apply HTML: ${String(e?.message ?? e)}` };
  }
}

export function exportAsHtmlDocument(html: string, css: string, js: string): string {
  // Minimal full HTML doc export
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Vite HTML Editor Export</title>
  <style>
${css}
  </style>
</head>
<body>
${html}

  <script>
${js}
  </script>
</body>
</html>`;
}
