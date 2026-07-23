# Agent Guide for Filippo Monti Website

This file is for coding agents working on this repository. It explains how to modify the active website safely and consistently.

## Current Active Site

The live site is the Astro project in:

```text
astro-site/
```

The site deploys to:

```text
https://fil-monti.github.io
```

The deployment workflow is:

```text
.github/workflows/deploy-astro.yml
```

The workflow builds and deploys `astro-site/dist` on pushes to `main`.

## Important Worktree Warning

This repository often has unrelated dirty files from older site versions, generated output, local experiments, or user edits.

Before editing or committing:

```bash
git status --short
```

Only stage files that are directly relevant to the current task. Do not clean, reset, delete, or revert unrelated files unless the user explicitly asks.

Typical unrelated paths may include:

- `_site/`
- old `interactiveTree*` or `interactiveMultiTree*` folders
- `.DS_Store`
- local archives such as `astro-site.zip`
- root-level legacy files

## Commands

Run commands from `astro-site` unless noted.

```bash
cd astro-site
npm install
npm run dev
npm run check
npm run build
npm run preview
```

Script meanings:

- `npm run dev`: local dev server on `127.0.0.1`
- `npm run check`: Astro and TypeScript diagnostics
- `npm run build`: production build
- `npm run preview`: preview the production build

Always run `npm run check` after code or data changes. Run `npm run build` before committing layout, routing, or deployment-sensitive changes.

## Do Not Edit Generated Files

Do not edit:

```text
astro-site/dist/
```

The GitHub Actions workflow generates `dist` during deployment.

## Main Source Files

### Content Data

Most content lives in:

```text
astro-site/src/data/site.ts
```

Use this file for:

- header navigation (`navItems`)
- profile data (`profile`)
- research methodology and application areas (`researchFocus`, `applicationAreas`)
- papers and manuscripts (`researchProjects`)
- teaching (`teachingGroups`)
- software (`softwareEntries`)
- footer links (`footerLinks`)

### Pages

```text
astro-site/src/pages/index.astro
```

Homepage. Contains:

- portrait panel
- hero title animation
- bio paragraph
- selected notable contributions
- education timeline
- homepage teaching cards
- selected project cards
- email-copy behavior

```text
astro-site/src/pages/myresearch.astro
```

Research page. Contains:

- page hero
- vertical side navigation
- research introduction
- methodology and application areas

The Research Summary section is intentionally hidden/not present for now.

```text
astro-site/src/pages/publications.astro
```

Papers page. Contains:

- page hero
- topic filters
- status filters
- first-author checkbox
- paper list rendered from `researchProjects`

```text
astro-site/src/pages/myteaching.astro
```

Full teaching page.

```text
astro-site/src/pages/software.astro
```

Software page.

```text
astro-site/src/pages/cv.astro
```

CV page/link target.

### Components

```text
astro-site/src/components/ProjectCard.astro
```

Paper card component. Important behavior:

- bolds `Monti, F.`
- renders links, topics, status, title, authors, and abstract
- renders inline KaTeX math from `$...$` inside abstract strings

```text
astro-site/src/components/CitationPreview.astro
```

Homepage citation hover preview. Important behavior:

- finds a paper by exact `title`
- links to the corresponding anchor on `/publications/`
- falls back to `/publications/` if no match exists

```text
astro-site/src/components/SiteHeader.astro
```

Header, nav, search button, theme toggle, and mobile menu.

```text
astro-site/src/components/SearchOverlay.astro
```

Search overlay UI and client-side search behavior.

```text
astro-site/src/components/PageSideNav.astro
```

Vertical page-local navigation.

```text
astro-site/src/components/ContentCard.astro
```

General card component.

```text
astro-site/src/components/GravityMap.astro
```

Interactive gravity map component. It exists, but the Research Summary section is currently hidden/not mounted.

### Layout and Libraries

```text
astro-site/src/layouts/BaseLayout.astro
```

Global wrapper. It:

- imports `global.css`
- imports KaTeX CSS
- initializes dark/light theme before page render
- includes `SiteHeader`
- includes `SearchOverlay`
- includes the footer

```text
astro-site/src/lib/contentIndex.ts
```

Builds search entries from navigation, papers, teaching, and software data.

### Presentation Slides

CGSI and related HTML presentation decks live under:

```text
astro-site/src/pages/talks/
```

For the CGSI deck, the main source is:

```text
astro-site/src/pages/talks/cgsi/index.mdx
```

Global presentation styling is in:

```text
astro-site/src/styles/presentation.css
```

Some slide-specific styles may be embedded directly in the MDX file inside a
slide-scoped `<style>` block. This is intentional when the user wants a
one-slide layout to be easy to tune without switching between MDX and CSS.

#### Aligning Figure Edges in Presentation Slides

When the user asks to align the bottom, top, left, or right edges of two figures
in a slide, first determine whether they mean the raw image element boxes or the
visible plotted/content areas. Scientific figures often have white padding,
axis labels, legends, or transparent/blank margins, so two `<img>` bounding
boxes can be perfectly aligned while the visible plots still look misaligned.

Recommended workflow:

1. Edit only the slide-local selector or existing presentation selector that
   controls the figure position, usually a `transform: translate(...)`,
   `margin`, `width`, or grid/flex alignment rule.
2. Run `npm run build` from `astro-site`.
3. Preview the built deck and capture the target slide at a fixed viewport, for
   example `1600x900`.
4. If the user asked for raw element alignment, compare
   `getBoundingClientRect()` values for the two target `<img>` elements.
5. If the visual result still looks off, inspect a screenshot or image-content
   bounds and align the visible plotting/content edges instead of the raw DOM
   boxes.
6. Iterate with a fresh preview load or cache-busting reload. Reveal can scale
   slides, so do not assume that `1rem` in authored CSS corresponds to exactly
   `16px` on the screenshot.
7. Stop any temporary preview/browser processes before finishing.

For example, on the CGSI Ancient Musk Ox slide the raw image bottoms aligned,
but the right tree PNG had extra blank canvas. The correct-looking fix was to
move the covariate figure upward until the visible plotted bottoms matched,
leaving the CSS at `transform: translate(5.2rem, -2.1rem);` for
`#ancient-musk-ox-example .musk-ox-covariate-figure img`.

### Styling

```text
astro-site/src/styles/global.css
```

All styling lives here. There is no component-scoped CSS pattern right now.

Important style regions:

- CSS variables: top of file
- dark theme variables: `html[data-theme="dark"]`
- header: `.site-header`, `.header-inner`, `.desktop-nav`, `.header-actions`
- hero: `.hero-section`, `.hero-grid`, `.portrait-panel`, `.hero-title`
- email button: `.email-pill`
- citation previews: `.citation-preview-*`
- education timeline: `.education-timeline`, `.education-item`, `.education-logo`
- homepage teaching: `.home-teaching-card`, `.teaching-plus-link`
- paper cards: `.project-card`, `.project-meta`, `.status-pill`, `.tag-list`
- paper filters: `.paper-filters`, `.paper-filter-button`
- research side nav: `.page-side-nav`, `.research-page-layout`

## Content Editing Recipes

### Add or Update a Paper

Edit `researchProjects` in `astro-site/src/data/site.ts`.

Expected object shape:

```ts
{
  title: "Paper title",
  authors: "Monti, F., and Suchard, M. A.",
  year: "2026",
  status: "Under review",
  links: [
    { label: "arXiv", href: "https://arxiv.org/abs/..." },
    { label: "Code", href: "https://github.com/..." }
  ],
  topics: ["CTMCs", "Adjoint methods"],
  abstract: [
    "Paragraph one.",
    "Paragraph two with $O(K^3 + NK^2)$ inline math."
  ]
}
```

Rules:

- Keep author strings consistent, usually `"Monti, F."`.
- The first-author filter checks whether the author string starts with `"Monti, F."`.
- Topics and statuses automatically become filter buttons.
- Use single-dollar inline math in abstracts.
- Do not put raw HTML in abstract strings unless you also update `ProjectCard.astro` deliberately.

### Add a Homepage Citation Preview

In `astro-site/src/pages/index.astro`, use:

```astro
<CitationPreview label="Monti et al., 2026" title="Exact paper title" />
```

The `title` must exactly match a `researchProjects` title.

### Change Notable Contributions

Edit:

```text
astro-site/src/pages/index.astro
```

Look for:

```astro
<div class="notable-contributions">
```

Keep citation previews on exact paper-title matches.

### Change the Homepage Hero Rotation

Edit `heroTitles` near the bottom of:

```text
astro-site/src/pages/index.astro
```

Each title is an ordered list of lines:

```ts
{
  lines: [
    { text: "Scalable inference for", tone: "ink" },
    { text: "continuous-time Markov", tone: "blue" },
    { text: "processes.", tone: "blue" }
  ]
}
```

The current interval is:

```ts
}, 10000);
```

The CSS that prevents page layout movement is:

```text
.hero-title
.hero-title-slide
.hero-title-line
```

in `astro-site/src/styles/global.css`.

### Change Education Timeline Text

Edit:

```text
astro-site/src/pages/index.astro
```

Look for:

```astro
<ol class="education-timeline">
```

Timeline connector geometry is in `global.css` under `.education-timeline` and `.education-item`.

### Change Education Logos

Logos are under:

```text
astro-site/public/assets/img/logos/education/
```

Use root-relative paths in Astro:

```astro
<img src="/assets/img/logos/education/UCLA-logo.png" alt="" />
```

### Change Homepage Teaching Cards

The homepage chooses:

- first entry from the group whose `role` is `"Teaching Assistant"`
- first entry from the first group whose `role` is not `"Teaching Assistant"`

This logic is at the top of `astro-site/src/pages/index.astro`.

The content comes from `teachingGroups` in `astro-site/src/data/site.ts`.

### Change Header Navigation

Edit `navItems` in:

```text
astro-site/src/data/site.ts
```

For visual spacing or typography, edit:

```text
.desktop-nav
.header-actions
.brand
```

in `astro-site/src/styles/global.css`.

### Change Search

Search entries are generated in:

```text
astro-site/src/lib/contentIndex.ts
```

Search UI and behavior are in:

```text
astro-site/src/components/SearchOverlay.astro
```

### Add Images

Place images under:

```text
astro-site/public/assets/img/
```

Reference them as:

```text
/assets/img/file-name.png
```

For logos, prefer:

```text
astro-site/public/assets/img/logos/
```

### Update the CV

Replace:

```text
astro-site/public/assets/cv/FilippoMonti_CV.pdf
```

The site already links to:

```text
/assets/cv/FilippoMonti_CV.pdf
```

## Design Constraints and Local Style

Respect the current visual language:

- blue/gold palette
- quiet academic layout
- rounded corners of about `8px` except circles/pills
- cards are used for repeated content, not for every section
- header should stay compact
- dark mode should use the same hierarchy as light mode
- avoid introducing unrelated color palettes
- avoid changing global typography without checking every page

For CSS changes:

- Prefer updating existing selectors.
- Keep responsive behavior in mind.
- Check both light and dark modes when changing colors.
- Avoid layout shifts, especially in the homepage hero.

## Hidden or Deferred Features

The user has asked to hide or defer these for now:

- News/posts in primary navigation
- Research Summary section
- Model gravity map text/section on Research unless explicitly restored

Do not reintroduce them unless the user asks.

## Verification Checklist

At minimum:

```bash
cd astro-site
npm run check
```

For deployable changes:

```bash
cd astro-site
npm run build
```

Manual pages to inspect when relevant:

- `/`
- `/myresearch/`
- `/publications/`
- `/myteaching/`
- `/software/`
- `/cv/`

Manual interactions to inspect when relevant:

- header nav spacing
- dark/light theme toggle
- `?` search button
- search overlay
- homepage email button
- hero title transition
- citation hover previews
- paper filters
- teaching card hover states
- mobile menu

## Commit and Push Guidance

Only commit when the user asks.

Before committing:

```bash
git status --short
git diff -- astro-site
cd astro-site
npm run check
npm run build
```

Stage only intended files, for example:

```bash
git add astro-site/src/data/site.ts astro-site/src/styles/global.css
```

Check staged files:

```bash
git diff --cached --name-status
git diff --cached --check
```

Then commit and push:

```bash
git commit -m "Describe the website change"
git push
```

After pushing, GitHub Actions deploys automatically.

## Common Pitfalls

- Do not edit `astro-site/dist`.
- Do not stage unrelated dirty files.
- Do not assume root-level old site files are active.
- Do not rename routes casually; existing links use `/myresearch/`, `/myteaching/`, `/publications/`, `/software/`, and `/cv/`.
- Do not change a paper title without checking homepage `CitationPreview` title matches.
- Do not change author formatting without checking the `Monti, F.` highlighting and first-author filter.
- Do not add a new paper topic/status with accidental spelling variants unless a new filter button is desired.
- Do not forget that assets in `public` are referenced from the site root.
