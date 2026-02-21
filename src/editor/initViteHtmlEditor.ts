import grapesjs from "grapesjs";
import type { Editor } from "grapesjs";
import presetWebpage from "grapesjs-preset-webpage";

export function initViteHtmlEditor(host: HTMLElement): Editor {
  const blocksEl = host.querySelector("#gjs-blocks") as HTMLElement | null;
  const layersEl = host.querySelector("#gjs-layers") as HTMLElement | null;
  const styleEl = host.querySelector("#gjs-style") as HTMLElement | null;
  const traitsEl = host.querySelector("#gjs-traits") as HTMLElement | null;
  const canvasEl = host.querySelector("#gjs-canvas") as HTMLElement | null;

  if (!blocksEl || !layersEl || !styleEl || !traitsEl || !canvasEl) {
    throw new Error(
      "Missing WebflowCanvas mount points. Ensure #gjs-blocks #gjs-layers #gjs-style #gjs-traits #gjs-canvas exist."
    );
  }

  // Build searchable blocks UI inside #gjs-blocks
  let blocksList = blocksEl.querySelector("#gjs-blocks-list") as HTMLElement | null;
  if (!blocksList) {
    blocksEl.innerHTML = "";

    const searchWrap = document.createElement("div");
    searchWrap.style.display = "flex";
    searchWrap.style.gap = "8px";
    searchWrap.style.padding = "10px";
    searchWrap.style.borderBottom = "1px solid var(--border)";
    searchWrap.style.background = "rgba(255,255,255,0.02)";

    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Search blocks…";
    search.style.width = "100%";
    search.style.padding = "10px 12px";
    search.style.borderRadius = "12px";
    search.style.border = "1px solid var(--border)";
    search.style.background = "var(--panel2)";
    search.style.color = "var(--text)";
    search.style.fontSize = "13px";

    blocksList = document.createElement("div");
    blocksList.id = "gjs-blocks-list";
    blocksList.style.padding = "10px";

    const applyFilter = () => {
      const q = (search.value || "").trim().toLowerCase();
      const blocks = blocksList!.querySelectorAll<HTMLElement>(".gjs-block");

      blocks.forEach((el) => {
        const text = (el.innerText || "").toLowerCase();
        el.style.display = q === "" || text.includes(q) ? "" : "none";
      });

      // Hide empty categories
      const cats = blocksList!.querySelectorAll<HTMLElement>(".gjs-block-category");
      cats.forEach((cat) => {
        const visible = Array.from(cat.querySelectorAll<HTMLElement>(".gjs-block")).some(
          (b) => b.style.display !== "none"
        );
        cat.style.display = visible ? "" : "none";
      });
    };

    search.addEventListener("input", applyFilter);

    searchWrap.appendChild(search);
    blocksEl.appendChild(searchWrap);
    blocksEl.appendChild(blocksList);

    setTimeout(applyFilter, 350);
  }

  const editor = grapesjs.init({
    container: canvasEl, // ✅ mount ONLY into the center canvas
    height: "100%",
    width: "auto",
    fromElement: false,
    storageManager: false,

    // ✅ Device previews (used by our custom buttons in WebflowCanvas)
    deviceManager: {
      devices: [
        { id: "Desktop", name: "Desktop", width: "" }, // full width
        { id: "Tablet", name: "Tablet", width: "768px" },
        { id: "Mobile", name: "Mobile", width: "375px" },
      ],
    },

    // Even if preset adds panels, we'll wipe them on load
    panels: { defaults: [] },

    plugins: [presetWebpage],
    pluginsOpts: { [presetWebpage]: {} },

    selectorManager: { componentFirst: true },

    blockManager: { appendTo: blocksList! },
    layerManager: { appendTo: layersEl },
    styleManager: { appendTo: styleEl },
    traitManager: { appendTo: traitsEl },

    assetManager: {
      embedAsBase64: true,
      upload: false,
    },
  });

  // ✅ Kill any default GrapesJS/preset panels/buttons that sneak in
  editor.on("load", () => {
    try {
      editor.Panels.getPanels().reset([]);
      editor.Panels.getButtons().reset([]);
    } catch {
      // no-op
    }
  });

  // Default device
  editor.setDevice("Desktop");

  // Starter page
  editor.setComponents(
    `
<header class="ve-header">
  <div class="ve-container ve-row ve-space">
    <strong>Site Title</strong>
    <nav class="ve-row ve-gap">
      <a href="#">Home</a><a href="#">About</a><a href="#">Contact</a>
    </nav>
  </div>
</header>

<main class="ve-main">
  <div class="ve-container">
    <h1>Welcome</h1>
    <p>Drag blocks from the left. Select elements to edit styles on the right.</p>
  </div>
</main>

<footer class="ve-footer">
  <div class="ve-container" style="opacity:0.75;">Footer</div>
</footer>
    `.trim()
  );

  // Base CSS
  editor.setStyle(
    `
body{margin:0;font-family:system-ui;}
a{color:inherit;}
.ve-container{max-width:1100px;margin:0 auto;padding:0 16px;}
.ve-row{display:flex;align-items:center;}
.ve-gap{gap:12px;}
.ve-space{justify-content:space-between;}
.ve-header{padding:18px 0;border-bottom:1px solid #ddd;}
.ve-main{padding:44px 0;}
.ve-footer{padding:18px 0;border-top:1px solid #ddd;}
.ve-card{border:1px solid #ddd;border-radius:14px;padding:16px;background:#fff;}
.ve-btn{display:inline-block;padding:10px 14px;border-radius:12px;border:1px solid #333;background:#fff;cursor:pointer;text-decoration:none;}
.ve-btn-primary{background:#111;color:#fff;border-color:#111;}
.ve-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.ve-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
.ve-divider{height:1px;background:#ddd;margin:16px 0;}
.ve-dropdown{position:relative;display:inline-block;}
.ve-dropdown-content{display:none;position:absolute;min-width:180px;margin-top:8px;padding:8px;border:1px solid #ddd;border-radius:14px;background:#fff;box-shadow:0 10px 25px rgba(0,0,0,0.12);}
.ve-dropdown-content a{display:block;padding:8px 10px;border-radius:10px;text-decoration:none;}
.ve-dropdown-content a:hover{background:#f2f2f2;}
.ve-dropdown:hover .ve-dropdown-content{display:block;}
    `.trim()
  );

  // Blocks (keep modest here; add more later)
  const bm = editor.BlockManager;
  bm.add("ve-section", {
    label: "Section",
    category: "Layout",
    content: `<section style="padding:24px 0;"><div class="ve-container"><h2 style="margin:0 0 10px;">Section</h2><p style="margin:0;">Content…</p></div></section>`,
  });
  bm.add("ve-container", {
    label: "Container",
    category: "Layout",
    content: `<div class="ve-container"><p style="margin:0;">Container</p></div>`,
  });
  bm.add("ve-grid-2", {
    label: "Grid 2 Columns",
    category: "Layout",
    content: `<div class="ve-grid-2"><div class="ve-card">A</div><div class="ve-card">B</div></div>`,
  });
  bm.add("ve-card", {
    label: "Card",
    category: "Layout",
    content: `<div class="ve-card"><h3 style="margin:0 0 8px;">Card</h3><p style="margin:0;">Text…</p></div>`,
  });

  bm.add("ve-h1", { label: "Heading H1", category: "Typography", content: `<h1 style="margin:0 0 10px;">Heading</h1>` });
  bm.add("ve-text", { label: "Paragraph", category: "Typography", content: `<p style="margin:0 0 10px;">Your text…</p>` });

  bm.add("ve-navbar", {
    label: "Navbar",
    category: "Navigation",
    content: `<header class="ve-header"><div class="ve-container ve-row ve-space"><strong>Brand</strong><nav class="ve-row ve-gap"><a href="#">Home</a><a href="#">Work</a><a href="#">Contact</a></nav></div></header>`,
  });
  bm.add("ve-dropdown", {
    label: "Dropdown Menu",
    category: "Navigation",
    content: `<div class="ve-dropdown"><a class="ve-btn" href="javascript:void(0)">Dropdown</a><div class="ve-dropdown-content"><a href="#">Link 1</a><a href="#">Link 2</a><a href="#">Link 3</a></div></div>`,
  });

  bm.add("ve-button", { label: "Button", category: "Forms", content: `<a class="ve-btn" href="#">Button</a>` });
  bm.add("ve-button-primary", { label: "Button Primary", category: "Forms", content: `<a class="ve-btn ve-btn-primary" href="#">Primary</a>` });

  bm.add("ve-image", { label: "Image", category: "Media", content: { type: "image" }, activate: true });
  bm.add("ve-divider", { label: "Divider", category: "Utilities", content: `<div class="ve-divider"></div>` });
  bm.add("ve-spacer", { label: "Spacer", category: "Utilities", content: `<div style="height:24px;"></div>` });

  // Ctrl+U asset upload
  editor.Commands.add("open-assets-upload", {
    run: async (ed) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.multiple = true;

      input.onchange = async () => {
        const files = Array.from(input.files ?? []);
        for (const file of files) {
          const dataUrl = await fileToDataUrl(file);
          ed.AssetManager.add({ src: dataUrl, name: file.name });
        }
        ed.AssetManager.open();
      };

      input.click();
    },
  });
  editor.Keymaps.add("open-assets-upload", "ctrl+u", "open-assets-upload");

  return editor;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
