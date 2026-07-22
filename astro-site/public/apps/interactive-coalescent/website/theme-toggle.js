(() => {
  const root = document.documentElement;
  const storageKey = "beastx-theme";

  function currentTheme() {
    return root.getAttribute("data-theme") || "dark";
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const next = theme === "dark" ? "Light" : "Dark";
      button.setAttribute("aria-label", `Switch to ${next} mode`);
      button.setAttribute("title", `Switch to ${next} mode`);
      button.textContent = theme === "dark" ? "Light" : "Dark";
    });
  }

  const stored = window.localStorage.getItem(storageKey);
  if (stored === "dark" || stored === "light") {
    applyTheme(stored);
  } else if (!root.hasAttribute("data-theme")) {
    applyTheme("dark");
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-theme-toggle]");
    if (!button) return;
    const next = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    window.localStorage.setItem(storageKey, next);
  });

  const topnav = document.querySelector(".topnav");
  if (!topnav) return;

  if (!document.getElementById("beastx-search-inline-style")) {
    const style = document.createElement("style");
    style.id = "beastx-search-inline-style";
    style.textContent = `
      body.site-search-open { overflow: hidden; }
      .site-search-overlay {
        position: fixed; inset: 0; z-index: 60;
        display: flex; justify-content: center; align-items: flex-start;
        padding: 86px 16px 24px; background: rgba(6,10,16,.72);
      }
      .site-search-overlay[hidden] { display: none !important; }
      .site-search-dialog {
        width: min(760px, 100%);
        background: var(--surface, #111827);
        border: 1px solid var(--line, rgba(255,255,255,.14));
        border-radius: 18px; overflow: hidden;
      }
      .site-search-head {
        padding: 10px; border-bottom: 1px solid var(--line, rgba(255,255,255,.12));
        display: flex; align-items: center; gap: 8px;
      }
      .site-search-input {
        flex: 1; border-radius: 12px; border: 1px solid var(--line, rgba(255,255,255,.16));
        padding: 12px 14px; font-size: 15px;
        background: color-mix(in srgb, var(--surface-2, #1f2937) 90%, var(--bg, #0b1020));
        color: var(--head, #f8fafc);
      }
      .site-search-help {
        padding: 10px 14px; border-bottom: 1px solid var(--line, rgba(255,255,255,.12));
        display: flex; justify-content: space-between; gap: 10px;
        font-size: 12px; color: var(--muted, #94a3b8);
      }
      .site-search-results {
        list-style: none; margin: 0; padding: 8px;
        display: grid; gap: 6px; max-height: min(62vh, 480px); overflow: auto;
      }
      .site-search-link {
        display: grid; gap: 4px; padding: 10px 12px;
        border-radius: 12px; border: 1px solid transparent;
        background: color-mix(in srgb, var(--white, #e5e7eb) 2%, var(--surface-2, #1f2937));
      }
      .site-search-link.active, .site-search-link:hover {
        border-color: color-mix(in srgb, var(--accent, #14b8a6) 38%, transparent);
      }
      .site-search-title { color: var(--head, #f8fafc); font-size: 15px; font-weight: 600; }
      .site-search-meta { color: var(--muted, #94a3b8); font-size: 12px; }
      .site-search-empty {
        border-radius: 12px; padding: 14px; text-align: center;
        color: var(--muted, #94a3b8);
      }
      .search-fab {
        position: fixed; right: 14px; bottom: 16px; z-index: 45;
        display: none; border-radius: 999px; padding: 10px 14px;
      }
      @media (max-width: 720px) {
        .site-search-overlay { padding-top: 72px; }
        .search-fab { display: inline-flex; align-items: center; }
      }
    `;
    document.head.appendChild(style);
  }

  const isApplePlatform = /(Mac|iPhone|iPad|iPod)/i.test(
    `${navigator.platform} ${navigator.userAgent}`
  );
  const shortcutLabel = isApplePlatform ? "Cmd+K" : "Ctrl+K";
  const shortcutKeycap = isApplePlatform ? "⌘K" : "Ctrl+K";
  const themeScriptNode = Array.from(document.scripts).find((node) =>
    /theme-toggle\.js/i.test(node.src || "")
  );
  const scriptPathname = themeScriptNode
    ? new URL(themeScriptNode.src, window.location.href).pathname
    : "";
  const docsRootPath = scriptPathname
    ? scriptPathname.replace(/theme-toggle\.js(?:\?.*)?$/i, "")
    : "/website/";
  const siteRootPath = docsRootPath.endsWith("website/")
    ? docsRootPath.slice(0, -("website/".length))
    : docsRootPath;
  const inDocsDirectory = window.location.pathname.startsWith(docsRootPath);

  const staticEntries = [
    {
      title: "Homepage",
      section: "Start here",
      docsPath: "homepage.html",
      keywords: ["home", "overview", "install", "workflow"],
      featured: true
    },
    {
      title: "R Commands Hub",
      section: "Documentation",
      docsPath: "index.html",
      keywords: ["commands", "constructors", "arguments"],
      featured: true
    },
    {
      title: "Models Tutorial",
      section: "Documentation",
      docsPath: "models-tutorials.html",
      keywords: ["models", "tutorial", "guides"],
      featured: true
    },
    {
      title: "Model Registry",
      section: "Architecture",
      docsPath: "model-registry.html",
      keywords: ["registry", "catalog", "models", "workflows", "python", "r"],
      featured: true
    },
    {
      title: "Workshop Hub",
      section: "Documentation",
      docsPath: "workshops.html",
      keywords: ["workshops", "walkthroughs", "examples"],
      featured: true
    },
    {
      title: "Examples & Case Studies",
      section: "Case Studies (Secondary)",
      docsPath: "papers.html",
      keywords: ["examples", "case studies", "manuscript", "non parametric coalescent", "skygrid_gp"],
      featured: false
    },
    {
      title: "Yellow Fever skygrid_gp Example",
      section: "Case Studies (Secondary)",
      docsPath: "papers/skygrid-gp-yellow-fever.html",
      keywords: ["yellow fever", "yfv", "skygrid_gp", "skygrid_gp_covariates", "non parametric coalescent", "temperature"],
      featured: false
    },
    {
      title: "Data Handling Features",
      section: "R Commands",
      docsPath: "r-commands/data-handling-features.html",
      keywords: ["alignment", "partition", "traits", "dates"]
    },
    {
      title: "Validate, Run, Diagnose, Visualize",
      section: "R Commands",
      docsPath: "r-commands/validate-run-diagnose-visualize.html",
      keywords: ["validation", "execution", "posterior", "plots"]
    },
    {
      title: "Tree Priors And Demographic Models",
      section: "Model Family",
      docsPath: "models/tree-priors-and-demographic-models.html",
      keywords: ["coalescent", "skyline", "skyride", "skygrid"]
    },
    {
      title: "Clock Models",
      section: "Model Family",
      docsPath: "models/clock-models.html",
      keywords: ["strict", "relaxed", "local clock"]
    },
    {
      title: "Nucleotide Substitution",
      section: "Model Family",
      docsPath: "models/nucleotide-substitution.html",
      keywords: ["jc69", "hky", "gtr", "tn93"]
    },
    {
      title: "Amino-acid And Binary",
      section: "Model Family",
      docsPath: "models/amino-acid-and-binary.html",
      keywords: ["protein", "binary", "covarion", "dollo"]
    },
    {
      title: "Discrete Trait Models",
      section: "Model Family",
      docsPath: "models/discrete-trait-models.html",
      keywords: ["ctmc", "bssvs", "glm", "trait"]
    },
    {
      title: "Continuous Trait Models",
      section: "Model Family",
      docsPath: "models/continuous-trait-models.html",
      keywords: ["brownian", "ou", "drift", "rrw"]
    },
    {
      title: "Dependencies Between Traits",
      section: "Model Family",
      docsPath: "models/dependencies-between-traits.html",
      keywords: ["dependent", "correlated", "traits"]
    },
    {
      title: "Phylodynamic Inference Of Respiratory Viruses",
      section: "Workshop",
      docsPath: "workshops/phylodynamic-inference-of-respiratory-viruses.html",
      keywords: ["epidemic", "growth", "skyline"]
    },
    {
      title: "Phylogeographic Diffusion In Discrete Space",
      section: "Workshop",
      docsPath: "workshops/phylogeographic-diffusion-discrete-space.html",
      keywords: ["phylogeography", "diffusion", "discrete space", "bssvs"]
    },
    {
      title: "Interactive Coalescent Simulator",
      section: "Interactive Mathematics",
      docsPath: "../../interactiveCoalescentTimeVaryingPopulation.html",
      rootPath: "interactiveCoalescentTimeVaryingPopulation.html",
      keywords: ["simulation", "coalescent", "time-varying population"],
      featured: true
    },
    {
      title: "Interactive Multi-Tree CTMC Explorer",
      section: "Interactive Mathematics",
      docsPath: "../../interactiveMultiTree_frontend_ctmc/",
      rootPath: "interactiveMultiTree_frontend_ctmc/",
      keywords: ["simulation", "ctmc", "phylogeography", "host transmission", "custom substitution"],
      featured: true
    }
  ];

  const functionKeywordsByPath = {
    "amino-acid-and-binary.html": ["binary_covarion", "binary_simple", "empirical_amino_acid"],
    "clock-models.html": ["clock_clade", "fixed", "fixed_local_clock", "random_local_clock", "relaxed_exponential_clock", "relaxed_gamma_clock", "relaxed_lognormal_clock", "strict_clock", "taxon_set"],
    "continuous-trait-models.html": ["continuous_brownian", "continuous_cauchy_rrw", "continuous_drift", "continuous_gamma_rrw", "continuous_lognormal_rrw", "continuous_ou"],
    "data-handling-features.html": ["all_tip_dates", "continuous_trait", "discrete_trait", "estimated", "fixed", "guess_tip_dates_from_fields", "guess_tip_dates_from_taxa", "hky", "missing_tip_dates", "read_alignment", "read_continuous_trait", "read_discrete_trait", "read_tip_dates", "sequence_partition", "set_tip_date_precision", "taxa_matching", "taxon_set", "tip_date_normal", "tip_date_plan", "tip_date_rule", "tip_date_sampling", "tip_date_uniform", "tip_dates_for_alignment", "uncertain_tip_dates"],
    "discrete-trait-models.html": ["discrete_asymmetric_bssvs", "discrete_asymmetric_ctmc", "discrete_glm_substitution_model", "discrete_lograte_gp_substitution_model", "discrete_symmetric_bssvs", "discrete_symmetric_ctmc", "discrete_trait"],
    "index.html": ["dated_nucleotide_analysis", "discrete_phylogeography_analysis"],
    "hky.html": ["beastx_spec", "coalescent_constant", "hky", "kappa", "strict_clock"],
    "strict-clock.html": ["beastx_spec", "coalescent_constant", "hky", "rate", "strict_clock"],
    "model-registry.html": ["registry", "supported_models", "supported_workflows", "workflow_guides", "constructor_python"],
    "nucleotide-substitution.html": ["codon_model", "codon_position_partitions", "dnds_robust_counting", "general_asymmetric_nucleotide", "general_symmetric_nucleotide", "gtr", "hky", "jc69", "k2p", "k80", "nucleotide_model_averaging", "srd06_model", "srd06_partitions", "tn93", "yang96_model", "yang96_partitions"],
    "skygrid-gp-yellow-fever.html": ["coalescent", "covariate", "gaussian_process", "gp", "nonparametric", "skygrid_gp", "skygrid_gp_covariates", "temperature", "yellow_fever"],
    "papers.html": ["case_study", "examples", "nonparametric", "manuscript", "skygrid_gp"],
    "phylodynamic-inference-of-respiratory-viruses.html": ["bayesian_skyline", "coalescent_exponential", "demographic_summary", "hky", "mcmc_control", "plot_bayesian_skyline", "read_alignment", "relaxed_lognormal_clock", "strict_clock"],
    "phylogeographic-diffusion-discrete-space.html": ["beastx_trait_parameter_names", "coalescent_constant", "discrete_glm_substitution_model", "discrete_symmetric_bssvs", "hky", "mcc_tree", "plot_trait_diagnostics", "read_alignment", "read_discrete_trait", "strict_clock", "tip_date_sampling", "tip_date_uniform", "trait_posterior_samples", "trait_trace_summary"],
    "tree-priors-and-demographic-models.html": ["bayesian_skyline", "birth_death", "birth_death_incomplete_sampling", "birth_death_serial_sampling", "calibrated_yule", "coalescent_constant", "coalescent_exponential", "coalescent_expansion", "coalescent_logistic", "skygrid", "skygrid_gp_covariates", "skygrid_hmc", "skygrid_linear_covariates", "skyride", "taxon_set", "tip_date_normal", "tip_date_uniform", "tmrca_prior", "yule"],
    "validate-run-diagnose-visualize.html": ["beastx_export_xml", "beastx_ggtree", "beastx_plot_overview", "beastx_postprocess_report", "beastx_preflight", "beastx_render_plot_collection", "beastx_run", "demographic_summary", "mcc_tree", "plot_skygrid", "posterior_samples", "trace_summary", "trees"]
  };

  function normalize(value) {
    return (value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function basenameFromPath(value) {
    if (!value || value.startsWith("#") || /^[a-z]+:/i.test(value)) return "";
    const cleaned = value.split("#")[0].split("?")[0];
    const parts = cleaned.split("/");
    return parts[parts.length - 1] || "";
  }

  function slugify(text) {
    return normalize(text).replace(/\s+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
  }

  function resolveHref(entry) {
    const docsPath = entry.docsPath || "";
    if (docsPath.startsWith("#") || /^[a-z]+:/i.test(docsPath)) return docsPath;
    if (inDocsDirectory) return `${docsRootPath}${docsPath}`;
    if (entry.rootPath) return `${siteRootPath}${entry.rootPath}`;
    return `${siteRootPath}website/${docsPath}`;
  }

  function registryJsonHref() {
    if (inDocsDirectory) return `${docsRootPath}data/model-registry.json`;
    return `${siteRootPath}website/data/model-registry.json`;
  }

  function canonicalModelEntriesFromRegistry(payload) {
    const pages = Array.isArray(payload?.model_pages) ? payload.model_pages : [];
    return pages
      .map((row) => {
        const pageFile = String(row.page_file || "").trim();
        const title = String(row.title || "").trim();
        const shortDescription = String(row.short_description || "").trim();
        const category = String(row.category || "").trim();
        const modelId = String(row.model_id || "").trim();
        if (!pageFile || !title || !modelId) return null;

        const pageKey = basenameFromPath(pageFile);
        const functionKeywords = functionKeywordsByPath[pageKey] || [];
        const apiKeywords = String(row.api_refs_python || "")
          .split(/[;|]/)
          .map((token) => token.replace(/\(\)$/, "").trim())
          .filter(Boolean);

        return {
          title,
          section: "Canonical Models",
          docsPath: pageFile,
          keywords: [
            modelId,
            category,
            "model page",
            "theory",
            "code",
            "examples",
            "api",
            shortDescription,
            ...functionKeywords,
            ...apiKeywords
          ],
          featured: true
        };
      })
      .filter(Boolean);
  }

  function collectCurrentPageEntries() {
    const pageLabel = document.title.replace(/\s+\|\s+beastx$/i, "").trim();
    const usedIds = new Set(
      Array.from(document.querySelectorAll("[id]")).map((node) => node.id)
    );
    const slugCounts = Object.create(null);
    const headings = Array.from(
      document.querySelectorAll("h1, h2, h3")
    ).filter((node) => !node.closest(".topbar"));

    return headings
      .map((node) => {
        const text = (node.textContent || "").trim();
        if (!text) return null;

        if (!node.id) {
          const base = slugify(text) || "section";
          const nextCount = (slugCounts[base] || 0) + 1;
          slugCounts[base] = nextCount;
          let candidate = nextCount === 1 ? base : `${base}-${nextCount}`;
          while (usedIds.has(candidate)) {
            const bumped = (slugCounts[base] || 0) + 1;
            slugCounts[base] = bumped;
            candidate = `${base}-${bumped}`;
          }
          node.id = candidate;
          usedIds.add(candidate);
        }

        return {
          title: text,
          section: `On this page - ${pageLabel}`,
          docsPath: `#${node.id}`,
          keywords: [pageLabel, "section", "anchor"],
          featured: false
        };
      })
      .filter(Boolean);
  }

  function resolveEntrySeed(entry) {
    const pageKey = basenameFromPath(entry.docsPath) || basenameFromPath(entry.rootPath);
    const functionKeywords = functionKeywordsByPath[pageKey] || [];
    return {
      title: entry.title,
      section: entry.section,
      href: resolveHref(entry),
      keywords: (entry.keywords || []).concat(functionKeywords),
      featured: !!entry.featured
    };
  }

  function buildIndexedEntries(entrySeeds) {
    const initialEntries = entrySeeds
      .map(resolveEntrySeed)
      .concat(
        collectCurrentPageEntries().map((entry) => ({
          title: entry.title,
          section: entry.section,
          href: resolveHref(entry),
          keywords: entry.keywords || [],
          featured: false
        }))
      );

    const seen = new Set();
    return initialEntries
      .filter((entry) => entry.title && entry.href)
      .filter((entry) => {
        const key = `${entry.href}::${normalize(entry.title)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((entry) => {
        const title = normalize(entry.title);
        const section = normalize(entry.section);
        const keywords = normalize((entry.keywords || []).join(" "));
        return {
          ...entry,
          _title: title,
          _section: section,
          _keywords: keywords,
          _haystack: `${title} ${section} ${keywords}`.trim()
        };
      });
  }

  let indexedEntries = buildIndexedEntries(staticEntries);
  if (indexedEntries.length === 0) return;
  let searchSeedEntries = staticEntries.slice();
  let featuredEntries = indexedEntries.filter((entry) => entry.featured);
  let defaultEntries = indexedEntries.slice(0, 12);

  const desktopTrigger = document.createElement("button");
  desktopTrigger.type = "button";
  desktopTrigger.className = "search-toggle";
  desktopTrigger.setAttribute("aria-label", `Open quick search (${shortcutLabel})`);
  desktopTrigger.setAttribute("title", `Quick search (${shortcutLabel})`);
  desktopTrigger.innerHTML = `<span>Search</span><kbd>${shortcutKeycap}</kbd>`;

  const themeToggleButton = topnav.querySelector("[data-theme-toggle]");
  if (themeToggleButton) {
    topnav.insertBefore(desktopTrigger, themeToggleButton);
  } else {
    topnav.appendChild(desktopTrigger);
  }

  const mobileTrigger = document.createElement("button");
  mobileTrigger.type = "button";
  mobileTrigger.className = "search-fab";
  mobileTrigger.setAttribute("aria-label", "Open quick search");
  mobileTrigger.setAttribute("title", `Quick search (${shortcutLabel})`);
  mobileTrigger.innerHTML = `<span>Search</span>`;
  document.body.appendChild(mobileTrigger);

  const overlay = document.createElement("div");
  overlay.className = "site-search-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="site-search-dialog" role="dialog" aria-modal="true" aria-label="Quick search">
      <div class="site-search-head">
        <input
          id="siteSearchInput"
          class="site-search-input"
          type="search"
          autocomplete="off"
          spellcheck="false"
          placeholder="Search tutorials, model families, and workshops..."
          aria-label="Search tutorials and pages"
        />
        <button type="button" class="site-search-close" data-site-search-close>Esc</button>
      </div>
      <div class="site-search-help">
        <span id="siteSearchMeta">Type to search. Press Enter to open.</span>
        <span class="site-search-shortcut">${shortcutLabel}</span>
      </div>
      <ul id="siteSearchResults" class="site-search-results" role="listbox"></ul>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector("#siteSearchInput");
  const results = overlay.querySelector("#siteSearchResults");
  const closeButton = overlay.querySelector("[data-site-search-close]");
  const meta = overlay.querySelector("#siteSearchMeta");

  if (!input || !results || !closeButton || !meta) {
    console.error("[beastx quick-search] search UI mount failed");
    return;
  }

  let activeIndex = -1;
  let visibleResults = [];
  let lastFocusedElement = null;

  function refreshSearchIndex(extraEntries) {
    searchSeedEntries = staticEntries.concat(extraEntries || []);
    indexedEntries = buildIndexedEntries(searchSeedEntries);
    featuredEntries = indexedEntries.filter((entry) => entry.featured);
    defaultEntries = indexedEntries.slice(0, 12);
    if (!overlay.hidden) {
      renderResults(input.value || "");
    }
  }

  function scoreEntry(entry, terms) {
    let score = 0;
    for (const term of terms) {
      if (!entry._haystack.includes(term)) return -1;
      if (entry._title.startsWith(term)) {
        score += 18;
      } else if (entry._title.includes(term)) {
        score += 12;
      } else if (entry._keywords.includes(term)) {
        score += 11;
        if (entry.section === "Model Family") score += 3;
        if (entry.section === "Workshop") score += 1;
      } else if (entry._section.includes(term)) {
        score += 7;
      } else {
        score += 5;
      }
    }
    if (entry.featured) score += 2;
    return score;
  }

  function rank(query) {
    const cleaned = normalize(query);
    if (!cleaned) {
      if (featuredEntries.length > 0) return featuredEntries.slice(0, 10);
      return defaultEntries.slice(0, 10);
    }

    const terms = cleaned.split(" ").filter(Boolean);
    return indexedEntries
      .map((entry) => ({ entry, score: scoreEntry(entry, terms) }))
      .filter((hit) => hit.score >= 0)
      .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
      .slice(0, 12)
      .map((hit) => hit.entry);
  }

  function syncActiveResult() {
    const links = Array.from(results.querySelectorAll(".site-search-link"));
    links.forEach((link, index) => {
      const active = index === activeIndex;
      link.classList.toggle("active", active);
      link.setAttribute("aria-selected", active ? "true" : "false");
    });
    if (activeIndex >= 0 && links[activeIndex]) {
      links[activeIndex].scrollIntoView({ block: "nearest" });
    }
  }

  function renderResults(query) {
    try {
      try {
        visibleResults = rank(query);
      } catch (error) {
        console.error("[beastx quick-search] ranking failed; falling back to defaults", error);
        visibleResults = [];
      }

      if (visibleResults.length === 0 && !normalize(query)) {
        visibleResults = featuredEntries.length > 0
          ? featuredEntries.slice(0, 10)
          : defaultEntries.slice(0, 10);
      }

      results.innerHTML = "";

      if (visibleResults.length === 0) {
        activeIndex = -1;
        const empty = document.createElement("li");
        empty.className = "site-search-empty";
        empty.textContent = normalize(query)
          ? "No matches yet. Try a broader term like 'clock' or 'coalescent'."
          : "Search index is empty on this page. Use a query to search all linked pages.";
        results.appendChild(empty);
        meta.textContent = "No matching pages";
        return;
      }

      visibleResults.forEach((entry, index) => {
        const item = document.createElement("li");
        item.className = "site-search-item";

        const link = document.createElement("a");
        link.className = "site-search-link";
        link.href = entry.href;
        link.dataset.resultIndex = String(index);
        link.setAttribute("role", "option");
        link.setAttribute("aria-selected", "false");

        const title = document.createElement("span");
        title.className = "site-search-title";
        title.textContent = entry.title;

        const details = document.createElement("span");
        details.className = "site-search-meta";
        details.textContent = entry.section;

        link.appendChild(title);
        link.appendChild(details);
        item.appendChild(link);
        results.appendChild(item);
      });

      activeIndex = 0;
      meta.textContent = `${visibleResults.length} result${visibleResults.length === 1 ? "" : "s"}`;
      syncActiveResult();
    } catch (error) {
      console.error("[beastx quick-search] render failed; using minimal fallback", error);
      visibleResults = featuredEntries.length > 0
        ? featuredEntries.slice(0, 10)
        : defaultEntries.slice(0, 10);
      results.innerHTML = "";

      if (visibleResults.length === 0) {
        activeIndex = -1;
        const empty = document.createElement("li");
        empty.className = "site-search-empty";
        empty.textContent = "Quick search is temporarily unavailable on this page.";
        results.appendChild(empty);
        meta.textContent = "No matching pages";
        return;
      }

      visibleResults.forEach((entry, index) => {
        const item = document.createElement("li");
        item.className = "site-search-item";

        const link = document.createElement("a");
        link.className = "site-search-link";
        link.href = entry.href;
        link.dataset.resultIndex = String(index);
        link.setAttribute("role", "option");
        link.setAttribute("aria-selected", "false");
        link.textContent = `${entry.title} - ${entry.section}`;

        item.appendChild(link);
        results.appendChild(item);
      });

      activeIndex = 0;
      meta.textContent = `${visibleResults.length} result${visibleResults.length === 1 ? "" : "s"}`;
      syncActiveResult();
    }
  }

  async function loadRegistryCanonicalEntries() {
    try {
      const response = await fetch(registryJsonHref(), { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      const canonicalEntries = canonicalModelEntriesFromRegistry(payload);
      refreshSearchIndex(canonicalEntries);
    } catch (error) {
      console.warn("[beastx quick-search] canonical model registry load skipped", error);
    }
  }

  function openSearch(trigger) {
    if (!overlay.hidden) return;
    lastFocusedElement = trigger || document.activeElement;
    overlay.hidden = false;
    document.body.classList.add("site-search-open");
    input.value = "";
    renderResults("");
    input.focus();
    input.select();
  }

  function closeSearch() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    document.body.classList.remove("site-search-open");
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  function activateCurrentResult() {
    if (activeIndex < 0 || !visibleResults[activeIndex]) return;
    const targetHref = visibleResults[activeIndex].href;
    closeSearch();
    if (targetHref.startsWith("#")) {
      if (window.location.hash === targetHref) {
        const targetNode = document.getElementById(targetHref.slice(1));
        if (targetNode) {
          targetNode.scrollIntoView({ block: "start", behavior: "smooth" });
        }
      } else {
        window.location.hash = targetHref;
      }
      return;
    }
    window.location.href = targetHref;
  }

  loadRegistryCanonicalEntries();

  desktopTrigger.addEventListener("click", () => openSearch(desktopTrigger));
  mobileTrigger.addEventListener("click", () => openSearch(mobileTrigger));
  closeButton.addEventListener("click", closeSearch);

  overlay.addEventListener("mousedown", (event) => {
    if (event.target === overlay) closeSearch();
  });

  input.addEventListener("input", () => {
    renderResults(input.value);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!visibleResults.length) return;
      activeIndex = (activeIndex + 1) % visibleResults.length;
      syncActiveResult();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!visibleResults.length) return;
      activeIndex = (activeIndex - 1 + visibleResults.length) % visibleResults.length;
      syncActiveResult();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      activateCurrentResult();
    }
  });

  results.addEventListener("mouseover", (event) => {
    const link = event.target.closest(".site-search-link");
    if (!link) return;
    const index = Number(link.dataset.resultIndex);
    if (Number.isNaN(index)) return;
    activeIndex = index;
    syncActiveResult();
  });

  results.addEventListener("click", (event) => {
    const link = event.target.closest(".site-search-link");
    if (!link) return;
    closeSearch();
  });

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openSearch(document.activeElement);
      return;
    }
    if (event.key === "Escape" && !overlay.hidden) {
      event.preventDefault();
      closeSearch();
    }
  });
})();
