export type BuiltinTemplate = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  thumbnail?: string; // later: URL or base64
  html: string;
  css: string;
};

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    id: "blank",
    name: "Blank Page",
    description: "Clean header/main/footer scaffold.",
    tags: ["starter"],
    html: `
<header class="ve-header">
  <div class="ve-container ve-row ve-space">
    <strong>Site Title</strong>
    <nav class="ve-row ve-gap">
      <a href="#">Home</a><a href="#">About</a><a href="#">Contact</a>
    </nav>
  </div>
</header>
<main class="ve-main"><div class="ve-container"><h1>Title</h1><p>Start building…</p></div></main>
<footer class="ve-footer"><div class="ve-container" style="opacity:0.75;">Footer</div></footer>
`.trim(),
    css: `
body{margin:0;font-family:system-ui;}
.ve-container{max-width:1100px;margin:0 auto;padding:0 16px;}
.ve-row{display:flex;align-items:center;}
.ve-gap{gap:12px;}
.ve-space{justify-content:space-between;}
.ve-header{padding:18px 0;border-bottom:1px solid #ddd;}
.ve-main{padding:44px 0;}
.ve-footer{padding:18px 0;border-top:1px solid #ddd;}
`.trim(),
  },
  {
    id: "landing",
    name: "Landing Page",
    description: "Hero + features + CTA.",
    tags: ["marketing", "landing"],
    html: `
<header class="ve-header">
  <div class="ve-container ve-row ve-space">
    <strong>Brand</strong>
    <nav class="ve-row ve-gap"><a href="#">Features</a><a href="#">Pricing</a><a href="#">Contact</a></nav>
  </div>
</header>

<main class="ve-main">
  <div class="ve-container">
    <section class="hero">
      <h1>Build faster</h1>
      <p>Create clean HTML/CSS quickly and export to edit in VS Code.</p>
      <div class="ve-row ve-gap">
        <a class="btn primary" href="#">Get started</a>
        <a class="btn" href="#">Learn more</a>
      </div>
    </section>

    <section class="grid">
      <div class="card"><h3>Fast</h3><p>Drag & drop blocks.</p></div>
      <div class="card"><h3>Clean</h3><p>Exports clean HTML/CSS.</p></div>
      <div class="card"><h3>Flexible</h3><p>Edit after export.</p></div>
    </section>
  </div>
</main>

<footer class="ve-footer"><div class="ve-container" style="opacity:0.75;">© Brand</div></footer>
`.trim(),
    css: `
body{margin:0;font-family:system-ui;}
.ve-container{max-width:1100px;margin:0 auto;padding:0 16px;}
.ve-row{display:flex;align-items:center;}
.ve-gap{gap:12px;}
.ve-space{justify-content:space-between;}
.ve-header{padding:18px 0;border-bottom:1px solid #ddd;}
.ve-main{padding:44px 0;}
.ve-footer{padding:18px 0;border-top:1px solid #ddd;}
.hero{padding:40px 0;}
.btn{display:inline-block;padding:10px 14px;border-radius:12px;border:1px solid #111;text-decoration:none;color:#111;}
.btn.primary{background:#111;color:#fff;}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:24px 0;}
.card{border:1px solid #ddd;border-radius:14px;padding:16px;}
`.trim(),
  },
];
