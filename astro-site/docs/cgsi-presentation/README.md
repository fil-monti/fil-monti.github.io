# CGSI Presentation and Interactive Tree App Guide

This guide is for future agents editing the CGSI web presentation and the
interactive CTMC tree app embedded inside it. The deck is a web presentation
built with Astro, MDX, and Reveal.js. The CTMC tree app is a static browser app
served from `public/apps/interactive-ctmc-tree/`.

## Quick Map

Main routes:

- Deck: `/talks/cgsi/`
- Website app page: `/apps/interactive-tree/`
- Raw CTMC tree app: `/apps/interactive-ctmc-tree/index.html`
- Raw app in website embed mode:
  `/apps/interactive-ctmc-tree/index.html?embed=1&theme=light`
- Raw app in slide mode:
  `/apps/interactive-ctmc-tree/index.html?embed=1&theme=light&presentation=1`

Main files:

- `src/pages/talks/cgsi/index.mdx`
  Slide order and slide content.
- `src/layouts/PresentationLayout.astro`
  Reveal.js setup, common deck controls, fullscreen handling, app visibility
  messages, and same-origin app navigation messages.
- `src/components/presentation/Slide.astro`
  Standard content slide wrapper.
- `src/components/presentation/TitleSlide.astro`
  Title slide wrapper.
- `src/components/presentation/AppSlide.astro`
  Iframe slide wrapper for embedded apps.
- `src/components/presentation/PresentationControls.astro`
  Small global previous, fullscreen, and next controls used across the deck.
- `src/styles/presentation.css`
  Deck-level styling.
- `public/apps/interactive-ctmc-tree/index.html`
  Raw app markup and presentation-mode helper script.
- `public/apps/interactive-ctmc-tree/css/style.css`
  Raw app styling, including embed and presentation modes.
- `public/apps/interactive-ctmc-tree/js/appRenderPipeline.js`
  Main canvas clearing and rendering behavior.
- `src/pages/apps/interactive-tree.astro`
  Website page that embeds the CTMC app.
- `src/components/CtmcEmbed.astro`
  Website embed component for the CTMC app.
- `src/styles/global.css`
  Website-level embed frame styling.

Do not edit `dist/`. Astro regenerates it during `npm run build`.

## Local Preview in VS Code

From the VS Code integrated terminal:

```bash
cd astro-site
npm run dev
```

Astro prints the local URL. It is usually:

```text
http://127.0.0.1:4321/
```

Open these URLs while developing:

```text
http://127.0.0.1:4321/talks/cgsi/
http://127.0.0.1:4321/apps/interactive-tree/
http://127.0.0.1:4321/apps/interactive-ctmc-tree/index.html?embed=1&theme=light
http://127.0.0.1:4321/apps/interactive-ctmc-tree/index.html?embed=1&theme=light&presentation=1
```

To preview directly inside VS Code:

1. Start `npm run dev` in the integrated terminal.
2. Copy the exact local URL Astro prints.
3. Open the Command Palette with `Cmd+Shift+P`.
4. Run `Simple Browser: Show`.
5. Paste the local URL.

If `4321` is already busy, Astro may choose another port. Use the URL printed
by the terminal, not a hard-coded port.

Stop the dev server with `Ctrl+C` in the terminal that is running it.

## Validation Commands

Run from `astro-site/`:

```bash
npm run check
npm run build
```

Use `npm run check` after code, app, or content changes. Use `npm run build`
before considering a presentation, route, or deployment-sensitive change done.

`astro check` may print TypeScript hints from static public app JavaScript. As
of this guide, the known app hints do not block the build when the final result
is `0 errors`.

## Editing Ordinary Slides

The deck content lives in:

```text
src/pages/talks/cgsi/index.mdx
```

A normal content slide looks like:

```mdx
<Slide id="motivation">

<h2>Motivation</h2>

- Present the scientific problem.
- Explain the bottleneck.
- Connect the visualization to the talk.

</Slide>
```

Rules:

- Give every slide a stable, lowercase `id`.
- Keep the `id` stable after sharing links because Reveal hashes use it.
- Use MDX syntax for components and Markdown syntax for simple content.
- Use display math with `$$...$$`; KaTeX is already configured.
- Avoid adding large page-level wrappers inside a slide. Let
  `presentation.css` own deck layout.

## Editing the Title Slide

The title slide is configured through the `talk` object in
`src/pages/talks/cgsi/index.mdx`:

```ts
export const talk = {
  title: "CGSI",
  subtitle: "Interactive statistical and computational models",
  author: "Filippo Monti",
  affiliation: "UCLA Biostatistics",
  event: "CGSI",
  date: "2026"
};
```

Then it is rendered with:

```mdx
<TitleSlide
  title={talk.title}
  subtitle={talk.subtitle}
  author={talk.author}
  affiliation={talk.affiliation}
  event={talk.event}
  date={talk.date}
/>
```

If adding logos, pass root-relative public paths with the `logos` prop.

## Editing App Slides

Interactive app slides use `AppSlide`:

```mdx
<AppSlide
  id="interactive-tree"
  class="cgsi-app-slide-side-nav"
  src="/apps/interactive-ctmc-tree/index.html?embed=1&theme=light&presentation=1"
  title="Interactive tree app"
  printSummary="The live version opens the app-only interactive tree view."
  showNavigation={false}
/>
```

Important props:

- `id`
  Stable Reveal slide id.
- `src`
  Iframe source.
- `title`
  Iframe title and optional app-slide label.
- `printSummary`
  Static fallback text for print/PDF contexts.
- `showNavigation`
  Controls whether the large app-specific previous/next buttons appear inside
  the app slide. The deck already has small global arrows. For the CTMC tree app
  slide, keep this `false`.
- `preserveState`
  Defaults to `true`. Keep it true when the iframe app should stay mounted
  across slide navigation.
- `class`
  Optional class for slide-specific CSS hooks.

The CTMC tree slide should keep all three URL flags:

- `embed=1`
  Hides raw app website chrome such as the topbar and hero.
- `theme=light`
  Forces light theme inside the iframe.
- `presentation=1`
  Enables slide-specific sizing, the Show commands / Hide commands button, and
  the 4:1 tree-to-command layout.

## Adding a New Interactive App

There are two supported patterns:

- A standalone static app under `public/apps/<app-name>/`.
- An Astro route under `src/pages/apps/<app-name>.astro`, usually used as a
  website-facing wrapper around a static app.

Use the static app pattern for self-contained HTML, CSS, JavaScript, canvas,
SVG, or WebGL demos. Use the Astro wrapper pattern when the app should appear as
part of the main website with the normal site header, hero, explanatory text, or
embed frame.

### 1. Add the App Files

Place standalone app files under:

```text
public/apps/<app-name>/
```

Recommended structure:

```text
public/apps/<app-name>/index.html
public/apps/<app-name>/css/style.css
public/apps/<app-name>/js/main.js
public/apps/<app-name>/assets/
```

Reference local app assets with paths relative to `index.html`, for example:

```html
<link rel="stylesheet" href="css/style.css">
<script type="module" src="js/main.js"></script>
<img src="assets/example.png" alt="">
```

Avoid absolute filesystem paths. The app must work after Astro copies `public/`
into the built site.

### 2. Add Embed and Presentation Modes

If the app will be embedded in the website or deck, add query-parameter handling
near the top of `index.html`:

```html
<script>
  (() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("embed") === "1") {
      document.documentElement.setAttribute("data-embed", "1");
    }

    if (params.get("presentation") === "1") {
      document.documentElement.setAttribute("data-presentation", "1");
    }

    const requestedTheme = params.get("theme");
    if (requestedTheme === "light" || requestedTheme === "dark") {
      document.documentElement.setAttribute("data-theme", requestedTheme);
    }
  })();
</script>
```

Then write CSS hooks:

```css
:root[data-embed="1"] .site-only-chrome {
  display: none;
}

:root[data-presentation="1"],
:root[data-presentation="1"] body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
```

Use `embed=1` to hide app chrome that should not appear inside another page.
Use `presentation=1` for slide-only sizing and controls. Keep shared design
improvements outside these mode blocks when they should also affect the direct
website version.

### 3. Add a Website Page, If Needed

For a website-facing page, create:

```text
src/pages/apps/<app-name>.astro
```

For a simple iframe wrapper, follow the CTMC pattern:

```astro
---
import InteractiveEmbed from "../../components/InteractiveEmbed.astro";
import PageHero from "../../components/PageHero.astro";
import BaseLayout from "../../layouts/BaseLayout.astro";

const src = "/apps/<app-name>/index.html?embed=1&theme=light";
---

<BaseLayout
  title="Interactive App Title"
  description="Short description of the interactive app."
>
  <PageHero
    eyebrow="Interactive app"
    title="Interactive App Title"
    description="Short description shown on the website page."
  />

  <section class="section-block interactive-app-page">
    <InteractiveEmbed
      className="<app-name>-frame"
      fallbackHref={src}
      minHeight={720}
      source="<app-name>-embed"
      src={src}
      title="Interactive app title"
    />
  </section>
</BaseLayout>
```

Add route links only when the app should be discoverable from the public site.
For example, software cards are configured from the Astro site source, not from
the presentation deck.

### 4. Add the App to a Slide

Import `AppSlide` in `src/pages/talks/cgsi/index.mdx` if it is not already
imported:

```mdx
import AppSlide from "../../../components/presentation/AppSlide.astro";
```

Then add a slide:

```mdx
<AppSlide
  id="my-new-app"
  src="/apps/<app-name>/index.html?embed=1&theme=light&presentation=1"
  title="My new interactive app"
  printSummary="The live version contains an interactive demonstration."
  showNavigation={false}
/>
```

Use `showNavigation={false}` when the deck's global arrows are enough. Use
`showNavigation={true}` only when the app slide needs the larger app-specific
previous/next controls.

### 5. Support Slide Visibility, If Useful

The deck sends `cgsi:visibility` messages to every app slide iframe. This is
useful for pausing animation while the app slide is hidden:

```js
window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type !== "cgsi:visibility") return;

  if (event.data.visible) {
    resumeAnimation();
  } else {
    pauseAnimation();
  }
});
```

If the app is same-origin and needs to move the deck, it can post:

```js
window.parent.postMessage(
  { type: "cgsi:navigate", direction: "next" },
  window.location.origin
);
```

Supported directions are `next`, `previous`, and `home`.

### 6. Make the App Responsive in Both Contexts

Check these URLs:

```text
/apps/<app-name>/index.html
/apps/<app-name>/index.html?embed=1&theme=light
/apps/<app-name>/index.html?embed=1&theme=light&presentation=1
/talks/cgsi/
```

For canvas or WebGL apps:

- preserve a known logical aspect ratio;
- resize the rendered canvas from its container size;
- dispatch or handle `resize` after presentation layout changes;
- avoid hard-coded viewport heights that break inside iframes;
- avoid opaque backgrounds if the slide or website background should show
  through.

For command toolbars:

- group controls semantically;
- avoid inline margins and widths;
- define shared height, gap, font, and radius variables;
- add mode-specific compaction under `data-presentation="1"` only after the
  shared website layout works.

### 7. Validate

After adding an app or slide:

```bash
cd astro-site
npm run check
npm run build
```

Then manually inspect the website app route and the deck route. In the deck,
confirm that slide navigation, fullscreen mode, and any app-specific controls
still work.

## Presentation Layout Behavior

`src/layouts/PresentationLayout.astro` initializes Reveal with:

- `hash: true`
- `controls: true`
- `controlsLayout: "edges"`
- `progress: true`
- `slideNumber: "c/t"`
- `center: false`
- `transition: "fade"`

It also handles:

- global previous/next/fullscreen controls;
- same-origin `postMessage` navigation from apps;
- `cgsi:visibility` messages sent to embedded app iframes.

If an app needs to know whether its slide is active, listen for:

```js
window.addEventListener("message", (event) => {
  if (event.data?.type === "cgsi:visibility") {
    const isVisible = Boolean(event.data.visible);
  }
});
```

If an app needs to move the deck, post:

```js
window.parent.postMessage(
  { type: "cgsi:navigate", direction: "next" },
  window.location.origin
);
```

Supported directions are `next`, `previous`, and `home`.

## CTMC App Modes

The raw CTMC app sets attributes on `<html>` from URL parameters in
`public/apps/interactive-ctmc-tree/index.html`:

- `data-embed="1"` when `embed=1`
- `data-presentation="1"` when `presentation=1`
- `data-theme="light"` or `data-theme="dark"` when `theme=...`

Mode-specific CSS lives in
`public/apps/interactive-ctmc-tree/css/style.css`:

- `:root[data-embed="1"]`
  Website iframe embedding rules.
- `:root[data-presentation="1"]`
  Slide-only layout rules.
- `:root[data-presentation="1"][data-commands-hidden]`
  Slide state after the user hides commands.

The presentation command toggle is:

```html
<button
  id="presentationCommandsToggle"
  class="presentation-command-toggle"
  type="button"
  aria-pressed="false"
>
  Hide commands
</button>
```

It is visible only in presentation mode. The keyboard shortcut `c` toggles the
commands in presentation mode.

## CTMC App Layout Notes

The main tree canvas is designed around a `1000 x 700` logical canvas. In
presentation mode, a helper in `index.html` measures `.canvas-wrapper`, fits the
canvas to the available rectangle, preserves the `1000 / 700` aspect ratio, and
dispatches a `resize` event so the renderer redraws.

When commands are visible in presentation mode:

- `.app-surface` uses two grid rows.
- The intended ratio is tree panel to commands near `4:1`.
- `.canvas-wrapper` occupies the top row.
- `.button-group`, `.control-panel`, and custom CTMC controls occupy the command
  area.

When commands are hidden:

- `data-commands-hidden` is added to `<html>`.
- command rows are hidden;
- the tree expands to use the available slide area;
- the Show commands button remains visible.

## Transparent Tree Panel

The canvas and app surface are intentionally transparent so the presentation or
website background can show through.

Relevant files:

- `public/apps/interactive-ctmc-tree/css/style.css`
  `--canvas-bg: transparent`, transparent embed/presentation body, and
  transparent `.app-surface`.
- `public/apps/interactive-ctmc-tree/js/appRenderPipeline.js`
  The renderer clears the canvas and only fills a background if CSS provides a
  non-transparent background color.
- `src/styles/global.css`
  The CTMC website iframe wrapper is transparent.
- `src/styles/presentation.css`
  The app-slide iframe background is transparent.

Do not reintroduce an opaque canvas fallback unless the design explicitly needs
one. Opaque fallbacks will hide the slide or website background.

## Editing the Main CTMC Toolbar

The main command row is in `public/apps/interactive-ctmc-tree/index.html`:

```html
<div class="button-group">
  ...
</div>
```

The current controls include:

- Play
- Reset
- settings button
- Animation Speed slider
- Tree size select
- Seed input
- Observations checkbox
- Time travel checkbox
- Show history segmented control

Shared toolbar styling lives in
`public/apps/interactive-ctmc-tree/css/style.css` near:

- `.button-group`
- `.control-item`
- `.control-stack-vertical`
- `.track-branches`
- `.segmented`
- `.segmented-btn`
- `:root[data-presentation="1"] .button-group`
- `:root[data-embed="1"] .button-group`

For professional toolbar edits:

- remove inline `style="..."` spacing from the HTML;
- group related controls with named wrapper classes;
- define shared control height, font size, radius, and gap variables;
- make labels align consistently across groups;
- avoid one-off margins that only work at one viewport size;
- test both `/talks/cgsi/` and `/apps/interactive-tree/`;
- test the raw app in both embed and presentation modes.

## Editing CTMC Panels

The lower model panels are in the raw app HTML and CSS:

- `.control-panel`
- `.control-section`
- `.panel-visibility-btn`

The visibility button size is controlled by CSS variables:

```css
--panel-toggle-size
--panel-toggle-icon-size
```

Do not hard-code SVG dimensions separately from the button size. Keep the icon
proportional to the button.

## Adding Static Assets

Use:

```text
public/talks/cgsi/figures/
public/talks/cgsi/media/
```

Reference assets with root-relative paths:

```mdx
<img src="/talks/cgsi/figures/example.png" alt="..." />
```

For app assets, keep files under:

```text
public/apps/interactive-ctmc-tree/assets/
```

## Safe Editing Checklist for Agents

Before editing:

```bash
git status --short
```

During editing:

- do not edit `dist/`;
- do not revert unrelated dirty files;
- prefer shared CSS rules over slide-only patches;
- keep website and presentation modes in sync unless the user asks otherwise;
- preserve app query flags in `AppSlide`;
- preserve the direct website route `/apps/interactive-tree/`.

After editing:

```bash
cd astro-site
npm run check
npm run build
```

Manually inspect these URLs:

```text
/talks/cgsi/
/apps/interactive-tree/
/apps/interactive-ctmc-tree/index.html?embed=1&theme=light
/apps/interactive-ctmc-tree/index.html?embed=1&theme=light&presentation=1
```

When checking the presentation slide, test both Show commands and Hide commands.

## Common Pitfalls

- Putting a `README.md` inside `src/pages/` can create an unintended route.
- Editing `dist/` will be overwritten by the next build.
- Removing `presentation=1` from the CTMC app slide disables the slide layout.
- Reintroducing large `AppSlide` navigation on the tree slide duplicates the
  global deck arrows.
- Making CSS changes only under `data-presentation="1"` will not fix the
  website version.
- Making CSS changes only under `data-embed="1"` will not fix the raw app in
  slide mode unless the slide URL also includes `embed=1`.
- Changing the canvas logical aspect ratio requires checking the canvas fitting
  helper and renderer assumptions.
- Inline margins in the toolbar usually create alignment problems in one of the
  two contexts: website embed or slide embed.
