// Main application module (ES module)
// This file wraps the original monolithic inline script into an explicit init function.
// Next step (optional): further split into submodules (tree geometry, RNG, renderers, UI).

export default function initApp() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');


    // Nucleotide colors
    const colors = {
        'A': '#e74c3c',
        'T': '#3498db',
        'G': '#f39c12',
        'C': '#27ae60'
    };

    const nucleotides = ['A', 'T', 'G', 'C'];

    // -------------------------------------------
    // PARAMETRIC TREE GEOMETRY (NEW)
    // -------------------------------------------

    // Edit these to change tree location + tightness of angles
    const TREE_PARAMS = {
        rootX: 500,
        rootY: 100,

        // Horizontal translation (negative = move left). 1cm ≈ 38 pixels
        horizontalShift: -38,

        // Vertical translation applied to ALL nodes (positive = move down, negative = move up)
        // 0.3cm upward = -0.3 * 96/2.54 ≈ -11.34 pixels
        verticalShift: -11.34,

        // Branch lengths (pixels)
        L_root_to_internal: 300,   // Root -> internal
        L_internal_to_tips: 250,   // Internal -> Tip1 / Tip2
        L_root_to_tip3: 557.029,       // Root -> Tip3 (adjusted so Tip3 is horizontally aligned with Tip1/2)

        // "Baseline" half-spreads from the downward direction (radians).
        // (Downward direction is Math.PI/2.)
        baseHalfSpreadRoot: Math.PI / 6,      // ~30° left/right from vertical
        baseHalfSpreadInternal: Math.PI / 8,  // ~22.5° left/right from vertical

        // Tightness factors: multiply the spreads.
        // "Decrease angles ... around 1/3" => multiply by 2/3.
        rootAngleScale: 2 / 3,
        internalAngleScale: 2 / 3,
    };

    // Per-node translation controls (pixels). These are applied AFTER the base geometry is computed.
    // Root: shifts the root (and therefore changes the geometry used to compute downstream nodes).
    // Internal: shifts the internal node only.
    // Tips: shifts all tips (Tip 1/2/3) together.
    const NODE_OFFSETS = {
        root: { x: 0, y: 0 },
        internal: { x: 0, y: 0 },
        tip1: { x: 0, y: 0 },
        tip2: { x: 0, y: 0 },
        tip3: { x: 0, y: 0 },
    };

    // Canvas tree zoom (multiplies branch lengths in buildTree)
    const TREE_VIEW = { zoom: 1.0 };
    const PANEL_VIEW = {
        phylo: { x: 0, y: 0, z: 1.0 },
        geo: { x: 0, y: 0, z: 1.0 },
        host: { x: 0, y: 0, z: 1.0 }
    };


    function polarToXY(x0, y0, L, theta) {
        return { x: x0 + L * Math.cos(theta), y: y0 + L * Math.sin(theta) };
    }

    function buildTree(p) {
        const down = Math.PI / 2;
        const z = TREE_VIEW.zoom;

        const root = {
            id: "root",
            x: p.rootX + p.horizontalShift + NODE_OFFSETS.root.x,
            y: p.rootY + p.verticalShift + NODE_OFFSETS.root.y,
            children: [],
        };

        // Root split: (Root -> Internal) goes down-left, (Root -> Tip3) goes down-right
        const halfRoot = p.baseHalfSpreadRoot * p.rootAngleScale;

        const internalPos = polarToXY(root.x, root.y, p.L_root_to_internal * z, down + halfRoot);
        const tip3Pos = polarToXY(root.x, root.y, p.L_root_to_tip3 * z, down - halfRoot);

        // Keep an unshifted internal reference for computing tip positions.
        const internalBase = { x: internalPos.x, y: internalPos.y };

        const internal = {
            id: "internal",
            x: internalBase.x + NODE_OFFSETS.internal.x,
            y: internalBase.y + NODE_OFFSETS.internal.y,
            children: [],
        };

        const tip3 = {
            id: "tip3",
            x: tip3Pos.x + NODE_OFFSETS.tip3.x,
            y: tip3Pos.y + NODE_OFFSETS.tip3.y,
            children: [],
            label: "Tip 3",
        };

        // Internal split: Tip1 and Tip2 from Internal (symmetric about down direction)
        const halfInternal = p.baseHalfSpreadInternal * p.internalAngleScale;

        const tip1Pos = polarToXY(internalBase.x, internalBase.y, p.L_internal_to_tips * z, down + halfInternal);
        const tip2Pos = polarToXY(internalBase.x, internalBase.y, p.L_internal_to_tips * z, down - halfInternal);

        const tip1 = { id: "tip1", x: tip1Pos.x + NODE_OFFSETS.tip1.x, y: tip1Pos.y + NODE_OFFSETS.tip1.y, children: [], label: "Tip 1" };
        const tip2 = { id: "tip2", x: tip2Pos.x + NODE_OFFSETS.tip2.x, y: tip2Pos.y + NODE_OFFSETS.tip2.y, children: [], label: "Tip 2" };

        internal.children.push(tip1, tip2);
        root.children.push(internal, tip3);

        return root;
    }

    // Use a LET so we can rebuild later
    let tree = buildTree(TREE_PARAMS); // initial build (3 tips)

    // Expose for debugging in console
    window.NODE_OFFSETS = NODE_OFFSETS;

    // Optional helper: rebuild and redraw quickly after tweaking TREE_PARAMS in console
    window.TREE_PARAMS = TREE_PARAMS;
    window.rebuildTree = function rebuildTree() {
        choroplethCache = null;
        tree = buildTree(TREE_PARAMS);
        // Re-init so sequences/branches align with new geometry
        initAnimation();
        // If currently playing, restart animation loop cleanly
        if (isPlaying) {
            if (animationFrame) cancelAnimationFrame(animationFrame);
            animationFrame = requestAnimationFrame(animate);
        } else {
            // If paused, just redraw the static frame
            renderCurrentState();
        }
    };

    // Animation state
    let sequences = [];
    let animationFrame;
    let historyFrameCounter = 0;
    let isPlaying = false;
    let speed = 0.1;
    let mutationRate = 5; // Probability of mutation per frame

    // -----------------------------
    // Branch tracking 
    // -----------------------------
    // Which process to draw on the tree branches: 'none' | 'phylo' | 'geo' | 'host'
    let branchTrackMode = 'phylo';

    // Host-state colors (dominant colors per host icon; tweak as you wish)
    const HOST_STATE_COLORS = {
        0: '#3498db', // Human (blue)
        1: '#6b4f3a', // Monkey (brown)
        2: '#c4c4c4', // Bat (green)
        3: '#f7a9b', // Pig (pink)
        4: '#000000', // Mosquito (yellow)
    };

    // Random geo-state colors (stable within a run; seeded if you use seededRandom())
    // let GEO_STATE_COLORS = null;
    // function initGeoStateColors() {
    //     // geoStates is defined in this file already
    //     GEO_STATE_COLORS = geoStates.map((_, k) => {
    //         // deterministic-ish colors (no dependence on external libs)
    //         const hue = (k * 360 / Math.max(1, geoStates.length)) % 360;
    //         return `hsl(${hue}, 70%, 45%)`;
    //     });
    // }
    let GEO_STATE_COLORS = null;

function initGeoStateColors() {

    GEO_STATE_COLORS = geoStates.map(s => s.color || "#999999");

}

    // Seeded random number generator
    let currentSeed = 42; // Default seed
    let rngState = currentSeed;

    // Linear Congruential Generator for deterministic randomness
    function seededRandom() {
        // LCG parameters (from Numerical Recipes)
        const a = 1664525;
        const c = 1013904223;
        const m = Math.pow(2, 32);

        rngState = (a * rngState + c) % m;
        return rngState / m;
    }

    // Initialize RNG with seed
    function setSeed(seed) {
        currentSeed = seed;
        rngState = seed;
    }

    // CTMC transition tracking
    let ctmcCurrentNucleotide = null;
    let ctmcPreviousNucleotide = null;
    let ctmcTransitionProgress = 1;
    let ctmcTransitionSpeed = 0.1; // Speed of transition animation

    // Highlight tracked nucleotide
    let highlightTrackedNucleotide = true;

    // Phylogeography
    let showPhylogeography = true;
    let showPhylogenetics = true;
    let stickyPaths = false;
    let drawLocations = true;
    let trackAllBranches = true;
    let diffusionRate = 5; // Controls CTMC rate
    let showChoroplethMap = false;

    // Panel visibility (separate from feature being enabled)
    let showPhyloPanel = true;
    let showGeoPanel = true;
    let showHostPanel = true;

    // Host transmission
    let showHostTransmission = true;
    let transmissionRate = 5;
    let trackAllHostBranches = true;

    // Observations mode and Time travel mode
    let observationsMode = false;
    let timeTravelMode = false;
    let timePosition = 1.0; // 0 = root, 1 = tips

    // History tracking for time travel
    let animationHistory = {
        sequences: new Map(), // sequenceId -> [{progress, sequence, x, y, geoState, hostState, ...}, ...]
        initialized: false,
        maxProgress: 0
    };

    // World map GeoJSON data
    let worldLandGeoJSON = null;
    let neCountries = null;
    const silhouetteCache = new Map(); // continentName -> {canvas, w, h}
    // let WORLD_GEOJSON = null;

// async function loadWorldGeoJSON() {
//   if (WORLD_GEOJSON) return WORLD_GEOJSON;
//   const res = await fetch("assets/world-countries.geojson");
//   WORLD_GEOJSON = await res.json();
//   return WORLD_GEOJSON;
// }

// let WORLD_GEOJSON = null;

async function loadWorldGeoJSON() {
    if (WORLD_GEOJSON) return WORLD_GEOJSON;
  
    const res = await fetch("assets/world-countries.geojson");
    const data = await res.json();
  
    let gj = data;
  
    // If you ever switch to TopoJSON later, keep this:
    if (gj && gj.type === "Topology") {
      if (typeof topojson === "undefined") {
        console.warn("TopoJSON detected but topojson library is not loaded.");
        WORLD_GEOJSON = null;
        return null;
      }
      const obj =
        (gj.objects && (gj.objects.countries || gj.objects.ne_110m_admin_0_countries)) ||
        (gj.objects && Object.values(gj.objects)[0]);
  
      WORLD_GEOJSON = topojson.feature(gj, obj);
      return WORLD_GEOJSON;
    }
  
    // Normalize GeoJSON to FeatureCollection
    if (gj && gj.type === "Feature") {
      gj = { type: "FeatureCollection", features: [gj] };
    }
  
    // Final assignment
    WORLD_GEOJSON = gj;
    return WORLD_GEOJSON;
  }

// Equirectangular projection for a small inset map
function projectLonLat(lon, lat, W, H) {
  const x = (lon + 180) / 360 * W;
  const y = (90 - lat) / 180 * H;
  return { x, y };
}
function projectLonLatToRect(lon, lat, x, y, W, H) {
  const px = x + (lon + 180) / 360 * W;
  const py = y + (90 - lat) / 180 * H;
  return { x: px, y: py };
}

function drawCountryPolygonInRect(ctx, coords, x, y, W, H) {
  coords.forEach(ring => {
    ring.forEach((pt, i) => {
      const p = projectLonLatToRect(pt[0], pt[1], x, y, W, H);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
  });
}

function drawCountryMapInRect(ctx, x0, y0, w, h) {
    if (!WORLD_GEOJSON) {
      ctx.fillStyle = "#666";
      ctx.font = '12px "DM Sans"';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Loading colored map.", x0 + w/2, y0 + h/2);
      return;
    }
  
    const feats = (WORLD_GEOJSON.type === "FeatureCollection")
      ? WORLD_GEOJSON.features
      : (Array.isArray(WORLD_GEOJSON.features) ? WORLD_GEOJSON.features : null);
  
    if (!Array.isArray(feats)) {
      // Critical: do NOT throw; just bail out for this frame
      ctx.fillStyle = "#666";
      ctx.font = '12px "DM Sans"';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Colored map not ready.", x0 + w/2, y0 + h/2);
      return;
    }

// function drawCountryMapInRect(ctx, x, y, W, H) {
//   if (!WORLD_GEOJSON) return;

//   ctx.save();

//   // clip to panel
//   ctx.beginPath();
//   ctx.rect(x, y, W, H);
//   ctx.clip();

//   // background
//   ctx.fillStyle = "#fbfbfb";
//   ctx.fillRect(x, y, W, H);

  for (const feat of WORLD_GEOJSON.features) {
    const name = feat.properties?.name || feat.properties?.ADMIN || feat.properties?.NAME || "";
    const fill = getCountryColor(name); // your COUNTRY_TO_GEOSTATE -> geoStates colors

    const geom = feat.geometry;
    if (!geom) continue;

    ctx.beginPath();
    if (geom.type === "Polygon") {
      drawCountryPolygonInRect(ctx, geom.coordinates, x, y, W, H);
    } else if (geom.type === "MultiPolygon") {
      geom.coordinates.forEach(poly => drawCountryPolygonInRect(ctx, poly, x, y, W, H));
    } else {
      continue;
    }

    ctx.fillStyle = fill;
    ctx.fill();

    ctx.strokeStyle = "#9aa0a6";
    ctx.lineWidth = 1.0;
    ctx.stroke();
  }

  ctx.restore();
}
function buildChoroplethCache(w, h) {
    if (!WORLD_GEOJSON || !Array.isArray(WORLD_GEOJSON.features)) return null;
  
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.floor(w));
    c.height = Math.max(1, Math.floor(h));
    const cctx = c.getContext("2d");
  
    // Draw the map ONCE into the offscreen canvas at (0,0,w,h)
    cctx.fillStyle = "#fbfbfb";
    cctx.fillRect(0, 0, c.width, c.height);
  
    for (const feat of WORLD_GEOJSON.features) {
      const name = feat.properties?.name || feat.properties?.ADMIN || feat.properties?.NAME || "";
      const fill = getCountryColor(name);
  
      const geom = feat.geometry;
      if (!geom) continue;
  
      cctx.beginPath();
      if (geom.type === "Polygon") {
        drawCountryPolygonInRect(cctx, geom.coordinates, 0, 0, c.width, c.height);
      } else if (geom.type === "MultiPolygon") {
        geom.coordinates.forEach(poly => drawCountryPolygonInRect(cctx, poly, 0, 0, c.width, c.height));
      } else continue;
  
      cctx.fillStyle = fill;
      cctx.fill();
  
      cctx.strokeStyle = "#9aa0a6";
      cctx.lineWidth = 1.0;
      cctx.stroke();
    }
  
    return { canvas: c, w: c.width, h: c.height };
  }
function projectLonLatToRect(lon, lat, x, y, W, H) {
    const px = x + (lon + 180) / 360 * W;
    const py = y + (90 - lat) / 180 * H;
    return { x: px, y: py };
  }
  
  function drawCountryPolygonInRect(ctx, coords, x, y, W, H) {
    coords.forEach(ring => {
      ring.forEach((pt, i) => {
        const p = projectLonLatToRect(pt[0], pt[1], x, y, W, H);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
    });
  }
  
  function drawCountryMapInRect(ctx, x, y, w, h) {
    if (!showChoroplethMap) return;
  
    // Build cache once (or when size changes)
    const W = Math.max(1, Math.floor(w));
    const H = Math.max(1, Math.floor(h));
  
    if (!choroplethCache || choroplethCache.w !== W || choroplethCache.h !== H) {
      choroplethCache = buildChoroplethCache(W, H);
    }
  
    if (!choroplethCache) {
      // still loading
      ctx.fillStyle = "#fbfbfb";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#666";
      ctx.font = '12px "DM Sans"';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Loading map…", x + w/2, y + h/2);
      return;
    }
  
    ctx.drawImage(choroplethCache.canvas, x, y, w, h);
  }

function drawCountryPolygon(ctx, coords, W, H) {
  // coords can be polygon rings: [ [ [lon,lat], ... ], [hole], ... ]
  coords.forEach(ring => {
    ring.forEach((pt, i) => {
      const p = projectLonLat(pt[0], pt[1], W, H);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
  });
}
// function getCountryColor(countryName) {
//     // Region -> color (make sure geoStates have .color or replace these with your chosen hexes)
//     const REGION_COLOR = {
//       "North America": geoStates.find(s => s.name === "North America")?.color || "#f0f0f0",
//       "South America": geoStates.find(s => s.name === "South America")?.color || "#f0f0f0",
//       "Europe":        geoStates.find(s => s.name === "Europe")?.color || "#f0f0f0",
//       "Africa":        geoStates.find(s => s.name === "Africa")?.color || "#f0f0f0",
//       "Middle East":   geoStates.find(s => s.name === "Middle East")?.color || "#f0f0f0",
//       "East Asia":     geoStates.find(s => s.name === "East Asia")?.color || "#f0f0f0",
//       "Australia":     geoStates.find(s => s.name === "Australia")?.color || "#f0f0f0",
//     };
  
//     // regionCountries already exists later in your file; if it’s above this function, great.
//     // If regionCountries is defined *below*, move THIS function below regionCountries, or move regionCountries up.
//     for (const regionName in regionCountries) {
//       if (regionCountries[regionName]?.includes(countryName)) {
//         return REGION_COLOR[regionName] || "#f0f0f0";
//       }
//     }
  
//     return "#f0f0f0";
//   }

function drawCountryMap(canvas) {
  if (!WORLD_GEOJSON) return;

  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  // background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Draw all countries
  for (const feat of WORLD_GEOJSON.features) {
    const name = feat.properties?.name || feat.properties?.ADMIN || feat.properties?.NAME || "";
    // const fill = COUNTRY_FILL_COLORS[name] || "#f0f0f0";
    const fill = getCountryColor(name);

    ctx.beginPath();

    const geom = feat.geometry;
    if (!geom) continue;

    if (geom.type === "Polygon") {
      drawCountryPolygon(ctx, geom.coordinates, W, H);
    } else if (geom.type === "MultiPolygon") {
      geom.coordinates.forEach(poly => drawCountryPolygon(ctx, poly, W, H));
    } else {
      continue;
    }

    ctx.fillStyle = fill;
    ctx.fill();

    ctx.strokeStyle = "#d0d0d0";
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
}

    // -----------------------------
    // HOST DRAWING HELPERS
    // -----------------------------

    function withCtx(ctx, fn) { ctx.save(); fn(); ctx.restore(); }

    function circle(ctx, x, y, r, fill) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
    }

    function blob(ctx, cx, cy, rx, ry, rot, fill) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
    }

    // Helper function to generate consistent jitter based on an identifier
    function getJitter(identifier, maxOffset = 8) {
        // Use identifier to generate consistent pseudo-random offsets
        const hash = identifier.toString().split('').reduce((acc, char) => {
            return ((acc << 5) - acc) + char.charCodeAt(0);
        }, 0);

        const angle = (hash % 360) * Math.PI / 180;
        const distance = ((hash % 100) / 100) * maxOffset;

        return {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance
        };
    }

    // Color palette for hosts and virus
    const hostPalette = {
        human: "#3b82f6",
        bat: "#6b7280",
        elephant: "#64748b",
        mouse: "#8b5e3c",
        mosquito: "#111",
        virus: "#ef4444"
    };

    // -----------------------------
    // HOST DRAWING FUNCTIONS
    // -----------------------------

    function drawHuman(ctx, cx, cy, s = 1) {
        const c = hostPalette.human;
        // Head
        circle(ctx, cx, cy - 48 * s, 10 * s, c);
        circle(ctx, cx - 3 * s, cy - 52 * s, 3.5 * s, "rgba(255,255,255,0.25)");

        // Torso (rounded trapezoid)
        withCtx(ctx, () => {
            ctx.fillStyle = c;
            ctx.beginPath();
            ctx.moveTo(cx - 18 * s, cy - 35 * s);
            ctx.quadraticCurveTo(cx, cy - 48 * s, cx + 18 * s, cy - 35 * s);
            ctx.lineTo(cx + 22 * s, cy + 5 * s);
            ctx.quadraticCurveTo(cx, cy + 18 * s, cx - 22 * s, cy + 5 * s);
            ctx.closePath();
            ctx.fill();
        });

        // Arms
        ctx.strokeStyle = c;
        ctx.lineWidth = 9 * s;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx - 18 * s, cy - 22 * s);
        ctx.quadraticCurveTo(cx - 42 * s, cy - 6 * s, cx - 30 * s, cy + 18 * s);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx + 18 * s, cy - 22 * s);
        ctx.quadraticCurveTo(cx + 42 * s, cy - 6 * s, cx + 30 * s, cy + 18 * s);
        ctx.stroke();

        // Legs
        withCtx(ctx, () => {
            ctx.fillStyle = c;
            ctx.beginPath();
            ctx.roundRect(cx - 18 * s, cy + 5 * s, 14 * s, 44 * s, 8 * s);
            ctx.fill();
            ctx.beginPath();
            ctx.roundRect(cx + 4 * s, cy + 5 * s, 14 * s, 44 * s, 8 * s);
            ctx.fill();
        });

        // Feet
        blob(ctx, cx - 11 * s, cy + 52 * s, 12 * s, 7 * s, 0, c);
        blob(ctx, cx + 11 * s, cy + 52 * s, 12 * s, 7 * s, 0, c);
    }

    function drawBat(ctx, cx, cy, s = 1) {
        const fur = "#3f3f4a";
        const furLight = "#5a5a66";
        const innerEar = "#e6c6b8";
        const eye = "#111";
        // ---- Wings (single silhouette) ----
        ctx.fillStyle = fur;
        ctx.beginPath();
        ctx.moveTo(cx - 70 * s, cy + 8 * s);
        // left outer curve
        ctx.bezierCurveTo(cx - 60 * s, cy - 30 * s, cx - 28 * s, cy - 50 * s, cx - 6 * s, cy - 18 * s);
        // left scallops
        ctx.quadraticCurveTo(cx - 18 * s, cy - 2 * s, cx - 32 * s, cy + 10 * s);
        ctx.quadraticCurveTo(cx - 18 * s, cy + 20 * s, cx - 4 * s, cy + 6 * s);
        // center top
        ctx.quadraticCurveTo(cx, cy - 4 * s, cx + 4 * s, cy + 6 * s);
        // right scallops
        ctx.quadraticCurveTo(cx + 18 * s, cy + 20 * s, cx + 32 * s, cy + 10 * s);
        ctx.quadraticCurveTo(cx + 18 * s, cy - 2 * s, cx + 6 * s, cy - 18 * s);
        // right outer curve
        ctx.bezierCurveTo(cx + 28 * s, cy - 50 * s, cx + 60 * s, cy - 30 * s, cx + 70 * s, cy + 8 * s);
        // bottom closure
        ctx.quadraticCurveTo(cx + 36 * s, cy + 26 * s, cx, cy + 20 * s);
        ctx.quadraticCurveTo(cx - 36 * s, cy + 26 * s, cx - 70 * s, cy + 8 * s);
        ctx.closePath();
        ctx.fill();
        // ---- Body ----
        blob(ctx, cx, cy + 10 * s, 14 * s, 20 * s, 0, furLight);
        // ---- Head ----
        circle(ctx, cx, cy - 6 * s, 10 * s, furLight);
        // ---- Ears ----
        ear(ctx, cx - 6 * s, cy - 20 * s, 10 * s, 14 * s, -0.4, furLight);
        ear(ctx, cx + 6 * s, cy - 20 * s, 10 * s, 14 * s, 0.4, furLight);
        // inner ears
        ear(ctx, cx - 6 * s, cy - 18 * s, 6 * s, 8 * s, -0.4, innerEar);
        ear(ctx, cx + 6 * s, cy - 18 * s, 6 * s, 8 * s, 0.4, innerEar);
        // ---- Eyes ----
        circle(ctx, cx - 3 * s, cy - 6 * s, 2.2 * s, eye);
        circle(ctx, cx + 3 * s, cy - 6 * s, 2.2 * s, eye);
        // small highlight
        circle(ctx, cx - 3.8 * s, cy - 7 * s, 0.9 * s, "rgba(255,255,255,0.5)");
        circle(ctx, cx + 2.2 * s, cy - 7 * s, 0.9 * s, "rgba(255,255,255,0.5)");
        // ---- Optional subtle outline ----
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 2 * s;
        ctx.stroke();
    }

    function drawElephant(ctx, cx, cy, s = 1) {
        const c = hostPalette.elephant;
        blob(ctx, cx - 10 * s, cy, 50 * s, 35 * s, 0, c);
        blob(ctx, cx + 40 * s, cy - 10 * s, 30 * s, 30 * s, 0, c);
        blob(ctx, cx + 70 * s, cy + 15 * s, 12 * s, 20 * s, 0, c);
        ctx.strokeStyle = c;
        ctx.lineWidth = 8 * s;
        ctx.beginPath();
        ctx.moveTo(cx + 70 * s, cy + 20 * s);
        ctx.quadraticCurveTo(cx + 90 * s, cy + 30 * s, cx + 70 * s, cy + 50 * s);
        ctx.stroke();
        blob(ctx, cx - 40 * s, cy + 40 * s, 12 * s, 25 * s, 0, c);
        blob(ctx, cx - 15 * s, cy + 40 * s, 12 * s, 25 * s, 0, c);
        blob(ctx, cx + 10 * s, cy + 40 * s, 12 * s, 25 * s, 0, c);
        blob(ctx, cx + 35 * s, cy + 40 * s, 12 * s, 25 * s, 0, c);
    }

    function drawMonkey(ctx, cx, cy, s = 1) {
        const fur = "#6b4f3a";      // brown fur
        const face = "#f3d2b6";     // light beige face
        const eye = "#1b1b1b";
        // ---- Tail (behind body) ----
        ctx.strokeStyle = fur;
        ctx.lineWidth = 6 * s;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx + 22 * s, cy + 12 * s);
        ctx.bezierCurveTo(
            cx + 65 * s, cy - 10 * s,
            cx + 65 * s, cy + 70 * s,
            cx + 18 * s, cy + 55 * s
        );
        ctx.stroke();
        // ---- Body ----
        blob(ctx, cx, cy + 20 * s, 24 * s, 32 * s, 0, fur);
        // ---- Head ----
        circle(ctx, cx, cy - 10 * s, 26 * s, fur);
        // ---- Ears ----
        circle(ctx, cx - 28 * s, cy - 12 * s, 12 * s, fur);
        circle(ctx, cx + 28 * s, cy - 12 * s, 12 * s, fur);
        circle(ctx, cx - 28 * s, cy - 12 * s, 7 * s, face);
        circle(ctx, cx + 28 * s, cy - 12 * s, 7 * s, face);
        // ---- Face patch ----
        blob(ctx, cx, cy - 6 * s, 20 * s, 18 * s, 0, face);
        // ---- Eyes ----
        circle(ctx, cx - 8 * s, cy - 10 * s, 4 * s, eye);
        circle(ctx, cx + 8 * s, cy - 10 * s, 4 * s, eye);
        // small highlight
        circle(ctx, cx - 9 * s, cy - 11 * s, 1.5 * s, "rgba(255,255,255,0.5)");
        circle(ctx, cx + 7 * s, cy - 11 * s, 1.5 * s, "rgba(255,255,255,0.5)");
        // ---- Nose / muzzle detail ----
        ctx.strokeStyle = "#5a3e2b";
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.moveTo(cx - 4 * s, cy - 2 * s);
        ctx.lineTo(cx + 4 * s, cy - 2 * s);
        ctx.stroke();
        // ---- Arms ----
        ctx.strokeStyle = fur;
        ctx.lineWidth = 8 * s;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx - 18 * s, cy + 10 * s);
        ctx.quadraticCurveTo(cx - 38 * s, cy + 25 * s, cx - 24 * s, cy + 40 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 18 * s, cy + 10 * s);
        ctx.quadraticCurveTo(cx + 38 * s, cy + 25 * s, cx + 24 * s, cy + 40 * s);
        ctx.stroke();
        // ---- Legs ----
        ctx.beginPath();
        ctx.moveTo(cx - 12 * s, cy + 48 * s);
        ctx.lineTo(cx - 12 * s, cy + 65 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 12 * s, cy + 48 * s);
        ctx.lineTo(cx + 12 * s, cy + 65 * s);
        ctx.stroke();
    }

    function drawMouse(ctx, cx, cy, s = 1) {
        const c = hostPalette.mouse;
        blob(ctx, cx + 10 * s, cy + 10 * s, 35 * s, 25 * s, 0, c);
        blob(ctx, cx - 30 * s, cy - 5 * s, 20 * s, 18 * s, 0, c);
        circle(ctx, cx - 45 * s, cy - 20 * s, 8 * s, c);
        circle(ctx, cx - 20 * s, cy - 22 * s, 8 * s, c);
        ctx.strokeStyle = c;
        ctx.lineWidth = 4 * s;
        ctx.beginPath();
        ctx.moveTo(cx + 45 * s, cy + 5 * s);
        ctx.quadraticCurveTo(cx + 80 * s, cy + 20 * s, cx + 90 * s, cy - 10 * s);
        ctx.stroke();
    }

    // Helper functions for drawPig
    function roundRect(ctx, x, y, w, h, r, fill) {
        const rr = Math.min(r, w / 2, h / 2);
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr);
        ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr);
        ctx.closePath();
        ctx.fill();
    }

    function ear(ctx, x, y, w, h, tilt, fill) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tilt);
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(w * 0.75, h * 0.15, w * 0.5, h);
        ctx.quadraticCurveTo(w * 0.05, h * 0.75, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function ellipsePath(ctx, x, y, rx, ry) {
        ctx.moveTo(x + rx, y);
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    }

    function drawPig(ctx, cx, cy, s = 1) {
        const pink = "#f7a9b8";
        const pink2 = "#f9c2cd";
        const outline = "rgba(120,70,85,0.35)";
        const eye = "#1b1b1b";
        const hoof = "#d98a98";
        // ---- Tail (behind body) ----
        ctx.strokeStyle = pink;
        ctx.lineWidth = 6 * s;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx + 28 * s, cy + 28 * s);
        ctx.bezierCurveTo(cx + 46 * s, cy + 22 * s, cx + 46 * s, cy + 52 * s, cx + 28 * s, cy + 46 * s);
        ctx.bezierCurveTo(cx + 16 * s, cy + 42 * s, cx + 18 * s, cy + 30 * s, cx + 30 * s, cy + 34 * s);
        ctx.stroke();
        // ---- Body ----
        blob(ctx, cx, cy + 26 * s, 30 * s, 22 * s, 0, pink);
        // subtle belly highlight
        blob(ctx, cx - 6 * s, cy + 30 * s, 18 * s, 12 * s, 0, "rgba(255,255,255,0.18)");
        // ---- Legs ----
        // rear
        roundRect(ctx, cx - 18 * s, cy + 44 * s, 10 * s, 18 * s, 5 * s, pink);
        roundRect(ctx, cx + 6 * s, cy + 44 * s, 10 * s, 18 * s, 5 * s, pink);
        // hooves
        roundRect(ctx, cx - 18 * s, cy + 58 * s, 10 * s, 6 * s, 3 * s, hoof);
        roundRect(ctx, cx + 6 * s, cy + 58 * s, 10 * s, 6 * s, 3 * s, hoof);
        // ---- Head ----
        circle(ctx, cx - 10 * s, cy + 6 * s, 20 * s, pink);
        // ---- Ears ----
        // outer ears
        ear(ctx, cx - 22 * s, cy - 10 * s, 14 * s, 16 * s, -0.5, pink);
        ear(ctx, cx + 2 * s, cy - 10 * s, 14 * s, 16 * s, 0.5, pink);
        // inner ears
        ear(ctx, cx - 21 * s, cy - 8 * s, 9 * s, 10 * s, -0.5, pink2);
        ear(ctx, cx + 1 * s, cy - 8 * s, 9 * s, 10 * s, 0.5, pink2);
        // ---- Snout ----
        roundRect(ctx, cx - 30 * s, cy + 4 * s, 20 * s, 16 * s, 7 * s, pink2);
        // nostrils
        circle(ctx, cx - 24 * s, cy + 12 * s, 2.6 * s, "rgba(90,40,55,0.55)");
        circle(ctx, cx - 16 * s, cy + 12 * s, 2.6 * s, "rgba(90,40,55,0.55)");
        // ---- Eyes ----
        circle(ctx, cx - 6 * s, cy + 2 * s, 2.8 * s, eye);
        // tiny highlight
        circle(ctx, cx - 7 * s, cy + 1 * s, 1.1 * s, "rgba(255,255,255,0.55)");
        // ---- Optional soft outline (keeps it crisp on pale bg) ----
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2 * s;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        // outline head
        ctx.beginPath();
        ctx.arc(cx - 10 * s, cy + 6 * s, 20 * s, 0, Math.PI * 2);
        ctx.stroke();
        // outline body
        ctx.beginPath();
        ellipsePath(ctx, cx, cy + 26 * s, 30 * s, 22 * s);
        ctx.stroke();
    }

    function drawMosquito(ctx, cx, cy, s = 1) {
        const ink = hostPalette.mosquito;
        blob(ctx, cx, cy, 10 * s, 28 * s, 0, ink);
        blob(ctx, cx, cy - 28 * s, 8 * s, 8 * s, 0, ink);

        ctx.strokeStyle = ink;
        ctx.lineWidth = 3 * s;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.ellipse(cx - 18 * s, cy - 20 * s, 26 * s, 14 * s, -0.25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx + 18 * s, cy - 20 * s, 26 * s, 14 * s, 0.25, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 2.2 * s;
        for (const k of [-1, 0, 1]) {
            ctx.beginPath();
            ctx.moveTo(cx - 6 * s, cy - 2 * s + k * 6 * s);
            ctx.quadraticCurveTo(cx - 34 * s, cy + 8 * s + k * 6 * s, cx - 42 * s, cy + 24 * s + k * 6 * s);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(cx + 6 * s, cy - 2 * s + k * 6 * s);
            ctx.quadraticCurveTo(cx + 34 * s, cy + 8 * s + k * 6 * s, cx + 42 * s, cy + 24 * s + k * 6 * s);
            ctx.stroke();
        }

        ctx.lineWidth = 2.8 * s;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 34 * s);
        ctx.lineTo(cx, cy - 60 * s);
        ctx.stroke();

        blob(ctx, cx - 3 * s, cy + 6 * s, 3 * s, 10 * s, 0, "rgba(255,255,255,0.14)");
    }

    function drawVirus(ctx, cx, cy, s = 1, color = null) {
        const c = color || hostPalette.virus;
        const R = 14 * s;
        circle(ctx, cx, cy, R, c);
        for (let i = 0; i < 12; i++) {
            const a = i / 12 * Math.PI * 2;
            const x1 = cx + Math.cos(a) * R;
            const y1 = cy + Math.sin(a) * R;
            const x2 = cx + Math.cos(a) * (R + 10 * s);
            const y2 = cy + Math.sin(a) * (R + 10 * s);
            ctx.strokeStyle = c;
            ctx.lineWidth = 3 * s;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            circle(ctx, x2, y2, 3 * s, c);
        }
        circle(ctx, cx - 4 * s, cy - 4 * s, 4 * s, "rgba(255,255,255,0.3)");
    }

    // Dictionary of host drawing functions
    const HOST_ICON = {
        "Human": drawHuman,
        "Bat": drawBat,
        "Monkey": drawMonkey,
        "Pig": drawPig,
        "Mosquito": drawMosquito
    };

    // -----------------------------
    // HOST TRANSMISSION SYSTEM
    // -----------------------------

    // Host species (similar to geographic states)
    const hostStates = [
        { name: "Human" },
        { name: "Monkey" },
        { name: "Bat" },
        { name: "Pig" },
        { name: "Mosquito" }
    ];

    // Row-stochastic transition matrix for host jumps
    const hostTransitionMatrix = [
        //   H     M     B     P    Mq
        [0.10, 0.10, 0.30, 0.20, 0.30], // Human
        [0.10, 0.10, 0.15, 0.30, 0.35], // Monkey
        [0.30, 0.15, 0.10, 0.25, 0.20], // Bat
        [0.20, 0.30, 0.25, 0.10, 0.15], // Pig
        [0.30, 0.35, 0.20, 0.15, 0.00], // Mosquito
    ];

// Host transmission CTMC (schedule-based, same idea as GeoCTMCStar)
class HostTransmissionCTMC {
    constructor(initialHostIndex = 0) {
      this.i = initialHostIndex;   // current host (discrete CTMC state)
      this.nextState = initialHostIndex;
  
      // branch-length time
      this.time = 0;
      this.t1 = 0;
      this.t2 = 0;
      this.t3 = 0;
  
      // visual "flight" (jump) descriptor
      // flight = { from, to, start, end }
      this.flight = null;
  
      // rate in BRANCH-LENGTH units (expected jumps per unit tree length)
      this.lambda = 0.8;
      this._lastRate = null;
  
      this._rescheduleFromCurrent();
    }
  
    // same interpretation as geo: lambda is "per unit tree length"
    // setRate(rateValue) {
    //     const newLambda = Math.max(1e-9, Number(rateValue));
    
    //     // Do nothing if rate did not change
    //     if (this._lastRate !== null && Math.abs(newLambda - this._lastRate) < 1e-12) {
    //         return;
    //     }
    
    //     this.lambda = newLambda;
    //     this._lastRate = newLambda;
    
    //     // Reschedule jumps from current time using the new rate
    //     this._rescheduleFromCurrent();
    // }
    setRate(rateValue) {
        const r = Number(rateValue);
        const newLambda = Math.max(1e-9, isFinite(r) ? r : 0.8);
      
        // Avoid rescheduling every frame if unchanged
        if (this._lastRate !== null && Math.abs(newLambda - this._lastRate) < 1e-12) return;
      
        this.lambda = newLambda;
        this._lastRate = newLambda;
      
        // Reschedule from "now" (same spirit as geo)
        this._rescheduleFromCurrent();
      }
  
    _rescheduleFromCurrent() {
      this.t1 = this.time;
      const hold1 = sampleExp(this.lambda);
      this.t2 = this.t1 + hold1;
  
      // sample next host at t2
      let ns = sampleCategorical(hostTransitionMatrix[this.i]);
      let tries = 0;
      while (ns === this.i && tries < 20) { // avoid self-jumps (optional, matches geo style)
        ns = sampleCategorical(hostTransitionMatrix[this.i]);
        tries++;
      }
      this.nextState = ns;
  
      const hold2 = sampleExp(this.lambda);
      this.t3 = this.t2 + hold2;
  
      this.flight = null;
    }
  
    easeInOut(u) {
      return u * u * (3 - 2 * u);
    }
  
    // hostPositions: array of {x,y,name} (same one used by drawHostTransmission)
    update(dt, hostPositions) {
      // dt is BRANCH-LENGTH increment (same as geo)
      if (!isFinite(dt) || dt <= 0) return;
  
      this.time += dt;
  
      // Like GeoCTMCStar: handle possibly multiple crossed jumps if dt is big
      for (let guard = 0; guard < 100; guard++) {
        const d12 = this.t2 - this.t1;
        const d23 = this.t3 - this.t2;
  
        // same window formula as geo:
        // [ t1 + 3/4(d12) , t2 + 1/4(d23) ]
        const startFly = this.t1 + 0.75 * d12;
        const endFly   = this.t2 + 0.25 * d23;
  
        // create flight if we just entered the window for this scheduled jump
        if (!this.flight && this.time >= startFly && this.time < endFly) {
          this.flight = { from: this.i, to: this.nextState, start: startFly, end: endFly };
        }
  
        // if we passed the underlying jump time t2, commit discrete state and shift schedule
        if (this.time >= this.t2) {
          this.i = this.nextState;
  
          // shift (t1,t2,t3) <- (t2,t3,t4)
          this.t1 = this.t2;
          this.t2 = this.t3;
  
          // sample new nextState at new t2
          let ns = sampleCategorical(hostTransitionMatrix[this.i]);
          let tries = 0;
          while (ns === this.i && tries < 20) {
            ns = sampleCategorical(hostTransitionMatrix[this.i]);
            tries++;
          }
          this.nextState = ns;
  
          // sample new t3
          const hold = sampleExp(this.lambda);
          this.t3 = this.t2 + hold;
  
          // this jump is done; clear flight (new one will be created for next jump)
          this.flight = null;
  
          continue; // may need to process more jumps if dt was large
        }
  
        break;
      }
  
      // update visual position (the DRAW code will read current/target + flight progress)
      // (we keep this class purely “state+timing”; the renderer can interpolate)
    }
  
    currentHostName() { return hostStates[this.i].name; }
    isTransmitting()  { return !!this.flight; }
  
    // For drawing
    getCurrentHostIndex() { return this.i; }
    getTargetHostIndex()  { return this.flight ? this.flight.to : this.i; }
  
    // For drawing: 0..1 progress along the *flight window*
    getTransmissionProgress() {
      if (!this.flight) return 1;
      const denom = (this.flight.end - this.flight.start);
      const uRaw = denom > 0 ? (this.time - this.flight.start) / denom : 1;
      return this.easeInOut(Math.max(0, Math.min(1, uRaw)));
    }
  }
    // Host transmission state - array of {sequenceId, ctmc, color} objects
    let hostCTMCs = [];

    // -----------------------------
    // SIMPLE CONTINENT CTMC + COMET TRAIL (efficient)
    // -----------------------------

    // Continent anchor points (imaginary but fixed)
    // const geoStates = [
    //     { name: "North America", lon: -100, lat: 40 },
    //     { name: "South America", lon: -60, lat: -15 },
    //     { name: "Europe", lon: 10, lat: 50 },
    //     { name: "Africa", lon: 20, lat: 5 },
    //     { name: "Middle East", lon: 50, lat: 25 },
    //     { name: "East Asia", lon: 110, lat: 35 },
    //     { name: "Australia", lon: 135, lat: -25 },
    // ];
    const geoStates = [

        // --- Currently active states ---
        { name: "North America", lon: -100, lat: 40, color: "#FDB338" },   // USA
        { name: "South America", lon: -60, lat: -15, color: "#FF7400" },   // South America
        { name: "Europe",        lon: 10,   lat: 50, color: "#C26A77" },   // Europe
        { name: "Africa",        lon: 20,   lat: 5,  color: "#512888" },   // Africa
        { name: "Middle East",   lon: 50,   lat: 25, color: "#94CBEC" },   // South & West Asia
        { name: "East Asia",     lon: 110,  lat: 35, color: "#025196" },   // China / East Asia
        { name: "Australia",     lon: 135,  lat: -25,color: "#337538" },   // Oceania
    
    
        // --- Additional aircommunity states (currently unused) ---
        // Uncomment if you expand geographic resolution
    
        // { name: "China",             lon: 105, lat: 35, color: "#025196" },
        // { name: "Southeast Asia",   lon: 105, lat: 15, color: "#5DA899" },
        // { name: "South & West Asia",lon: 65,  lat: 25, color: "#94CBEC" },
        // { name: "Japan",            lon: 140, lat: 36, color: "#D1E5F0" },
        // { name: "Taiwan",           lon: 121, lat: 24, color: "#2F67B1" },
        // { name: "Korea",            lon: 127, lat: 36, color: "#4393C3" },
        // { name: "Oceania",          lon: 140, lat: -20,color: "#337538" },
        // { name: "Russia",           lon: 90,  lat: 60, color: "#9F4A96" },
        // { name: "Canada",           lon: -95, lat: 60, color: "#6A4A3C" },
        // { name: "Mexico",           lon: -102,lat: 23, color: "#FF0000" },
        // { name: "Unassigned",       lon: 0,   lat: 0,  color: "#D3D3D3" },
    
    ];
    const nGeoStates = geoStates.length;
    const P = Array.from({ length: nGeoStates }, () => Array(nGeoStates).fill(1 / nGeoStates));

    const COUNTRY_TO_GEOSTATE = {

        // North America
        "United States of America": "North America",
        "Canada": "North America",
        "Mexico": "North America",
    
        // South America
        "Brazil": "South America",
        "Argentina": "South America",
        "Chile": "South America",
    
        // Europe
        "France": "Europe",
        "Germany": "Europe",
        "United Kingdom": "Europe",
        "Italy": "Europe",
    
        // Africa
        "South Africa": "Africa",
        "Nigeria": "Africa",
        "Egypt": "Africa",
    
        // Middle East
        "Saudi Arabia": "Middle East",
        "Iran": "Middle East",
        "United Arab Emirates": "Middle East",
    
        // East Asia
        "China": "East Asia",
        "Japan": "East Asia",
        "South Korea": "East Asia",
        "Taiwan": "East Asia",
    
        // Australia
        "Australia": "Australia",
        "New Zealand": "Australia",
    
    };
    function getCountryColor(countryName) {

        const regionName = COUNTRY_TO_GEOSTATE[countryName];
    
        if (!regionName) return "#f0f0f0";
    
        const geo = geoStates.find(s => s.name === regionName);
    
        return geo ? geo.color : "#f0f0f0";
    }

    let WORLD_GEOJSON = null;
    let choroplethCache = null; // { canvas, w, h }
    (async function initCountryMap() {
        const canvas = document.getElementById("countryMapCanvas");
        if (!canvas) return;
        await loadWorldGeoJSON();
        drawCountryMap(canvas);
      })();

    // Row-stochastic transition matrix for jumps (discrete-time jump kernel)
    //   const P = [
    //       //   NA    SA    EU    AF    ME    EA    AU
    //       [ 0.10, 0.45, 0.20, 0.10, 0.10, 0.05, 0.00 ], // NA
    //       [ 0.45, 0.10, 0.10, 0.25, 0.10, 0.00, 0.00 ], // SA
    //       [ 0.20, 0.05, 0.10, 0.25, 0.25, 0.15, 0.00 ], // EU
    //       [ 0.10, 0.20, 0.25, 0.10, 0.20, 0.10, 0.05 ], // AF
    //       [ 0.10, 0.05, 0.25, 0.20, 0.10, 0.25, 0.05 ], // ME
    //       [ 0.05, 0.00, 0.15, 0.10, 0.25, 0.10, 0.35 ], // EA
    //       [ 0.00, 0.00, 0.00, 0.10, 0.15, 0.55, 0.20 ], // AU
    //   ];

    function sampleCategorical(probs) {
        let r = seededRandom();
        for (let i = 0; i < probs.length; i++) {
            r -= probs[i];
            if (r <= 0) return i;
        }
        return probs.length - 1;
    }

    function sampleExp(rate) {
        // rate > 0, return waiting time in seconds
        return -Math.log(1 - seededRandom()) / rate;
    }

    // One moving dot with a comet trail
    // Uses a CTMC: hold in a state for Exp(lambda) seconds, then jump to next state by P
    // -------------------------------
    // Curved routes: circular arc in pixel space
    // -------------------------------

    // Cache for precomputed routes
    const routeCache = new Map();

    function routeKey(i, j) { return `${i}->${j}`; }

    // Compute a constant-curvature circular arc from A to B
    function computeCircularArc(A, B, radiusFactor = 1.3, concaveUp = true) {
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const d = Math.hypot(dx, dy);

        // If points are too close, return degenerate "arc" = straight segment
        if (d < 1e-6) {
            return { type: "line", A, B };
        }

        // Choose radius R = radiusFactor * (d/2), must be > 1.0
        const minFactor = 1.01;
        const f = Math.max(minFactor, radiusFactor);
        const R = f * (d / 2);

        const mx = (A.x + B.x) / 2;
        const my = (A.y + B.y) / 2;

        // Unit perpendicular to chord (rotate (dx,dy) by +/-90 degrees)
        const ux = -dy / d;
        const uy = dx / d;

        const half = d / 2;
        const h = Math.sqrt(Math.max(0, R * R - half * half));

        // Two possible centers: M ± h * u
        const C1 = { x: mx + h * ux, y: my + h * uy };
        const C2 = { x: mx - h * ux, y: my - h * uy };

        // Pick center that makes the arc "concave up" (smaller y)
        const C = concaveUp ? (C1.y < C2.y ? C1 : C2) : (C1.y > C2.y ? C1 : C2);

        // Angles from center to endpoints
        const a0 = Math.atan2(A.y - C.y, A.x - C.x);
        const a1 = Math.atan2(B.y - C.y, B.x - C.x);

        // Ensure we go the "short way" around the circle
        let da = a1 - a0;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;

        return { type: "arc", A, B, C, R, a0, da };
    }

    // Evaluate a route at u in [0,1]
    function evalRoute(route, u) {
        if (route.type === "line") {
            return {
                x: route.A.x + (route.B.x - route.A.x) * u,
                y: route.A.y + (route.B.y - route.A.y) * u,
            };
        }
        const a = route.a0 + route.da * u;
        return {
            x: route.C.x + route.R * Math.cos(a),
            y: route.C.y + route.R * Math.sin(a),
        };
    }

    // Get (or build) route for transition i->j
    function getRoute(i, j, radiusFactor, offsetX, offsetY, mapWidth, mapHeight) {
        const k = routeKey(i, j);
        const cached = routeCache.get(k);

        // If curve factor changed, rebuild cache
        if (!cached || cached.radiusFactor !== radiusFactor) {
            const A = projectEquirect(geoStates[i].lon, geoStates[i].lat, offsetX, offsetY, mapWidth, mapHeight);
            const B = projectEquirect(geoStates[j].lon, geoStates[j].lat, offsetX, offsetY, mapWidth, mapHeight);

            // Hemisphere-aware curvature: northern hemisphere routes curve down (concave), southern curve up
            const avgLat = (geoStates[i].lat + geoStates[j].lat) / 2;
            const concaveUp = avgLat < 0; // Southern hemisphere: curve up, Northern: curve down

            const route = computeCircularArc(
                { x: A[0], y: A[1] },
                { x: B[0], y: B[1] },
                radiusFactor,
                concaveUp
            );
            routeCache.set(k, { route, radiusFactor });
            return route;
        }
        return cached.route;
    }

    // -------------------------------
    // CTMC star with smooth head + curved travel
    // -------------------------------

    class GeoCTMCStar {
        constructor(initialStateIndex = 0) {
            // Current CTMC state at current branch-length time
            this.i = initialStateIndex;

            // Overall jump rate in BRANCH-LENGTH units:
            // lambda = expected jumps per unit branch length (or per normalized length if you normalize outside)
            this.lambda = 0.8;

            // Absolute branch-length time along the lineage (cumulative)
            this.time = 0;

            // Schedule of jump times (branch-length time):
            // We keep the next two jump times because your flight window needs t1, t2, t3.
            this.t1 = 0;   // last jump time (time we entered state at time t1)
            this.t2 = 0;   // next jump time
            this.t3 = 0;   // jump after next

            // State after next jump (at t2)
            this.nextState = initialStateIndex;

            // Flight (visual interpolation) info for the current jump around t2
            // (created when we are close enough to the jump time)
            this.flight = null;
            // flight = {
            //   from, to,
            //   start, end,
            //   route
            // }

            // Smooth head position (updated every frame in pixel space)
            this.headX = 0;
            this.headY = 0;

            // Current route object while traveling
            this.route = null;
            this.curveFactor = 1.3;

            // comet trail: list of {x,y,age} in pixel space
            this.trail = [];
            this.trailMaxAge = 9.0;
            this.trailSampleHz = 12;
            this._trailAcc = 0;

            // Sticky paths option
            this.stickyPaths = false;

            // Initialize schedule
            this._rescheduleFromCurrent();
        }

        // --- Rate is interpreted in branch-length units ---
        // If you normalize branch length so root->tip is ~1, then lambda is:
        //   expected # jumps from root to tip = lambda
        setRate(rateValue) {
            const r = Number(rateValue);
            this.lambda = Math.max(1e-9, isFinite(r) ? r : 0.8);

            // If we change the rate, resample future waiting times from "now" in a consistent way.
            // We keep current state/time, and reschedule upcoming jumps from the current time.
            this._rescheduleFromCurrent();
        }

        // setStickyPaths(sticky) {
        //     this.stickyPaths = sticky;
        //     if (sticky) {
        //         for (const p of this.trail) p.age = 0;
        //     }
        // }
        setStickyPaths(sticky) {
            const wasSticky = this.stickyPaths;
            this.stickyPaths = sticky;
          
            if (sticky) {
              // Sticky mode: freeze ages so nothing fades
              for (const p of this.trail) p.age = 0;
              return;
            }
          
            // Non-sticky mode: immediately collapse any long history into a short comet tail
            // Keep ~1 second worth of samples (adjust tailSeconds if you want longer/shorter).
            const tailSeconds = 1.0;
            const keepN = Math.max(2, Math.ceil(this.trailSampleHz * tailSeconds));
          
            if (wasSticky && this.trail.length > keepN) {
              this.trail = this.trail.slice(-keepN);
            }
          
            // Make the kept points already “aged” so you see a gradient immediately
            const n = this.trail.length;
            for (let k = 0; k < n; k++) {
              // oldest point gets age close to trailMaxAge, newest close to 0
              const frac = (n <= 1) ? 0 : k / (n - 1);
              this.trail[k].age = (1 - frac) * this.trailMaxAge;
            }
          }

        // Nice flight-like easing
        easeInOut(u) {
            return u * u * (3 - 2 * u);
        }

        // returns current lon/lat by interpolating between current flight endpoints
        currentLonLat() {
            const a = geoStates[this.i];

            // If no active flight at current time, we are anchored at current state i
            if (!this.flight) return { lon: a.lon, lat: a.lat };

            // If we have a flight, interpolate between flight.from and flight.to
            const from = geoStates[this.flight.from];
            const to = geoStates[this.flight.to];

            const denom = (this.flight.end - this.flight.start);
            const uRaw = denom > 0 ? (this.time - this.flight.start) / denom : 1;
            const u = Math.max(0, Math.min(1, uRaw));

            return {
                lon: from.lon + (to.lon - from.lon) * u,
                lat: from.lat + (to.lat - from.lat) * u
            };
        }

        // --- Core: CTMC in branch-length time + your symmetric flight window ---
        update(dt, offsetX, offsetY, mapWidth, mapHeight) {
            // dt is BRANCH-LENGTH increment (not seconds)
            if (!isFinite(dt) || dt <= 0) {
                // Still anchor head position for safety
                const [x, y] = projectEquirect(
                    geoStates[this.i].lon,
                    geoStates[this.i].lat,
                    offsetX, offsetY, mapWidth, mapHeight
                );
                this.headX = x;
                this.headY = y;
                return;
            }

            // Advance branch-length time
            this.time += dt;

            // Process possibly multiple jumps passed in this update
            // We do this in a loop in case dt is large.
            for (let guard = 0; guard < 100; guard++) {
                // Compute the flight window around the next jump time t2,
                // using (t1, t2, t3) exactly as you specified.
                const d12 = this.t2 - this.t1;   // t2 - t1
                const d23 = this.t3 - this.t2;   // t3 - t2

                // Flight from a->b should occur on:
                // [ t1 + 3/4(d12) , t2 + 1/4(d23) ]
                // which is also [ t2 - 1/4(d12) , t2 + 1/4(d23) ]
                const startFly = this.t1 + 0.75 * d12;
                const endFly = this.t2 + 0.25 * d23;

                // If we are within/after startFly and we don't yet have a flight
                // for this scheduled jump, create it.
                if (!this.flight && this.time >= startFly) {
                    // The jump is from current state this.i (state at t1) to nextState (state at t2)
                    // Even if we later pass t2 and update this.i, the flight should remain defined.
                    const from = this.i;
                    const to = this.nextState;

                    // Build route in pixel space
                    const route = getRoute(from, to, this.curveFactor, offsetX, offsetY, mapWidth, mapHeight);

                    this.flight = {
                        from,
                        to,
                        start: startFly,
                        end: endFly,
                        route
                    };
                }

                // If we have passed the actual CTMC jump time t2, advance the CTMC state/schedule.
                // Note: The DOT may still be in flight until endFly; that is fine and intended.
                if (this.time >= this.t2) {
                    // Underlying CTMC jumps at t2
                    this.i = this.nextState;

                    // Shift jump times forward: (t1,t2,t3) <- (t2,t3,t4)
                    this.t1 = this.t2;
                    this.t2 = this.t3;

                    // Sample next state at the new t2 (from current state i)
                    let ns = sampleCategorical(P[this.i]);
                    // Avoid self as an "instantaneous jump" (keeps behavior similar to your old code)
                    // If you *want* to allow self "jumps", remove this loop.
                    let tries = 0;
                    while (ns === this.i && tries < 20) {
                        ns = sampleCategorical(P[this.i]);
                        tries++;
                    }
                    this.nextState = ns;

                    // Sample new holding length to get the new t3
                    const hold = sampleExp(this.lambda);  // in branch-length units
                    this.t3 = this.t2 + hold;

                    // We may have advanced so far that we should now schedule/complete further jumps.
                    // Continue the loop.
                    continue;
                }

                // If we did not pass t2, no need to shift schedule.
                break;
            }

            // Update head position:
            // - if we have an active flight and we're before its end, place dot on the curve
            // - otherwise anchor it to current state
            if (this.flight && this.time < this.flight.end) {
                const denom = (this.flight.end - this.flight.start);
                const uRaw = denom > 0 ? (this.time - this.flight.start) / denom : 1;
                const u = Math.max(0, Math.min(1, uRaw));

                const p = evalRoute(this.flight.route, this.easeInOut(u));
                this.headX = p.x;
                this.headY = p.y;
            } else {
                // Flight finished (or never started): snap to current state's anchor
                if (this.flight && this.time >= this.flight.end) {
                    this.flight = null;
                }

                const [x, y] = projectEquirect(
                    geoStates[this.i].lon,
                    geoStates[this.i].lat,
                    offsetX, offsetY, mapWidth, mapHeight
                );
                this.headX = x;
                this.headY = y;
            }
        }

        // Maintain comet trail (ages use the same dt units you pass here)
        updateTrail(dt) {
            // NEW: ensure we always have a starting point so the first jump draws a line
            if (this.trail.length === 0) {
                this.trail.push({ x: this.headX, y: this.headY, age: 0 });
            }
            if (!this.stickyPaths) {
                for (const p of this.trail) p.age += dt;
                while (this.trail.length && this.trail[0].age > this.trailMaxAge) {
                    this.trail.shift();
                }
            }

            this._trailAcc += dt;
            const step = 1 / this.trailSampleHz;
            while (this._trailAcc >= step) {
                this._trailAcc -= step;
                this.trail.push({ x: this.headX, y: this.headY, age: 0 });
            }

            if (this.trail.length) {
                const last = this.trail[this.trail.length - 1];
                last.x = this.headX;
                last.y = this.headY;
            }
        }

        draw(ctx, color = null, fixedOffset = { x: 0, y: 0 }) {
            const lineColor = color || "#000";
            const dotColor = color || "#000";

            // Draw trail
            if (this.trail.length > 1) {
                for (let k = 1; k < this.trail.length; k++) {
                    const p0 = this.trail[k - 1];
                    const p1 = this.trail[k];

                    if (this.stickyPaths) {
                        ctx.strokeStyle = lineColor.replace('1)', '0.6)');
                        ctx.lineWidth = 2;
                    } else {
                        const a = 1 - (p1.age / this.trailMaxAge);
                        const alpha = Math.max(0, Math.min(1, a));
                        if (lineColor.startsWith('rgba')) {
                            ctx.strokeStyle = lineColor.replace(/[\d.]+\)$/, `${0.55 * alpha})`);
                        } else if (lineColor.startsWith('#')) {
                            const r = parseInt(lineColor.slice(1, 3), 16);
                            const g = parseInt(lineColor.slice(3, 5), 16);
                            const b = parseInt(lineColor.slice(5, 7), 16);
                            ctx.strokeStyle = `rgba(${r},${g},${b},${0.55 * alpha})`;
                        } else {
                            ctx.strokeStyle = `rgba(0,0,0,${0.55 * alpha})`;
                        }
                        ctx.lineWidth = 1 + 2 * alpha;
                    }

                    const x0 = p0.x + fixedOffset.x;
                    const y0 = p0.y + fixedOffset.y;
                    const x1 = p1.x + fixedOffset.x;
                    const y1 = p1.y + fixedOffset.y;

                    // Per-segment curvature (tweak these if you want more/less bend)
                    const dx = x1 - x0;
                    const dy = y1 - y0;
                    const L = Math.hypot(dx, dy) || 1;

                    // Unit normal
                    const nx = -dy / L;
                    const ny = dx / L;

                    // Midpoint
                    const mx = (x0 + x1) * 0.5;
                    const my = (y0 + y1) * 0.5;

                    // Alternate bend direction so it doesn't look like one rigid arc
                    const sign = (k % 2 === 0) ? 1 : -1;

                    // How “curvy” the segment is (as a fraction of segment length)
                    const bend = 0.22; // try 0.10 (subtle) … 0.35 (very curvy)

                    // Control point
                    const cpx = mx + nx * (L * bend * sign);
                    const cpy = my + ny * (L * bend * sign);

                    ctx.beginPath();
                    ctx.moveTo(x0, y0);
                    ctx.quadraticCurveTo(cpx, cpy, x1, y1);
                    ctx.stroke();

                    //   ctx.beginPath();
                    //   ctx.moveTo(p0.x + fixedOffset.x, p0.y + fixedOffset.y);
                    //   ctx.lineTo(p1.x + fixedOffset.x, p1.y + fixedOffset.y);
                    //   ctx.stroke();
                }
            }

            // ==========================================================
            // ADD THIS BLOCK HERE (curve overlay while flying)
            // ==========================================================
            if (this.flight && this.flight.route) {
                ctx.save();

                // faint version of lineage color
                if (lineColor.startsWith('rgba')) {
                    ctx.strokeStyle = lineColor.replace(/[\d.]+\)$/, '0.25)');
                } else {
                    ctx.strokeStyle = lineColor;
                }

                ctx.lineWidth = 1.5;

                ctx.beginPath();
                const N = 30;
                for (let k = 0; k <= N; k++) {
                    const u = k / N;
                    const p = evalRoute(this.flight.route, u);

                    const X = p.x + fixedOffset.x;
                    const Y = p.y + fixedOffset.y;

                    if (k === 0) ctx.moveTo(X, Y);
                    else ctx.lineTo(X, Y);
                }

                ctx.stroke();
                ctx.restore();
            }


            // Head
            const drawX = this.headX + fixedOffset.x;
            const drawY = this.headY + fixedOffset.y;

            ctx.fillStyle = dotColor;
            ctx.beginPath();
            ctx.arc(drawX, drawY, 4.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = dotColor.replace('1)', '0.5)');
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }

        currentStateName() {
            return geoStates[this.i].name;
        }

        // --- Private: schedule next two jumps from "now" ---
        _rescheduleFromCurrent() {
            // Reset schedule so that t1 = current time, and we sample t2 and t3.
            this.t1 = this.time;

            // Sample next jump time t2 (branch-length waiting)
            const hold1 = sampleExp(this.lambda);
            this.t2 = this.t1 + hold1;

            // Sample next state (avoid self to keep behavior similar)
            let ns = sampleCategorical(P[this.i]);
            let tries = 0;
            while (ns === this.i && tries < 20) {
                ns = sampleCategorical(P[this.i]);
                tries++;
            }
            this.nextState = ns;

            // Sample following jump time t3 (needs only holding length; independent of state here)
            const hold2 = sampleExp(this.lambda);
            this.t3 = this.t2 + hold2;

            // Clear any existing flight (it would no longer match the schedule)
            this.flight = null;
        }
    }

    // We'll run multiple stars - one per sequence path to each tip
    // 0: Root → Internal Node → Tip 1
    // 1: Root → Internal Node → Tip 2
    // 2: Root → Tip 3
    let geoStars = []; // Array of {sequenceId, star} objects
    let lastTimeSec = null;
    let nextSequenceId = 0; // Counter for unique sequence IDs

    // Great circle interpolation (spherical linear interpolation)
    function greatCircleInterpolate(lon1, lat1, lon2, lat2, t) {
        // Convert to radians
        const toRad = Math.PI / 180;
        const toDeg = 180 / Math.PI;

        const φ1 = lat1 * toRad;
        const φ2 = lat2 * toRad;
        const λ1 = lon1 * toRad;
        const λ2 = lon2 * toRad;

        // Calculate angular distance
        const Δφ = φ2 - φ1;
        const Δλ = λ2 - λ1;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const δ = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        if (δ < 0.001) {
            // Points are very close, use simple linear interpolation
            return {
                lon: lon1 + (lon2 - lon1) * t,
                lat: lat1 + (lat2 - lat1) * t
            };
        }

        // Spherical linear interpolation
        const A = Math.sin((1 - t) * δ) / Math.sin(δ);
        const B = Math.sin(t * δ) / Math.sin(δ);

        const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
        const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
        const z = A * Math.sin(φ1) + B * Math.sin(φ2);

        const φ = Math.atan2(z, Math.sqrt(x * x + y * y));
        const λ = Math.atan2(y, x);

        return {
            lon: λ * toDeg,
            lat: φ * toDeg
        };
    }

    // Initial sequence
    const initialSequence = ['A', 'T', 'G', 'C', 'A'];

    function drawTree() {
        // Rebuild tree according to selected tip count
        const __nTips = (typeof numTipsSelect !== 'undefined' && numTipsSelect) ? parseInt(numTipsSelect.value, 10) : 3;
        tree = (__nTips === 3) ? buildTree(TREE_PARAMS) : buildTreeMulti(TREE_PARAMS, __nTips);

        // Calculate scaling factors based on number of tips
        // Scale down as tree gets larger
        const scaleFactor = __nTips <= 3 ? 1 : Math.max(0.4, 1 - (__nTips - 3) * 0.08);
        const branchWidth = 3 * scaleFactor;
        const internalNodeRadius = 8 * scaleFactor;
        const tipNodeRadius = 10 * scaleFactor;
        const fontSize = Math.max(10, 14 * scaleFactor);
        const labelOffset = 40 * scaleFactor;

        ctx.strokeStyle = '#34495e';
        ctx.lineWidth = branchWidth;

        function drawNode(node) {
            if (node.children.length > 0) {
                node.children.forEach(child => {
                    // ctx.beginPath();
                    // ctx.moveTo(node.x, node.y);
                    // ctx.lineTo(child.x, child.y);
                    // ctx.stroke();
                    // Base edge
                    ctx.strokeStyle = '#34495e';
                    ctx.lineWidth = branchWidth;
                    ctx.beginPath();
                    ctx.moveTo(node.x, node.y);
                    ctx.lineTo(child.x, child.y);
                    ctx.stroke();

                    // NEW: overlay tracked segments (if enabled)
                    if (branchTrackMode !== 'none') {
                        const ekey = `${node.id}->${child.id}`;
                        const map = BRANCH_SEGMENTS[branchTrackMode];

                        if (map && map.has(ekey)) {
                            const segs = map.get(ekey);

                            // Thicker overlay so it reads well
                            const overlayW = Math.max(2, branchWidth * 1.8);

                            segs.forEach(s => {
                                const p0 = Math.max(0, Math.min(1, s.p0));
                                const p1 = Math.max(0, Math.min(1, s.p1));
                                if (p1 <= p0) return;

                                const x0 = node.x + (child.x - node.x) * p0;
                                const y0 = node.y + (child.y - node.y) * p0;
                                const x1 = node.x + (child.x - node.x) * p1;
                                const y1 = node.y + (child.y - node.y) * p1;

                                ctx.strokeStyle = s.color;
                                ctx.lineWidth = overlayW;
                                ctx.beginPath();
                                ctx.moveTo(x0, y0);
                                ctx.lineTo(x1, y1);
                                ctx.stroke();
                            });
                        }
                    }
                    drawNode(child);
                });
            }

            // Draw node circles
            ctx.fillStyle = '#2c3e50';
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.children.length > 0 ? internalNodeRadius : tipNodeRadius, 0, Math.PI * 2);
            ctx.fill();

            // Draw labels for tips
            if (node.label) {
                ctx.fillStyle = '#555';
                ctx.font = `${fontSize}px "DM Sans"`;
                ctx.textAlign = 'center';
                ctx.fillText(node.label, node.x, node.y + labelOffset);
            }
        }

        // Draw root label
        ctx.fillStyle = '#555';
        ctx.font = `${fontSize}px "DM Sans"`;
        ctx.textAlign = 'center';
        ctx.fillText('Root', tree.x, tree.y - 20 * scaleFactor);

        drawNode(tree);
    }

    // Load world land GeoJSON data
    async function loadWorldLand() {
        if (worldLandGeoJSON) return;
        try {
            // Using Natural Earth 110m resolution land data from CDN
            const resp = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json");
            const topology = await resp.json();
            // Convert TopoJSON to GeoJSON
            worldLandGeoJSON = topojson.feature(topology, topology.objects.land);
        } catch (error) {
            console.error("Failed to load world map data:", error);
        }
    }

    async function loadNaturalEarthCountries() {
        if (neCountries) return;
        try {
            const url = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";
            const resp = await fetch(url);
            neCountries = await resp.json();
        } catch (error) {
            console.error("Failed to load Natural Earth countries:", error);
        }
    }

    const regionCountries = {
        "North America": ["Canada", "United States of America", "Mexico"],
        "South America": [
            "Argentina", "Bolivia", "Brazil", "Chile", "Colombia", "Ecuador", "Guyana", "Paraguay", "Peru",
            "Suriname", "Uruguay", "Venezuela", "French Guiana"
        ],
        "Europe": [
            "Albania", "Andorra", "Austria", "Belarus", "Belgium", "Bosnia and Herz.", "Bulgaria", "Croatia",
            "Czechia", "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary",
            "Ireland", "Italy", "Kosovo", "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "Macedonia",
            "Moldova", "Monaco", "Montenegro", "Netherlands", "Norway", "Poland", "Portugal", "Romania",
            "San Marino", "Serbia", "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland",
            "Ukraine", "United Kingdom", "Vatican"
        ],
        "Middle East": [
            "Turkey", "Cyprus", "Syria", "Lebanon", "Israel", "Jordan", "Iraq", "Iran", "Saudi Arabia", "Yemen",
            "Oman", "United Arab Emirates", "Qatar", "Bahrain", "Kuwait", "Palestine"
        ],
        "East Asia": [
            "China", "Mongolia", "Japan", "North Korea", "South Korea", "Taiwan"
        ],

        "Australia": ["Australia", "New Zealand", "Papua New Guinea"]
    };

    function featuresForRegion(regionName) {
        if (!neCountries) return [];

        // --- Custom subregions (manual override) ---
        if (regionCountries[regionName]) {
            const wanted = new Set(regionCountries[regionName]);
            return neCountries.features.filter(f =>
                wanted.has(f?.properties?.ADMIN)
            );
        }

        // --- Automatic continent selection ---
        return neCountries.features.filter(f =>
            f?.properties?.CONTINENT === regionName
        );
    }


    function ringBBox(ring) {
        let minLon = +Infinity, maxLon = -Infinity, minLat = +Infinity, maxLat = -Infinity;
        for (const [lon, lat] of ring) {
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
        }
        return { minLon, maxLon, minLat, maxLat };
    }

    function ringCentroid(ring) {
        // simple average is fine for this purpose
        let lon = 0, lat = 0;
        for (const p of ring) { lon += p[0]; lat += p[1]; }
        return { lon: lon / ring.length, lat: lat / ring.length };
    }

    function keepRingForRegion(regionName, ring) {
        const bb = ringBBox(ring);
        const c = ringCentroid(ring);

        if (regionName === "Europe") {
            // Keep only "Europe-ish" rings; this drops Greenland, Caribbean, etc.
            // You can tweak these numbers, but this works well in practice.
            const EURO = { minLon: -31, maxLon: 45, minLat: 34, maxLat: 72 };

            const inside =
                c.lon >= EURO.minLon && c.lon <= EURO.maxLon &&
                c.lat >= EURO.minLat && c.lat <= EURO.maxLat;

            if (!inside) return false;

            // Optional: also drop rings that are mostly outside even if centroid is inside
            const overlap =
                bb.minLon <= EURO.maxLon && bb.maxLon >= EURO.minLon &&
                bb.minLat <= EURO.maxLat && bb.maxLat >= EURO.minLat;

            return overlap;
        }

        return true;
    }


    function lonLatBBoxOfFeature(f) {
        let minLon = +Infinity, maxLon = -Infinity, minLat = +Infinity, maxLat = -Infinity;

        function visitCoord(coord) {
            const lon = coord[0], lat = coord[1];
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
        }

        function walkCoords(coords) {
            if (typeof coords[0] === "number") {
                visitCoord(coords);
            } else {
                for (const c of coords) walkCoords(c);
            }
        }

        walkCoords(f.geometry.coordinates);
        return { minLon, maxLon, minLat, maxLat };
    }

    function buildSilhouetteForContinent(continentName, targetW = 120, targetH = 60) {
        if (!neCountries) return null;
        if (silhouetteCache.has(continentName)) return silhouetteCache.get(continentName);

        const feats = featuresForRegion(continentName);
        if (!feats.length) return null;

        // -----------------------------
        // 1) Compute per-feature bboxes
        // -----------------------------
        const boxes = feats.map(lonLatBBoxOfFeature);

        // Global bbox (all features)
        let gMinLon = +Infinity, gMaxLon = -Infinity, gMinLat = +Infinity, gMaxLat = -Infinity;
        for (const bb of boxes) {
            gMinLon = Math.min(gMinLon, bb.minLon);
            gMaxLon = Math.max(gMaxLon, bb.maxLon);
            gMinLat = Math.min(gMinLat, bb.minLat);
            gMaxLat = Math.max(gMaxLat, bb.maxLat);
        }

        const gLonSpan = Math.max(1e-9, gMaxLon - gMinLon);
        const gLatSpan = Math.max(1e-9, gMaxLat - gMinLat);

        // Center of global bbox
        const gCx = (gMinLon + gMaxLon) / 2;
        const gCy = (gMinLat + gMaxLat) / 2;

        // Feature is an outlier if it's tiny AND far from the main mass
        function isOutlier(bb) {
            const lonSpan = bb.maxLon - bb.minLon;
            const latSpan = bb.maxLat - bb.minLat;

            // relative "area" proxy (unitless)
            const relArea = (lonSpan / gLonSpan) * (latSpan / gLatSpan);

            // normalized distance of bbox center to global center
            const cx = (bb.minLon + bb.maxLon) / 2;
            const cy = (bb.minLat + bb.maxLat) / 2;
            const d = Math.hypot((cx - gCx) / gLonSpan, (cy - gCy) / gLatSpan);

            return (relArea < 0.003) && (d > 0.55);
        }

        function isCanariesRing(ring) {
            // Canaries approx box: lon [-19, -12], lat [27, 30]
            let inside = 0;
            for (const [lon, lat] of ring) {
                if (lon >= -19 && lon <= -12 && lat >= 27 && lat <= 30) inside++;
            }
            return inside / ring.length > 0.6; // most points in the box
        }

        // ------------------------------------------
        // 2) Recompute bbox ignoring bbox-outliers
        // ------------------------------------------
        let minLon = +Infinity, maxLon = -Infinity, minLat = +Infinity, maxLat = -Infinity;
        let kept = 0;

        for (let k = 0; k < feats.length; k++) {
            const bb = boxes[k];
            if (isOutlier(bb)) continue;
            kept++;

            minLon = Math.min(minLon, bb.minLon);
            maxLon = Math.max(maxLon, bb.maxLon);
            minLat = Math.min(minLat, bb.minLat);
            maxLat = Math.max(maxLat, bb.maxLat);
        }

        // Fallback: if we removed too many, revert to global bbox
        if (kept < Math.max(2, Math.floor(0.6 * feats.length))) {
            minLon = gMinLon; maxLon = gMaxLon; minLat = gMinLat; maxLat = gMaxLat;
        }

        // -----------------------------
        // 3) Render silhouette normally
        // -----------------------------
        const c = document.createElement("canvas");
        c.width = targetW;
        c.height = targetH;
        const g = c.getContext("2d");

        function projLocal(lon, lat) {
            const x = ((lon - minLon) / Math.max(1e-9, (maxLon - minLon))) * targetW;
            const y = ((maxLat - lat) / Math.max(1e-9, (maxLat - minLat))) * targetH;

            if (continentName === "Middle East") {
                const s = 0.62;            // < 1 shrinks the shape
                const cx = targetW / 2, cy = targetH / 2;
                return [cx + (x - cx) * s, cy + (y - cy) * s];
            }
            if (continentName === "South America") {
                const s = 0.7;            // < 1 shrinks the shape
                const cx = targetW / 2, cy = targetH / 2;
                return [cx + (x - cx) * s, y];
            }
            // --- Europe: shift slightly left (optional fine tuning) ---
            if (continentName === "Europe") {
                const shiftX = -30;   // tweak between -4 and -10 if needed
                return [x + shiftX, y];
            }
            return [x, y];
        }

        g.clearRect(0, 0, targetW, targetH);
        g.fillStyle = "rgba(165, 214, 167, 0.85)";
        g.beginPath();

        function ringBBox(ring) {
            let minLon = +Infinity, maxLon = -Infinity;
            let minLat = +Infinity, maxLat = -Infinity;

            for (const [lon, lat] of ring) {
                if (lon < minLon) minLon = lon;
                if (lon > maxLon) maxLon = lon;
                if (lat < minLat) minLat = lat;
                if (lat > maxLat) maxLat = lat;
            }
            return { minLon, maxLon, minLat, maxLat };
        }

        function shouldDropRing(ring) {
            const bb = ringBBox(ring);

            const lonSpan = bb.maxLon - bb.minLon;
            const latSpan = bb.maxLat - bb.minLat;

            const relArea =
                (lonSpan / gLonSpan) *
                (latSpan / gLatSpan);

            const cx = (bb.minLon + bb.maxLon) / 2;
            const cy = (bb.minLat + bb.maxLat) / 2;

            const d = Math.hypot(
                (cx - gCx) / gLonSpan,
                (cy - gCy) / gLatSpan
            );

            return (relArea < 0.002) && (d > 0.5);
        }

        function drawRing(ring) {
            if (!keepRingForRegion(continentName, ring)) return;
            // (your existing Canaries filter can stay, but it becomes mostly unnecessary)
            // if (continentName === "Europe" && isCanariesRing(ring)) return;

            for (let i = 0; i < ring.length; i++) {
                const [x, y] = projLocal(ring[i][0], ring[i][1]);
                if (i === 0) g.moveTo(x, y);
                else g.lineTo(x, y);
            }
            g.closePath();
        }

        for (const f of feats) {
            const geom = f.geometry;
            if (!geom) continue;

            if (geom.type === "Polygon") {
                // ONLY outer ring (skip holes)
                drawRing(geom.coordinates[0]);
            } else if (geom.type === "MultiPolygon") {
                for (const poly of geom.coordinates) {
                    // poly[0] is outer ring
                    drawRing(poly[0]);
                }
            }
        }

        // use normal fill (not evenodd)
        g.fill();

        const out = { canvas: c, w: targetW, h: targetH };
        silhouetteCache.set(continentName, out);
        return out;
    }

    function drawLocationBadgeBehind(seqX, seqY, locationName) {
        // Calculate scaling factor based on number of tips
        const __nTips = (typeof numTipsSelect !== 'undefined' && numTipsSelect) ? parseInt(numTipsSelect.value, 10) : 3;
        const scaleFactor = __nTips <= 3 ? 1 : Math.max(0.5, 1 - (__nTips - 3) * 0.06);

        // Badge extends behind sequence and below label
        const badgeW = Math.max(110, locationName.length * 7.5) * scaleFactor;
        const sequenceHeight = 18 * scaleFactor; // approximate height of sequence boxes
        const badgeH = (sequenceHeight + 34 + 30) * scaleFactor; // cover sequence + label area
        const fontSize = Math.max(9, 12 * scaleFactor);

        const x0 = seqX - badgeW / 2;
        const y0 = seqY - sequenceHeight + 20 * scaleFactor; // start above sequence

        // silhouette (background)
        const sil = buildSilhouetteForContinent(locationName, Math.round(badgeW), Math.round(badgeH));
        if (sil) {
            ctx.save();
            ctx.globalAlpha = 1.0; // alpha already in silhouette fillStyle
            // ctx.drawImage(sil.canvas, x0, y0, badgeW, badgeH);
            // if (showChoroplethMap && WORLD_GEOJSON) {
            //     drawCountryMapInRect(ctx, x0, y0, badgeW, badgeH);
            //   } else {
                ctx.drawImage(sil.canvas, x0, y0, badgeW, badgeH);
                // ctx.drawImage(worldMapImg, panelX, panelY, panelW, panelH);
            //   }
            ctx.restore();
        }

        // subtle white overlay to improve text readability
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        const r = 6 * scaleFactor;
        ctx.beginPath();
        ctx.moveTo(x0 + r, y0);
        ctx.arcTo(x0 + badgeW, y0, x0 + badgeW, y0 + badgeH, r);
        ctx.arcTo(x0 + badgeW, y0 + badgeH, x0, y0 + badgeH, r);
        ctx.arcTo(x0, y0 + badgeH, x0, y0, r);
        ctx.arcTo(x0, y0, x0 + badgeW, y0, r);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // foreground label (text)
        ctx.fillStyle = "#2e4d2e";
        ctx.font = `bold ${fontSize}px "DM Sans"`;
        ctx.textAlign = "center";
        ctx.fillText(locationName, seqX, y0 + badgeH - 13 * scaleFactor - 40 * scaleFactor);
    }

    // Project lon/lat to canvas x/y (simple equirectangular projection)
    function projectEquirect(lon, lat, offsetX, offsetY, w, h) {
        // lon in [-180, 180], lat in [-90, 90]
        const x = offsetX + ((lon + 180) / 360) * w;
        const y = offsetY + ((90 - lat) / 180) * h;
        return [x, y];
    }

    // Draw GeoJSON land data on canvas
    function drawGeoJSONLand(ctx, geojson, offsetX, offsetY, w, h) {
        const drawRing = (ring) => {
            ring.forEach((pt, i) => {
                const [lon, lat] = pt;
                const [x, y] = projectEquirect(lon, lat, offsetX, offsetY, w, h);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.closePath();
        };

        for (const feat of geojson.features) {
            const g = feat.geometry;
            if (!g) continue;

            ctx.beginPath();
            if (g.type === "Polygon") {
                g.coordinates.forEach(drawRing);
            } else if (g.type === "MultiPolygon") {
                g.coordinates.forEach(poly => poly.forEach(drawRing));
            }
            ctx.fill();
            ctx.stroke();
        }
    }

    function drawPhylogeography() {
        // Draw proper world map in top right corner
        const baseX = canvas.width - 360;
        const baseY = 50;
        const dx = PANEL_VIEW.geo.x;
        const dy = PANEL_VIEW.geo.y;
        const z = PANEL_VIEW.geo.z;
        const offsetX = baseX + dx;
        const offsetY = baseY + dy;
        const mapWidth = 342 * z;
        const mapHeight = 200 * z;

        // Draw ocean background
        ctx.fillStyle = '#e3f2fd';
        ctx.fillRect(offsetX, offsetY, mapWidth, mapHeight);
        ctx.strokeStyle = '#90a4ae';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(offsetX, offsetY, mapWidth, mapHeight);

        // Draw land masses from GeoJSON
        // if (worldLandGeoJSON) {
        //     ctx.fillStyle = '#a5d6a7';
        //     ctx.strokeStyle = '#66bb6a';
        //     ctx.lineWidth = 0.5;
        //     drawGeoJSONLand(ctx, worldLandGeoJSON, offsetX, offsetY, mapWidth, mapHeight);
        // } else {
        //     // Fallback: show loading text
        //     ctx.fillStyle = '#666';
        //     ctx.font = '12px "DM Sans"';
        //     ctx.textAlign = 'center';
        //     ctx.textBaseline = 'middle';
        //     ctx.fillText('Loading map...', offsetX + mapWidth / 2, offsetY + mapHeight / 2);
        // }
        if (showChoroplethMap) {
            // colored countries map
            if (!WORLD_GEOJSON) {
              // kick off async load once
              loadWorldGeoJSON().catch(err => console.warn("loadWorldGeoJSON failed:", err));
            }
            drawCountryMapInRect(ctx, offsetX, offsetY, mapWidth, mapHeight);
          } else {
            // original green land map
            if (worldLandGeoJSON) {
              ctx.fillStyle = '#a5d6a7';
              ctx.strokeStyle = '#66bb6a';
              ctx.lineWidth = 0.5;
              drawGeoJSONLand(ctx, worldLandGeoJSON, offsetX, offsetY, mapWidth, mapHeight);
            } else {
              ctx.fillStyle = '#666';
              ctx.font = '12px "DM Sans"';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('Loading map.', offsetX + mapWidth/2, offsetY + mapHeight/2);
            }
          }

        // Clip to map bounds
        ctx.save();
        ctx.beginPath();
        ctx.rect(offsetX, offsetY, mapWidth, mapHeight);
        ctx.clip();

        // Draw the stars (trail + dot) for visible sequences
        geoStars.forEach(({ sequenceId, star, color }) => {
            const seq = sequences.find(s => s.sequenceId === sequenceId);
            if (!seq || seq.hideInTimeTravel) return;

            // If trackAllBranches is off, only show sequences with trackedGeo=true (Root → Tip 1)
            // If trackAllBranches is on, show all sequences
            const shouldShow = trackAllBranches || seq.trackedGeo;
            if (shouldShow) {
                // Apply fixed horizontal offset based on color to separate overlapping dots
                // Dot radius is 4.5, so half the diameter is ~4.5 pixels
                let offset = { x: 0, y: 0 };
                if (trackAllBranches) {
                    // Red (root-internal, internal-tip1): center (no offset)
                    if (color === 'rgba(239, 68, 68, 1)') {
                        offset = { x: 0, y: 0 };
                    }
                    // Yellow (root-tip3): shift left
                    else if (color === 'rgba(234, 179, 8, 1)') {
                        offset = { x: -4.5, y: 0 };
                    }
                    // Orange (internal-tip2): shift right
                    else if (color === 'rgba(249, 115, 22, 1)') {
                        offset = { x: 4.5, y: 0 };
                    }
                }
                star.draw(ctx, color, offset);
            }
        });

        ctx.restore();

        // Add title
        ctx.fillStyle = '#555';
        ctx.font = 'bold 14px "DM Sans"';
        ctx.textAlign = 'center';
        ctx.fillText('Spatial Diffusion', offsetX + mapWidth / 2, offsetY - 12);
    }

    function drawHostTransmission() {
        if (hostCTMCs.length === 0) return;

        // Draw host transmission panel in middle-right
        const baseX = canvas.width - 360;
        const baseY = 280 + (0.71 * 96 / 2.54); // ~ +26.85 pixels
        const dx = PANEL_VIEW.host.x;
        const dy = PANEL_VIEW.host.y;
        const z = PANEL_VIEW.host.z;
        const panelX = baseX + dx;
        const panelY = baseY + dy;
        const panelWidth = 342 * z;
        const panelHeight = 280 * z;

        // Add title
        ctx.fillStyle = '#555';
        ctx.font = 'bold 14px "DM Sans"';
        ctx.textAlign = 'center';
        ctx.fillText('Host Transmission', panelX + panelWidth / 2, panelY - 12);

        // Host positions (arranged in a circle-ish pattern)
        const centerX = panelX + panelWidth / 2;
        const centerY = panelY + panelHeight / 2;
        const radius = 95;

        const hostPositions = [];
        const numHosts = hostStates.length;
        for (let i = 0; i < numHosts; i++) {
            const angle = (i / numHosts) * Math.PI * 2 - Math.PI / 2; // Start from top
            hostPositions.push({
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
                name: hostStates[i].name
            });
        }

        // Collect all current and target hosts from all CTMCs (only if not tracking all branches)
        const activeHosts = new Set();
        if (!trackAllHostBranches) {
            hostCTMCs.forEach(({ ctmc }) => {
                activeHosts.add(ctmc.getCurrentHostIndex());
                if (ctmc.isTransmitting()) {
                    activeHosts.add(ctmc.getTargetHostIndex());
                }
            });
        }

        // Draw hosts
        hostPositions.forEach((pos, i) => {
            const isActiveHost = activeHosts.has(i);

            // Draw host with scale based on selection - make pig 50% bigger
            let scale = (isActiveHost ? 0.5 : 0.4) * z;
            if (pos.name === "Pig") {
                scale = scale * 1.3;
            }

            // --- icon/label geometry tweaks ---
            const labelY = pos.y + 48 * z;
            const iconYOffset = (pos.name === "Bat") ? (14 * z) : (pos.name === "Pig") ? (-10 * z) : (pos.name === "Mosquito") ? (15 * z) : 0;
            const iconY = pos.y + iconYOffset;

            // Highlight background for active hosts (only when not tracking all branches)
            if (isActiveHost && !trackAllHostBranches) {
                ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
                ctx.beginPath();
                ctx.arc(pos.x, iconY, 50 * z, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw the host icon
            HOST_ICON[pos.name](ctx, pos.x, iconY, scale);

            // Draw host label (highlight only when not tracking all branches)
            if (isActiveHost && !trackAllHostBranches) {
                ctx.fillStyle = '#3b82f6';
                ctx.font = `bold ${11 * z}px "DM Sans"`;
            } else {
                ctx.fillStyle = '#666';
                ctx.font = `${10 * z}px "DM Sans"`;
            }
            ctx.textAlign = 'center';
            ctx.fillText(pos.name, pos.x, labelY);
        });

        // Draw each virus with its color (1/3rd smaller = 2/3 scale)
        hostCTMCs.forEach(({ sequenceId, ctmc, color }) => {
            const seq = sequences.find(s => s.sequenceId === sequenceId);
            if (!seq) return;

            // Only show if trackAllHostBranches is on, or if this is the tracked sequence
            const shouldShow = trackAllHostBranches || seq.tracked;
            if (!shouldShow) return;

            // Apply fixed horizontal offset based on color to separate overlapping viruses
            let offset = { x: 0, y: 0 };
            if (trackAllHostBranches) {
                // Red (root-internal, internal-tip1): center (no offset)
                if (color === 'rgba(239, 68, 68, 1)') {
                    offset = { x: 0, y: 0 };
                }
                // Yellow (root-tip3): shift left
                else if (color === 'rgba(234, 179, 8, 1)') {
                    offset = { x: -8, y: 0 };
                }
                // Orange (internal-tip2): shift right
                else if (color === 'rgba(249, 115, 22, 1)') {
                    offset = { x: 8, y: 0 };
                }
            }

            if (ctmc.isTransmitting()) {
                // Virus is jumping from current to target
                // const currentPos = hostPositions[ctmc.getCurrentHostIndex()];
                // const targetPos = hostPositions[ctmc.getTargetHostIndex()];
                
                const curRaw = ctmc.getCurrentHostIndex();
const tarRaw = ctmc.getTargetHostIndex();

if (!Number.isFinite(curRaw) || !Number.isFinite(tarRaw)) return;

const curIdx = Math.max(0, Math.min(hostPositions.length - 1, curRaw | 0));
const tarIdx = Math.max(0, Math.min(hostPositions.length - 1, tarRaw | 0));

const currentPos = hostPositions[curIdx];
const targetPos  = hostPositions[tarIdx];

if (!currentPos || !targetPos) return;
const t = ctmc.getTransmissionProgress();

                // Ease function for smooth motion
                const easeT = t * t * (3 - 2 * t);

                const virusX = currentPos.x + (targetPos.x - currentPos.x) * easeT + offset.x;
                const virusY = currentPos.y + (targetPos.y - currentPos.y) * easeT + offset.y;

                // Draw path
                ctx.strokeStyle = color.replace('1)', '0.3)'); // Make semi-transparent
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(currentPos.x + offset.x, currentPos.y + offset.y);
                ctx.lineTo(targetPos.x + offset.x, targetPos.y + offset.y);
                ctx.stroke();
                ctx.setLineDash([]);

                // Draw jumping virus (1/3rd smaller = 0.6 * 2/3 = 0.4)
                drawVirus(ctx, virusX, virusY, 0.4, color);
            } else {
                // Virus is in current host (1/3rd smaller = 0.5 * 2/3 = 0.33)
                const currentPos = hostPositions[ctmc.getCurrentHostIndex()];
                drawVirus(ctx, currentPos.x + offset.x, currentPos.y - 5 + offset.y, 0.33, color);
            }
        });
    }

    function drawCTMC(currentNucleotide = null, previousNucleotide = null, transitionProgress = 1) {
        // Draw CTMC (Continuous Time Markov Chain) in top left corner
        const baseX = 80;
        const baseY = 80;
        const dx = PANEL_VIEW.phylo.x;
        const dy = PANEL_VIEW.phylo.y;
        const z = PANEL_VIEW.phylo.z;
        ctx.save();
        ctx.translate(baseX + dx, baseY + dy);
        ctx.scale(z, z);
        ctx.translate(-baseX, -baseY);

        const offsetX = baseX;
        const offsetY = baseY;
        const size = 120;  // Doubled from 60

        // Define square vertices with nucleotides
        const vertices = [
            { x: offsetX, y: offsetY, nucleotide: 'A' },           // top-left
            { x: offsetX + size, y: offsetY, nucleotide: 'T' },    // top-right
            { x: offsetX + size, y: offsetY + size, nucleotide: 'G' }, // bottom-right
            { x: offsetX, y: offsetY + size, nucleotide: 'C' }     // bottom-left
        ];

        // Draw edges between all vertices (showing all possible transitions)
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 2;

        // Function to draw arrow head
        function drawArrowHead(fromX, fromY, toX, toY, color = '#bdc3c7') {
            const headLength = 8;
            const angle = Math.atan2(toY - fromY, toX - fromX);

            // Shorten the line to stop at vertex edge (radius 16)
            const shortenDistance = 16;
            const dx = toX - fromX;
            const dy = toY - fromY;
            const length = Math.sqrt(dx * dx + dy * dy);
            const ratio = (length - shortenDistance) / length;
            const endX = fromX + dx * ratio;
            const endY = fromY + dy * ratio;

            ctx.strokeStyle = color;
            ctx.fillStyle = color;

            // Draw arrow head
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(
                endX - headLength * Math.cos(angle - Math.PI / 6),
                endY - headLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
                endX - headLength * Math.cos(angle + Math.PI / 6),
                endY - headLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
        }

        // Draw all edges with bidirectional arrows
        // Horizontal and vertical edges
        for (let i = 0; i < vertices.length; i++) {
            const next = (i + 1) % vertices.length;
            const from = vertices[i];
            const to = vertices[next];

            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();

            // Draw arrow heads in both directions
            drawArrowHead(from.x, from.y, to.x, to.y);
            drawArrowHead(to.x, to.y, from.x, from.y);
        }

        // Diagonal edges
        // Diagonal 1: top-left to bottom-right
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        ctx.lineTo(vertices[2].x, vertices[2].y);
        ctx.stroke();
        drawArrowHead(vertices[0].x, vertices[0].y, vertices[2].x, vertices[2].y);
        drawArrowHead(vertices[2].x, vertices[2].y, vertices[0].x, vertices[0].y);

        // Diagonal 2: top-right to bottom-left
        ctx.beginPath();
        ctx.moveTo(vertices[1].x, vertices[1].y);
        ctx.lineTo(vertices[3].x, vertices[3].y);
        ctx.stroke();
        drawArrowHead(vertices[1].x, vertices[1].y, vertices[3].x, vertices[3].y);
        drawArrowHead(vertices[3].x, vertices[3].y, vertices[1].x, vertices[1].y);

        // Draw vertices (nucleotide circles)
        vertices.forEach(v => {
            ctx.fillStyle = colors[v.nucleotide];
            ctx.beginPath();
            ctx.arc(v.x, v.y, 16, 0, Math.PI * 2);
            ctx.fill();

            // Draw nucleotide letter
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px "JetBrains Mono"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(v.nucleotide, v.x, v.y);
        });

        // Draw tracking point with transition animation
        if (currentNucleotide) {
            const currentVertex = vertices.find(v => v.nucleotide === currentNucleotide);

            if (previousNucleotide && transitionProgress < 1) {
                // Animating transition
                const previousVertex = vertices.find(v => v.nucleotide === previousNucleotide);
                if (previousVertex && currentVertex) {
                    // Interpolate position along the edge/diagonal
                    const x = previousVertex.x + (currentVertex.x - previousVertex.x) * transitionProgress;
                    const y = previousVertex.y + (currentVertex.y - previousVertex.y) * transitionProgress;

                    // Draw trail
                    ctx.strokeStyle = '#2c3e50';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(previousVertex.x, previousVertex.y);
                    ctx.lineTo(x, y);
                    ctx.stroke();

                    // Draw arrow head on trail
                    const headLength = 8;
                    const angle = Math.atan2(y - previousVertex.y, x - previousVertex.x);
                    ctx.fillStyle = '#2c3e50';
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(
                        x - headLength * Math.cos(angle - Math.PI / 6),
                        y - headLength * Math.sin(angle - Math.PI / 6)
                    );
                    ctx.lineTo(
                        x - headLength * Math.cos(angle + Math.PI / 6),
                        y - headLength * Math.sin(angle + Math.PI / 6)
                    );
                    ctx.closePath();
                    ctx.fill();

                    // Draw moving dot
                    ctx.fillStyle = '#2c3e50';
                    ctx.beginPath();
                    ctx.arc(x, y, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (currentVertex) {
                // Stationary at current vertex
                // Draw outer ring touching the nucleotide border (radius = 16)
                ctx.strokeStyle = '#2c3e50';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(currentVertex.x, currentVertex.y, 16, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Add label
        ctx.fillStyle = '#555';
        ctx.font = 'bold 14px "DM Sans"';
        ctx.textAlign = 'center';
        ctx.fillText('Genetic mutations', offsetX + size / 2, offsetY - 35);

        // Add tracking info
        ctx.fillStyle = '#888';
        ctx.font = '11px "DM Sans"';
        ctx.fillText('Tracking: 1st nucleotide (Root → Tip 1)', offsetX + size / 2, offsetY + size + 30);
        ctx.restore();
    }

    function drawCTMCLegend() {
        // Draw legend below CTMC in two rows mirroring the square layout
        const baseX = 80;
        const baseY = 80;
        const dx = PANEL_VIEW.phylo.x;
        const dy = PANEL_VIEW.phylo.y;
        const z = PANEL_VIEW.phylo.z;
        ctx.save();
        ctx.translate(baseX + dx, baseY + dy);
        ctx.scale(z, z);
        ctx.translate(-baseX, -baseY);

        const offsetX = 80;
        const offsetY = 260; // Below CTMC and tracking label
        const boxSize = 18;
        const horizontalSpacing = 85;
        const verticalSpacing = 24;

        // Row 1: A and T (top row of CTMC)
        // A (Adenine)
        ctx.fillStyle = colors['A'];
        ctx.fillRect(offsetX, offsetY, boxSize, boxSize);

        // Draw white letter inside box
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px "JetBrains Mono"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('A', offsetX + boxSize / 2, offsetY + boxSize / 2);

        // Draw label
        ctx.fillStyle = '#555';
        ctx.font = '11px "DM Sans"';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Adenine', offsetX + boxSize + 6, offsetY + boxSize / 2);

        // T (Thymine)
        ctx.fillStyle = colors['T'];
        ctx.fillRect(offsetX + horizontalSpacing, offsetY, boxSize, boxSize);

        // Draw white letter inside box
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px "JetBrains Mono"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('T', offsetX + horizontalSpacing + boxSize / 2, offsetY + boxSize / 2);

        // Draw label
        ctx.fillStyle = '#555';
        ctx.font = '11px "DM Sans"';
        ctx.textAlign = 'left';
        ctx.fillText('Thymine', offsetX + horizontalSpacing + boxSize + 6, offsetY + boxSize / 2);

        // Row 2: C and G (bottom row of CTMC)
        const row2Y = offsetY + verticalSpacing;

        // C (Cytosine)
        ctx.fillStyle = colors['C'];
        ctx.fillRect(offsetX, row2Y, boxSize, boxSize);

        // Draw white letter inside box
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px "JetBrains Mono"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('C', offsetX + boxSize / 2, row2Y + boxSize / 2);

        // Draw label
        ctx.fillStyle = '#555';
        ctx.font = '11px "DM Sans"';
        ctx.textAlign = 'left';
        ctx.fillText('Cytosine', offsetX + boxSize + 6, row2Y + boxSize / 2);

        // G (Guanine)
        ctx.fillStyle = colors['G'];
        ctx.fillRect(offsetX + horizontalSpacing, row2Y, boxSize, boxSize);

        // Draw white letter inside box
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px "JetBrains Mono"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('G', offsetX + horizontalSpacing + boxSize / 2, row2Y + boxSize / 2);

        // Draw label
        ctx.fillStyle = '#555';
        ctx.font = '11px "DM Sans"';
        ctx.textAlign = 'left';
        ctx.fillText('Guanine', offsetX + horizontalSpacing + boxSize + 6, row2Y + boxSize / 2);
        ctx.restore();
    }

    function drawSequence(seq, showHighlight = false) {
        // Calculate scaling factors based on number of tips
        const __nTips = (typeof numTipsSelect !== 'undefined' && numTipsSelect) ? parseInt(numTipsSelect.value, 10) : 3;
        const scaleFactor = __nTips <= 3 ? 1 : Math.max(0.5, 1 - (__nTips - 3) * 0.06);

        const boxSize = 15 * scaleFactor;
        const spacing = 2 * scaleFactor;
        const fontSize = Math.max(8, 10 * scaleFactor);
        const highlightWidth = 3 * scaleFactor;
        const trackingStrokeWidth = 2 * scaleFactor;

        const totalWidth = (boxSize + spacing) * seq.sequence.length - spacing;
        const startX = seq.x - totalWidth / 2;

        seq.sequence.forEach((nucleotide, i) => {
            const x = startX + i * (boxSize + spacing);
            const y = seq.y - 5 * scaleFactor;

            // Draw box with slight shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
            ctx.shadowBlur = 4 * scaleFactor;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2 * scaleFactor;

            ctx.fillStyle = colors[nucleotide];
            ctx.fillRect(x, y, boxSize, boxSize);

            ctx.shadowColor = 'transparent';

            // Draw nucleotide letter
            ctx.fillStyle = 'white';
            ctx.font = `bold ${fontSize}px "JetBrains Mono"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(nucleotide, x + boxSize / 2, y + boxSize / 2);

            // Highlight if recently mutated
            if (seq.mutatedIndices && seq.mutatedIndices.includes(i)) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = highlightWidth;
                ctx.strokeRect(x - 2 * scaleFactor, y - 2 * scaleFactor, boxSize + 4 * scaleFactor, boxSize + 4 * scaleFactor);
            }

            // Draw tracking square around first nucleotide if this sequence is tracked
            if (showHighlight && i === 0) {
                ctx.strokeStyle = '#2c3e50';
                ctx.lineWidth = trackingStrokeWidth;
                ctx.strokeRect(x - 3 * scaleFactor, y - 3 * scaleFactor, boxSize + 6 * scaleFactor, boxSize + 6 * scaleFactor);
            }
        });
    }

    function mutateSequence(sequence) {
        const newSequence = [...sequence];
        const mutatedIndices = [];

        newSequence.forEach((nucleotide, i) => {
            if (seededRandom() < mutationRate * speed / 60) {
                const otherNucleotides = nucleotides.filter(n => n !== nucleotide);
                newSequence[i] = otherNucleotides[Math.floor(seededRandom() * otherNucleotides.length)];
                mutatedIndices.push(i);
            }
        });

        return { sequence: newSequence, mutatedIndices };
    }

    function createSequence(
        x,
        y,
        targetX,
        targetY,
        sequence,
        parentNodeId = null,
        started = false,
        tracked = false,
        targetNodeId = null
    ) {
        // If we know node IDs, snap start/target coords to the CURRENT tree geometry
        // (robust even if the tree is rebuilt).
        const parentNode = parentNodeId ? findNodeById(tree, parentNodeId) : null;
        const targetNode = targetNodeId ? findNodeById(tree, targetNodeId) : null;

        const startX = parentNode ? parentNode.x : x;
        const startY = parentNode ? parentNode.y : y;

        const endX = targetNode ? targetNode.x : targetX;
        const endY = targetNode ? targetNode.y : targetY;

        const distance = Math.hypot(endX - startX, endY - startY) || 1;

        return {
            // current position (will be updated)
            x: startX,
            y: startY,

            // pixel destination (kept in sync each frame from targetNodeId)
            targetX: endX,
            targetY: endY,

            // NEW: identity-based targeting
            parentNodeId: parentNodeId,
            targetNodeId: targetNodeId,

            sequence: [...sequence],
            progress: 0,
            mutatedIndices: [],
            started: started,
            tracked: tracked,

            distance: distance,
            sequenceId: nextSequenceId++,
            parentSequenceId: null,
            branchSegments: { phylo: [], geo: [], host: [] },
        };
    }
    // =============================
    // GLOBAL branch-segment registry
    // (persists even after a seq is split)
    // =============================
    const BRANCH_SEGMENTS = {
        phylo: new Map(),  // edgeKey -> [segments...]
        geo: new Map(),
        host: new Map(),
    };

    function clearBranchSegments() {
        BRANCH_SEGMENTS.phylo.clear();
        BRANCH_SEGMENTS.geo.clear();
        BRANCH_SEGMENTS.host.clear();
    }
    function edgeKeyFromSeq(seq) {
        if (!seq.parentNodeId || !seq.targetNodeId) return null;
        return `${seq.parentNodeId}->${seq.targetNodeId}`;
    }

    function upsertBranchSegment(seq, processKey, stateKey, color, progress01) {
        const key = edgeKeyFromSeq(seq);
        if (!key) return;

        const p = Math.max(0, Math.min(1, progress01));

        // ---- (A) write to per-seq store (optional, can keep) ----
        const localArr = seq.branchSegments?.[processKey];
        if (localArr) {
            const last = localArr.length ? localArr[localArr.length - 1] : null;
            if (last && last.edgeKey === key && last.stateKey === stateKey) {
                last.p1 = Math.max(last.p1, p);
            } else {
                localArr.push({ edgeKey: key, stateKey, color, p0: p, p1: p });
            }
        }

        // ---- (B) write to GLOBAL store (this is the important part) ----
        const map = BRANCH_SEGMENTS[processKey];
        if (!map) return;

        if (!map.has(key)) map.set(key, []);
        const arr = map.get(key);

        const last = arr.length ? arr[arr.length - 1] : null;
        if (last && last.stateKey === stateKey) {
            last.p1 = Math.max(last.p1, p);
        } else {
            arr.push({ stateKey, color, p0: p, p1: p });
        }
    }
    // When a lineage finishes an edge (reaches a node), we want segments to end at 1.
    function finalizeEdgeSegmentsAtOne(seq) {
        if (!seq.branchSegments) return;
        for (const k of ['phylo', 'geo', 'host']) {
            const arr = seq.branchSegments[k];
            if (arr && arr.length) arr[arr.length - 1].p1 = 1;
        }
    }


    // History tracking functions
    function recordHistorySnapshot() {
        if (timeTravelMode) return; // Don't record while in time travel mode

        // Record current state of all sequences
        sequences.forEach(seq => {
            if (!animationHistory.sequences.has(seq.sequenceId)) {
                animationHistory.sequences.set(seq.sequenceId, []);
            }

            const history = animationHistory.sequences.get(seq.sequenceId);

            // Find corresponding geo star
            const starObj = geoStars.find(gs => gs.sequenceId === seq.sequenceId);
            const geoState = starObj ? starObj.star.i : 0;

            // Get host state for this sequence
            const hostCtmcObj = hostCTMCs.find(h => h.sequenceId === seq.sequenceId);
            const hostState = hostCtmcObj ? hostCtmcObj.ctmc.i : 0;

            // Calculate progress based on distance from root
            // Use Euclidean distance as a proxy for progress along the tree
            const distFromRoot = Math.hypot(seq.x - tree.x, seq.y - tree.y);
            const maxDist = calculateTreeDepth();
            const progress = Math.min(1.0, distFromRoot / maxDist);

            // Only record if this is a new state (different from last recorded)
            if (history.length === 0 ||
                Math.abs(history[history.length - 1].progress - progress) > 0.01 ||
                seq.fixated) {

                // Record snapshot
                history.push({
                    progress: progress,
                    sequence: [...seq.sequence],
                    x: seq.x,
                    y: seq.y,
                    geoState: geoState,
                    hostState: hostState,
                    fixated: seq.fixated
                });

                // Track maximum progress
                animationHistory.maxProgress = Math.max(animationHistory.maxProgress, progress);
            }
        });

        animationHistory.initialized = true;
    }

    function getHistoryAtTime(sequenceId, timePos) {
        const history = animationHistory.sequences.get(sequenceId);
        if (!history || history.length === 0) {
            return null;
        }

        // Find the snapshot closest to the requested time position
        let closestSnapshot = history[0];
        let minDiff = Math.abs(history[0].progress - timePos);

        for (const snapshot of history) {
            const diff = Math.abs(snapshot.progress - timePos);
            if (diff < minDiff) {
                minDiff = diff;
                closestSnapshot = snapshot;
            }
        }

        return closestSnapshot;
    }

    // Calculate the maximum distance from root to any tip (tree depth)
    function calculateTreeDepth() {
        let maxDepth = 0;

        function traverse(node, depth) {
            if (node.children.length === 0) {
                // Tip node - update max depth
                maxDepth = Math.max(maxDepth, depth);
            } else {
                // Internal node - continue traversing
                node.children.forEach(child => {
                    const branchLength = Math.hypot(child.x - node.x, child.y - node.y);
                    traverse(child, depth + branchLength);
                });
            }
        }

        traverse(tree, 0);
        return maxDepth;
    }

    // Helper function to generate random distinct virus colors
    function generateRandomVirusColor(excludeColors = []) {
        const availableColors = [
            'rgba(239, 68, 68, 1)',    // Red
            'rgba(249, 115, 22, 1)',   // Orange
            'rgba(234, 179, 8, 1)',    // Yellow
            'rgba(34, 197, 94, 1)',    // Green
            'rgba(59, 130, 246, 1)',   // Blue
            'rgba(168, 85, 247, 1)',   // Purple
            'rgba(236, 72, 153, 1)',   // Pink
            'rgba(20, 184, 166, 1)',   // Teal
            'rgba(251, 146, 60, 1)',   // Amber
            'rgba(132, 204, 22, 1)',   // Lime
        ];

        // Filter out excluded colors
        const validColors = availableColors.filter(c => !excludeColors.includes(c));

        // If all colors are used, just pick randomly from all
        if (validColors.length === 0) {
            return availableColors[Math.floor(seededRandom() * availableColors.length)];
        }

        return validColors[Math.floor(seededRandom() * validColors.length)];
    }

    function initAnimation() {
        // Reset seed to ensure reproducibility
        const seedInput = document.getElementById('seedInput');
        if (seedInput) {
            setSeed(parseInt(seedInput.value) || 42);
        } else {
            setSeed(42); // fallback
        }

        sequences = [];
        nextSequenceId = 0; // Reset sequence ID counter
        clearBranchSegments();

        // Create sequences based on node identity (not coordinate)
        tree.children.forEach((child) => {
            const goesToInternal = (child.id === "internal"); // left branch in our builder
            const seq = createSequence(
                tree.x, tree.y,
                child.x, child.y,
                initialSequence,
                "root",          // parentNodeId (start from root)
                false,
                goesToInternal,
                child.id         // targetNodeId
            );

            // Keep branchIndex
            seq.branchIndex = goesToInternal ? 0 : 1;

            // Only internal-side lineage is geo-tracked by default
            seq.trackedGeo = goesToInternal;

            sequences.push(seq);
        });

        // Initialize CTMC state
        ctmcCurrentNucleotide = initialSequence[0];
        ctmcPreviousNucleotide = null;
        ctmcTransitionProgress = 1;

        // Initialize host transmission CTMCs - one per sequence with different colors
        hostCTMCs = [];

        const numTips = getNumTips();

        if (numTips === 3) {
            // Original 3-tip tree color scheme
            const virusColors = {
                'root-internal': 'rgba(239, 68, 68, 1)',   // Red for Root → Internal (will become Tip 1)
                'root-tip3': 'rgba(234, 179, 8, 1)',       // Yellow for Root → Tip 3
                'internal-tip1': 'rgba(239, 68, 68, 1)',   // Red for Internal → Tip 1
                'internal-tip2': 'rgba(249, 115, 22, 1)'   // Orange for Internal → Tip 2
            };

            sequences.forEach(seq => {
                // Determine lineage based on branch structure
                let lineage = 'root-internal'; // default

                // Check if this is heading to tip3 (branchIndex 1 from root)
                if (seq.branchIndex === 1 && seq.parentNodeId === "root") {
                    lineage = 'root-tip3';
                }

                const ctmc = new HostTransmissionCTMC(0); // Start with Human
                ctmc.setRate(transmissionRate);
                hostCTMCs.push({
                    sequenceId: seq.sequenceId,
                    ctmc: ctmc,
                    color: virusColors[lineage],
                    lineage: lineage
                });
            });
        } else {
            // Random color assignment for trees > 3 tips
            // Each initial sequence from root gets a random color
            const usedColors = [];

            sequences.forEach(seq => {
                const color = generateRandomVirusColor(usedColors);
                usedColors.push(color);

                const ctmc = new HostTransmissionCTMC(0); // Start with Human
                ctmc.setRate(transmissionRate);
                hostCTMCs.push({
                    sequenceId: seq.sequenceId,
                    ctmc: ctmc,
                    color: color,
                    lineage: 'random'
                });
            });
        }

        // Initialize geographic stars - create dynamically as sequences exist
        geoStars = [];
        sequences.forEach(seq => {
            // Only create stars for sequences that should be tracked
            const shouldTrack = trackAllBranches || seq.trackedGeo;
            if (shouldTrack) {
                const star = new GeoCTMCStar(0);
                star.setStickyPaths(stickyPaths);
                // Initialize head position
                const offsetX = canvas.width - 360;
                const offsetY = 50;
                const mapWidth = 342;
                const mapHeight = 200;
                const [x, y] = projectEquirect(geoStates[0].lon, geoStates[0].lat, offsetX, offsetY, mapWidth, mapHeight);
                star.headX = x;
                star.headY = y;

                // Get color from corresponding host CTMC
                const hostCtmcObj = hostCTMCs.find(h => h.sequenceId === seq.sequenceId);
                const color = hostCtmcObj ? hostCtmcObj.color : 'rgba(0, 0, 0, 1)';

                geoStars.push({
                    sequenceId: seq.sequenceId,
                    star: star,
                    color: color
                });
            }
        });
        lastTimeSec = null;

        // Initial render
        renderCurrentState();
    }

    // Unified render function - works for both normal animation and time travel
    function renderCurrentState() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // In observations mode, don't draw the tree
        if (!observationsMode) {
            drawTree();
        }

        // Find the tracked sequence and get its first nucleotide
        let trackedNucleotide = null;
        const trackedSequence = sequences.find(seq => seq.tracked);
        if (trackedSequence) {
            trackedNucleotide = trackedSequence.sequence[0];
        }

        // Show panels based on mode and settings
        if (showPhylogenetics && showPhyloPanel) {
            drawCTMC(ctmcCurrentNucleotide, ctmcPreviousNucleotide, ctmcTransitionProgress);
            drawCTMCLegend();
        }

        // Draw phylogeography map if enabled
        if (showPhylogeography && showGeoPanel) {
            drawPhylogeography();
        }

        // Draw host transmission panel if enabled
        if (showHostTransmission && showHostPanel) {
            drawHostTransmission();
        }

        // Draw continent location badges BEFORE sequences (so they appear behind)
        if (showPhylogeography && drawLocations && geoStars.length > 0) {
            geoStars.forEach(({ sequenceId, star }) => {
                const seq = sequences.find(s => s.sequenceId === sequenceId);
                if (!seq || seq.hideInTimeTravel) return;

                const shouldShow = trackAllBranches || seq.trackedGeo;
                if (shouldShow) {
                    const continentName = star.currentStateName();
                    drawLocationBadgeBehind(seq.x, seq.y, continentName);
                }
            });
        }

        // Draw sequences if phylogenetics is enabled
        if (showPhylogenetics) {
            sequences.forEach(seq => {
                // Skip sequences that should be hidden in time travel mode
                if (seq.hideInTimeTravel) return;

                const showHighlight = highlightTrackedNucleotide && seq.tracked;
                drawSequence(seq, showHighlight);
            });
        }

        // Draw continent names (simple text) if not using location badges
        if (showPhylogeography && !drawLocations && geoStars.length > 0) {
            // Calculate scaling factor based on number of tips
            const __nTips = (typeof numTipsSelect !== 'undefined' && numTipsSelect) ? parseInt(numTipsSelect.value, 10) : 3;
            const treeScaleFactor = __nTips <= 3 ? 1 : Math.max(0.5, 1 - (__nTips - 3) * 0.06);
            const fontSize = Math.max(9, 12 * treeScaleFactor);
            const textOffset = 21 * treeScaleFactor;

            geoStars.forEach(({ sequenceId, star }) => {
                const seq = sequences.find(s => s.sequenceId === sequenceId);
                if (!seq || seq.hideInTimeTravel) return;

                const shouldShow = trackAllBranches || seq.trackedGeo;
                if (shouldShow) {
                    const continentName = star.currentStateName();
                    ctx.fillStyle = '#555';
                    ctx.font = `${fontSize}px "DM Sans"`;
                    ctx.textAlign = 'center';
                    ctx.fillText(continentName, seq.x, seq.y + textOffset);
                }
            });
        }

        // Draw host icon above sequences
        if (showHostTransmission && hostCTMCs.length > 0) {
            // Calculate scaling factor based on number of tips
            const __nTips = (typeof numTipsSelect !== 'undefined' && numTipsSelect) ? parseInt(numTipsSelect.value, 10) : 3;
            const treeScaleFactor = __nTips <= 3 ? 1 : Math.max(0.5, 1 - (__nTips - 3) * 0.06);

            sequences.forEach(seq => {
                // Skip sequences hidden in time travel
                if (seq.hideInTimeTravel) return;

                // Only show if trackAllHostBranches is on, or if this is the tracked sequence
                const shouldShow = trackAllHostBranches || seq.tracked;
                if (!shouldShow) return;

                const hostCtmcObj = hostCTMCs.find(h => h.sequenceId === seq.sequenceId);
                if (hostCtmcObj) {
                    const currentHost = hostCtmcObj.ctmc.currentHostName();
                    // Make pig 50% bigger, then apply tree scale
                    const baseScale = currentHost === "Pig" ? 0.525 : 0.35;
                    const scale = baseScale * treeScaleFactor;

                    // Apply jitter when all branches are shown to prevent perfect overlap
                    const jitterOffset = trackAllHostBranches ? getJitter(seq.sequenceId, 8 * treeScaleFactor) : { x: 0, y: 0 };

                    // Draw virus with color-based positioning
                    const virusColor = hostCtmcObj.color;

                    const numTips = getNumTips();
                    let virusOffsetX;

                    if (numTips === 3) {
                        // Original positioning for 3-tip tree: Red on left, yellow and orange on right
                        virusOffsetX = -30 * treeScaleFactor; // default left
                        if (virusColor === 'rgba(234, 179, 8, 1)' || virusColor === 'rgba(249, 115, 22, 1)') {
                            virusOffsetX = 30 * treeScaleFactor; // yellow or orange on right
                        }
                    } else {
                        // For trees > 3 tips: use color hash to determine position
                        const colorHash = virusColor.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                        virusOffsetX = (colorHash % 2 === 0) ? -30 * treeScaleFactor : 30 * treeScaleFactor;
                    }

                    drawVirus(ctx, seq.x + jitterOffset.x + virusOffsetX, seq.y - 35 * treeScaleFactor + jitterOffset.y, 0.3 * treeScaleFactor, virusColor);

                    // Draw host icon
                    HOST_ICON[currentHost](ctx, seq.x + jitterOffset.x, seq.y - 35 * treeScaleFactor + jitterOffset.y, scale);
                }
            });
        }
    }

    function animate() {
        if (!isPlaying) return;

        // Find the tracked sequence and get its first nucleotide
        let trackedNucleotide = null;
        const trackedSequence = sequences.find(seq => seq.tracked);
        if (trackedSequence) {
            trackedNucleotide = trackedSequence.sequence[0];
        }

        // --- Time step for continuous simulation ---
        const now = performance.now() / 1000;
        if (lastTimeSec === null) lastTimeSec = now;
        const dt = Math.min(0.05, now - lastTimeSec); // cap dt for stability
        lastTimeSec = now;

        // // Record history snapshot every few frames
        // if (seededRandom() < 0.3) { // Record ~30% of frames for smoother time travel
        //     recordHistorySnapshot();
        // }
        // Record history snapshot deterministically (do NOT consume seeded RNG here)
        historyFrameCounter++;
        if (historyFrameCounter % 3 === 0) {
            recordHistorySnapshot();
        }

        // --- Update geo stars (only if phylogeography on) ---
        if (showPhylogeography) {
            const baseX = canvas.width - 360;
            const baseY = 50;
            const dx = PANEL_VIEW.geo.x;
            const dy = PANEL_VIEW.geo.y;
            const z = PANEL_VIEW.geo.z;
            const offsetX = baseX + dx;
            const offsetY = baseY + dy;
            const mapWidth = 342 * z;
            const mapHeight = 200 * z;

            // Create stars for any new sequences that don't have one AND should be tracked
            sequences.forEach(seq => {
                // Determine if this sequence should have a star
                const shouldTrack = trackAllBranches || seq.trackedGeo;

                if (shouldTrack && !geoStars.find(gs => gs.sequenceId === seq.sequenceId)) {
                    // Find parent star to inherit state using parentSequenceId
                    let parentStar = null;
                    let parentColor = 'rgba(0, 0, 0, 1)';
                    if (seq.parentSequenceId !== null) {
                        const parentStarObj = geoStars.find(gs => gs.sequenceId === seq.parentSequenceId);
                        if (parentStarObj) {
                            parentStar = parentStarObj.star;
                            parentColor = parentStarObj.color;
                        }
                    }

                    // Create new star, inheriting parent's state if available
                    const newStar = new GeoCTMCStar(0);
                    newStar.setStickyPaths(stickyPaths);

                    // Get color from corresponding host CTMC, or inherit from parent
                    const hostCtmcObj = hostCTMCs.find(h => h.sequenceId === seq.sequenceId);
                    const color = hostCtmcObj ? hostCtmcObj.color : parentColor;

                    if (parentStar) {
                        // Inherit full CTMC timeline state
                        newStar.i = parentStar.i;
                        newStar.time = parentStar.time;
                        newStar.t1 = parentStar.t1;
                        newStar.t2 = parentStar.t2;
                        newStar.t3 = parentStar.t3;
                        newStar.nextState = parentStar.nextState;

                        // Inherit visual flight if active
                        newStar.flight = parentStar.flight ? { ...parentStar.flight } : null;

                        // Inherit visual position
                        newStar.headX = parentStar.headX;
                        newStar.headY = parentStar.headY;

                        // Inherit sticky setting
                        newStar.stickyPaths = parentStar.stickyPaths;

                        // Clone trail only if same lineage color
                        if (color === parentColor) {
                            newStar.trail = parentStar.trail.map(p => ({ ...p }));
                        }
                    } else {
                        // Initialize headX and headY to starting position
                        const baseX = canvas.width - 360;
                        const baseY = 50;
                        const dx = PANEL_VIEW.geo.x;
                        const dy = PANEL_VIEW.geo.y;
                        const z = PANEL_VIEW.geo.z;
                        const offsetX = baseX + dx;
                        const offsetY = baseY + dy;
                        const mapWidth = 342 * z;
                        const mapHeight = 200 * z;
                        const [x, y] = projectEquirect(geoStates[0].lon, geoStates[0].lat, offsetX, offsetY, mapWidth, mapHeight);
                        newStar.headX = x;
                        newStar.headY = y;
                    }

                    geoStars.push({
                        sequenceId: seq.sequenceId,
                        star: newStar,
                        color: color
                    });
                }
            });

            // Remove stars for sequences that no longer exist OR shouldn't be tracked
            geoStars = geoStars.filter(gs => {
                const seq = sequences.find(s => s.sequenceId === gs.sequenceId);
                if (!seq) return false;
                const shouldTrack = trackAllBranches || seq.trackedGeo;
                return shouldTrack;
            });

            // Update each star based on its sequence
            geoStars.forEach(({ sequenceId, star, color }) => {
                const seq = sequences.find(s => s.sequenceId === sequenceId);
                if (!seq) return;

                // Determine if we should show this star
                // If trackAllBranches is off, only show sequences with trackedGeo=true (Root → Tip 1)
                // If trackAllBranches is on, show all sequences
                const shouldShow = trackAllBranches || seq.trackedGeo;
                if (!shouldShow) return;

                const shouldMove = !seq.fixated;

                const offsetX = canvas.width - 360;
                const offsetY = 50;
                const mapWidth = 342;
                const mapHeight = 200;
                // DO NOT update here (no dt in this scope). Only draw.
                star.draw(ctx, color, { x: 0, y: 0 });

                //   if (shouldMove) {
                //       star.setRate(diffusionRate);
                //       star.update(dt * speed, offsetX, offsetY, mapWidth, mapHeight);
                //       star.updateTrail(dt * speed);
                //   } else {
                //       // Fixated at tip
                //       if (!stickyPaths) {
                //           // If not sticky paths, age the trail and remove old points
                //           for (const p of star.trail) p.age += dt * speed;
                //           while (star.trail.length && star.trail[0].age > star.trailMaxAge) {
                //               star.trail.shift();
                //           }
                //       }
                //       // If sticky paths, don't touch the trail - keep it visible forever
                //   }
            });
        }

        // --- Update host transmission CTMCs (only if host transmission on) ---
        if (showHostTransmission && hostCTMCs.length > 0) {
            hostCTMCs.forEach(({ sequenceId, ctmc }) => {
                const seq = sequences.find(s => s.sequenceId === sequenceId);
                if (!seq) return;

                // Only update if not fixated and should be shown
                const shouldShow = trackAllHostBranches || seq.tracked;
                const shouldUpdate = shouldShow && !seq.fixated;

                if (shouldUpdate) {
                    ctmc.setRate(transmissionRate);
                    // ctmc.update(dt * speed);
                }
            });
        }

        // Detect nucleotide change and start transition
        if (trackedNucleotide && trackedNucleotide !== ctmcCurrentNucleotide) {
            if (ctmcCurrentNucleotide !== null) {
                // Start transition
                ctmcPreviousNucleotide = ctmcCurrentNucleotide;
                ctmcTransitionProgress = 0;
            }
            ctmcCurrentNucleotide = trackedNucleotide;
        }

        // Update transition progress
        if (ctmcTransitionProgress < 1) {
            ctmcTransitionProgress += ctmcTransitionSpeed * speed;
            if (ctmcTransitionProgress >= 1) {
                ctmcTransitionProgress = 1;
                ctmcPreviousNucleotide = null;
            }
        }

        const newSequences = [];

        sequences.forEach(seq => {
            // If sequence is fixated at a tip, just keep it there without mutating
            if (seq.fixated) {
                seq.mutatedIndices = []; // Clear any mutation highlights
                newSequences.push(seq);
                return;
            }

            // Branch-length increment (in pixels along the branch) for THIS frame.
            // This is what we feed to the new GeoCTMCStar.update(...).
            let dLen = 0;

            // Only progress if the sequence has started
            if (seq.started) {
                // Use constant pixel speed (5 pixels per frame as base)
                const basePixelSpeed = 5;
                const progressIncrement = (basePixelSpeed * speed) / seq.distance;
                seq.progress += progressIncrement;

                // pixels traveled along the branch this frame (branch-length time)
                dLen = progressIncrement * seq.distance;
                // ---------------------------------------------------
                // Convert pixel length to normalized tree-length time
                // so rate = expected jumps per root-to-tip lineage
                // ---------------------------------------------------
            }
            const bounds = getTreeBounds(tree);
            const TREE_HEIGHT_PX = Math.max(1e-6, bounds.maxY - tree.y);
            const dLenNorm = dLen / TREE_HEIGHT_PX;

            // Host CTMC update in TREE-LENGTH time (same clock as phylogeography)
if (showHostTransmission && dLenNorm > 0) {
    const hc = hostCTMCs.find(h => h.sequenceId === seq.sequenceId);
    if (hc) {
      const shouldShow = trackAllHostBranches || seq.tracked;
      const shouldUpdate = shouldShow && !seq.fixated;
      if (shouldUpdate) {
        hc.ctmc.setRate(transmissionRate);
        hc.ctmc.update(dLenNorm);
      }
    }
  }

            if (seq.progress <= 1) {
                // Always refresh start/target coordinates from node IDs (tree may be rebuilt/rescaled)
                const parentNode = seq.parentNodeId ? findNodeById(tree, seq.parentNodeId) : tree;
                const targetNode = seq.targetNodeId ? findNodeById(tree, seq.targetNodeId) : null;

                const startX = parentNode ? parentNode.x : tree.x;
                const startY = parentNode ? parentNode.y : tree.y;

                if (targetNode) {
                    seq.targetX = targetNode.x;
                    seq.targetY = targetNode.y;
                }

                // Interpolate position from refreshed anchors
                seq.x = startX + (seq.targetX - startX) * seq.progress;
                seq.y = startY + (seq.targetY - startY) * seq.progress;

                // Only mutate if the sequence is actually moving
                if (seq.started && seq.progress > 0) {
                    const mutated = mutateSequence(seq.sequence);
                    seq.sequence = mutated.sequence;
                    seq.mutatedIndices = mutated.mutatedIndices;
                }
                // ---------------------------
                // UPDATE GEO STAR (this was missing)
                // ---------------------------
                if (showPhylogeography && seq.started && seq.progress > 0) {
                    const starObj = geoStars.find(gs => gs.sequenceId === seq.sequenceId);
                    if (starObj && starObj.star) {
                        const st = starObj.star;

                        st.setStickyPaths(stickyPaths);
                        st.setRate(diffusionRate);

                        // Use current geo panel viewport (same as drawing)
                        const baseX = canvas.width - 360;
                        const baseY = 50;
                        const dx = PANEL_VIEW.geo.x;
                        const dy = PANEL_VIEW.geo.y;
                        const z = PANEL_VIEW.geo.z;

                        const offsetX = baseX + dx;
                        const offsetY = baseY + dy;
                        const mapWidth = 342 * z;
                        const mapHeight = 200 * z;

                        // IMPORTANT: new GeoCTMCStar expects branch-length time -> use dLen
                        // const b = getTreeBounds(tree);
                        // const TREE_HEIGHT_PX = Math.max
                        st.update(dLenNorm, offsetX, offsetY, mapWidth, mapHeight);

                        // Trail aging is purely visual -> seconds-based dt is fine
                        st.updateTrail(dt * speed);
                    }
                }
                //   newSequences.push(seq);
                // ---------------------------
                // RECORD BRANCH SEGMENTS
                // ---------------------------

                // PHYLO: first nucleotide
                const nuc0 = seq.sequence[0];
                upsertBranchSegment(
                    seq,
                    'phylo',
                    nuc0,
                    colors[nuc0] || '#000',
                    seq.progress
                );

                // GEO: geographic CTMC
                const starObj = geoStars.find(gs => gs.sequenceId === seq.sequenceId);
                if (starObj && starObj.star) {
                    const gi = starObj.star.i;
                    if (!GEO_STATE_COLORS) initGeoStateColors();

                    upsertBranchSegment(
                        seq,
                        'geo',
                        gi,
                        GEO_STATE_COLORS[gi] || '#000',
                        seq.progress
                    );
                }

                // HOST: host CTMC
                const hostObj = hostCTMCs.find(h => h.sequenceId === seq.sequenceId);
                if (hostObj && hostObj.ctmc) {
                    const hi = hostObj.ctmc.i;

                    upsertBranchSegment(
                        seq,
                        'host',
                        hi,
                        HOST_STATE_COLORS[hi] || '#000',
                        seq.progress
                    );
                }

                // keep sequence
                newSequences.push(seq);
            } else {
                finalizeEdgeSegmentsAtOne(seq);
                // Reached target - check if it's a node with children
                // Reached target - identify the node by ID (robust to rescaling/rebuild)
                let foundNode = null;

                if (seq.targetNodeId) {
                    foundNode = findNodeById(tree, seq.targetNodeId);
                }

                // Fallback (should be rare): if no id match, try the old coordinate matching
                if (!foundNode) {
                    function findNodeByXY(node) {
                        if (Math.abs(node.x - seq.targetX) < 1 && Math.abs(node.y - seq.targetY) < 1) return node;
                        for (let child of node.children) {
                            const found = findNodeByXY(child);
                            if (found) return found;
                        }
                        return null;
                    }
                    foundNode = findNodeByXY(tree);
                }



                if (foundNode && foundNode.children.length > 0) {
                    // Split sequence at internal node
                    const parentHostCtmcObj = hostCTMCs.find(h => h.sequenceId === seq.sequenceId);

                    // Get parent's complete history before splitting
                    const parentHistory = animationHistory.sequences.get(seq.sequenceId) || [];

                    foundNode.children.forEach((child, childIndex) => {
                        // Track by node identity instead of pixel coords
                        const isTip1 = (child.id === "tip1") || (child.label === "Tip 1");
                        const isTip2 = (child.id === "tip2") || (child.label === "Tip 2");

                        const isTrackedForCTMC = seq.tracked && isTip1;
                        const isTrackedForGeo = seq.trackedGeo && isTip1;

                        const newSeq = createSequence(
                            foundNode.x,
                            foundNode.y,
                            child.x,
                            child.y,
                            seq.sequence,
                            foundNode.id,     // parentNodeId
                            true,
                            isTrackedForCTMC,
                            child.id          // targetNodeId
                        );

                        // Propagate branch index and geo tracking flag
                        newSeq.branchIndex = seq.branchIndex;
                        newSeq.trackedGeo = isTrackedForGeo;
                        newSeq.parentSequenceId = seq.sequenceId; // Track parent for star inheritance

                        // IMPORTANT: Copy parent's history to child so it has complete history back to root
                        if (parentHistory.length > 0) {
                            animationHistory.sequences.set(newSeq.sequenceId, [...parentHistory]);
                        }

                        newSequences.push(newSeq);

                        // Create new host CTMC for this split sequence
                        if (parentHostCtmcObj) {
                            const newCtmc = new HostTransmissionCTMC(0);
                            newCtmc.setRate(transmissionRate);

                            // Inherit state from parent
                            newCtmc.i = parentHostCtmcObj.ctmc.i;
                            newCtmc.j = parentHostCtmcObj.ctmc.j;
                            newCtmc.t = parentHostCtmcObj.ctmc.t;
                            newCtmc.holding = parentHostCtmcObj.ctmc.holding;
                            newCtmc.holdRemaining = parentHostCtmcObj.ctmc.holdRemaining;

                            const numTips = getNumTips();
                            let color, lineage;

                            if (numTips === 3) {
                                // Original 3-tip tree color scheme
                                color = 'rgba(239, 68, 68, 1)'; // default red
                                lineage = 'internal-tip1';

                                if (isTip1) {
                                    color = 'rgba(239, 68, 68, 1)'; // Red for Internal → Tip 1
                                    lineage = 'internal-tip1';
                                } else if (isTip2) {
                                    color = 'rgba(249, 115, 22, 1)'; // Orange for Internal → Tip 2
                                    lineage = 'internal-tip2';
                                }
                            } else {
                                // For trees > 3 tips: first child keeps parent color, second child gets different color
                                if (childIndex === 0) {
                                    // First child keeps parent's color
                                    color = parentHostCtmcObj.color;
                                    lineage = 'inherited';
                                } else {
                                    // Second child gets a different random color
                                    color = generateRandomVirusColor([parentHostCtmcObj.color]);
                                    lineage = 'split';
                                }
                            }

                            hostCTMCs.push({
                                sequenceId: newSeq.sequenceId,
                                ctmc: newCtmc,
                                color: color,
                                lineage: lineage
                            });
                        }
                    });

                    // Remove the parent CTMC since it has split
                    if (parentHostCtmcObj) {
                        const idx = hostCTMCs.indexOf(parentHostCtmcObj);
                        if (idx !== -1) hostCTMCs.splice(idx, 1);
                    }
                } else if (foundNode && foundNode.children.length === 0) {
                    // Reached a tip - fixate the sequence here
                    seq.fixated = true;
                    seq.x = foundNode.x;
                    seq.y = foundNode.y;

                    // Record final state in history
                    recordHistorySnapshot();

                    // --- Snap panel pointers to the reached (discrete) state ---
                    // CTMC: if we were mid-transition, finish it so the pointer doesn't stick between states.
                    ctmcTransitionProgress = 1;

                    // ---------------------------
                    // NEW: Geo star force-arrival for the NEW GeoCTMCStar (no holding/t/j/route anymore)
                    // ---------------------------
                    const starObj = geoStars.find(gs => gs.sequenceId === seq.sequenceId);
                    if (starObj && starObj.star) {
                        const st = starObj.star;

                        // If mid-flight, jump time to end-of-flight, snap state to destination, clear flight.
                        if (st.flight) {
                            st.time = Math.max(st.time, st.flight.end);
                            st.i = st.flight.to;
                            st.flight = null;
                        }

                        // Snap head to the anchor point in the current geo panel transform
                        const baseX = canvas.width - 360;
                        const baseY = 50;
                        const dx = PANEL_VIEW.geo.x;
                        const dy = PANEL_VIEW.geo.y;
                        const z = PANEL_VIEW.geo.z;

                        const offsetX = baseX + dx;
                        const offsetY = baseY + dy;
                        const mapWidth = 342 * z;
                        const mapHeight = 200 * z;

                        const [x, y] = projectEquirect(
                            geoStates[st.i].lon, geoStates[st.i].lat,
                            offsetX, offsetY, mapWidth, mapHeight
                        );

                        st.headX = x;
                        st.headY = y;

                        // Ensure trail includes the final point (optional but keeps the dot+trail consistent)
                        st.trail.push({ x: x, y: y, age: 0 });
                    }

                    // Host CTMC: if virus is mid-jump, force arrival.
                    const hostCtmcObj = hostCTMCs.find(h => h.sequenceId === seq.sequenceId);
                    if (hostCtmcObj && hostCtmcObj.ctmc.isTransmitting && hostCtmcObj.ctmc.isTransmitting()) {
                        hostCtmcObj.ctmc.t = 1;
                        hostCtmcObj.ctmc.i = hostCtmcObj.ctmc.j;
                        hostCtmcObj.ctmc.holding = true;
                        hostCtmcObj.ctmc.holdRemaining = sampleExp(hostCtmcObj.ctmc.lambda);
                    }

                    newSequences.push(seq);
                }
            }
        });

        // IMPORTANT: commit the updated / split sequences for the next frame.
        // Without this, child sequences created at internal nodes are never kept,
        // which makes observations appear to get stuck at internal nodes.
        sequences = newSequences;

        // Render the current state
        renderCurrentState();

        // Continue animation if playing
        if (sequences.length > 0) {
            animationFrame = requestAnimationFrame(animate);
        }
    }

    // Handle time travel slider change
    function handleTimeTravel(sliderValue) {
        if (!animationHistory.initialized || animationHistory.sequences.size === 0) {
            console.log('No history available yet - run animation first');
            return;
        }

        // Slider goes from 0 (root/past) to 100 (tips/present)
        // Map to actual progress range in history
        const timePos = (sliderValue / 100) * animationHistory.maxProgress;

        // Determine coalescent point (internal node) progress
        // We'll estimate this as the average progress where internal node sequences first appear
        let internalNodeProgress = 0.5; // default estimate

        // Try to find the internal node progress from history
        sequences.forEach(seq => {
            if (seq.parentSequenceId !== null) {
                const history = animationHistory.sequences.get(seq.sequenceId);
                if (history && history.length > 0) {
                    // First entry in child sequence history is at the internal node
                    internalNodeProgress = Math.max(internalNodeProgress, history[0].progress);
                }
            }
        });

        // Update each sequence to its historical state
        sequences.forEach(seq => {
            let snapshot = getHistoryAtTime(seq.sequenceId, timePos);

            // Check if this sequence leads to Tip 2
            let leadsToTip2 = false;
            if (tree.children[0] && tree.children[0].children[1]) {
                const tip2Node = tree.children[0].children[1];
                leadsToTip2 = (seq.id === "tip2" || seq.label === "Tip 2" ||
                    (Math.abs(seq.targetX - tip2Node.x) < 1 &&
                        Math.abs(seq.targetY - tip2Node.y) < 1));
            }

            // If this is Tip 2 and we're before the internal node split, hide it
            if (leadsToTip2 && timePos < internalNodeProgress * 0.95) {
                seq.hideInTimeTravel = true;
                return; // Skip this sequence entirely
            } else {
                seq.hideInTimeTravel = false;
            }

            // If no snapshot found, this sequence might not have existed at this time
            // Try to use parent sequence's history instead (but only for Tip 1, not Tip 2)
            if (!snapshot && seq.parentSequenceId !== null && !leadsToTip2) {
                snapshot = getHistoryAtTime(seq.parentSequenceId, timePos);
            }

            if (snapshot) {
                seq.x = snapshot.x;
                seq.y = snapshot.y;
                seq.sequence = [...snapshot.sequence];
                seq.fixated = snapshot.fixated;

                // Update geo star if it exists
                const starObj = geoStars.find(gs => gs.sequenceId === seq.sequenceId);
                if (starObj) {
                    const star = starObj.star;
                    star.i = snapshot.geoState;
                    star.j = snapshot.geoState;
                    star.t = 1;
                    star.holding = true;

                    // Update star position on map
                    const baseX = canvas.width - 360;
                    const baseY = 50;
                    const dx = PANEL_VIEW.geo.x;
                    const dy = PANEL_VIEW.geo.y;
                    const z = PANEL_VIEW.geo.z;
                    const offsetX = baseX + dx;
                    const offsetY = baseY + dy;
                    const mapWidth = 342 * z;
                    const mapHeight = 200 * z;
                    const [x, y] = projectEquirect(geoStates[star.i].lon, geoStates[star.i].lat, offsetX, offsetY, mapWidth, mapHeight);
                    star.headX = x;
                    star.headY = y;
                }

                // Update host state for this sequence
                const hostCtmcObj = hostCTMCs.find(h => h.sequenceId === seq.sequenceId);
                if (hostCtmcObj) {
                    hostCtmcObj.ctmc.i = snapshot.hostState;
                    hostCtmcObj.ctmc.j = snapshot.hostState;
                    hostCtmcObj.ctmc.t = 1;
                    hostCtmcObj.ctmc.holding = true;
                }
            }
        });

        // Update CTMC display
        const trackedSeq = sequences.find(seq => seq.tracked && !seq.hideInTimeTravel);
        if (trackedSeq) {
            ctmcCurrentNucleotide = trackedSeq.sequence[0];
        }

        // Render the current state
        renderCurrentState();
    }

    // Controls

    const playBtn = document.getElementById('playBtn');
    // const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    const mutationSlider = document.getElementById('mutationSlider');
    const mutationValue = document.getElementById('mutationValue');
    const highlightCheckbox = document.getElementById('highlightCheckbox');
    const phylogeneticsCheckbox = document.getElementById('phylogeneticsCheckbox');
    const phylogeneticsControls = document.getElementById('phylogeneticsControls');
    const phylogeographyCheckbox = document.getElementById('phylogeographyCheckbox');
    const phylogeographyControls = document.getElementById('phylogeographyControls');
    const diffusionSlider = document.getElementById('diffusionSlider');
    const diffusionValue = document.getElementById('diffusionValue');
    const trackAllBranchesCheckbox = document.getElementById('trackAllBranchesCheckbox');
    const stickyPathsCheckbox = document.getElementById('stickyPathsCheckbox');
    const drawLocationsCheckbox = document.getElementById('drawLocationsCheckbox');
    const choroplethCheckbox = document.getElementById('choroplethCheckbox');
    const hostTransmissionCheckbox = document.getElementById('hostTransmissionCheckbox');
    const hostTransmissionControls = document.getElementById('hostTransmissionControls');
    const transmissionSlider = document.getElementById('transmissionSlider');
    const transmissionValue = document.getElementById('transmissionValue');
    const trackAllHostBranchesCheckbox = document.getElementById('trackAllHostBranchesCheckbox');
    const observationsCheckbox = document.getElementById('observationsCheckbox');
    const timeTravelCheckbox = document.getElementById('timeTravelCheckbox');
    const timeSliderContainer = document.getElementById('timeSliderContainer');
    const timeSlider = document.getElementById('timeSlider');

    // --- Settings panel (node position offsets) ---
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const resetOffsetsBtn = document.getElementById('resetOffsetsBtn');

    const rootOffsetX = document.getElementById('rootOffsetX');
    const rootOffsetY = document.getElementById('rootOffsetY');
    const internalOffsetX = document.getElementById('internalOffsetX');
    const internalOffsetY = document.getElementById('internalOffsetY');

    const tip1OffsetX = document.getElementById('tip1OffsetX');
    const tip1OffsetY = document.getElementById('tip1OffsetY');
    const tip2OffsetX = document.getElementById('tip2OffsetX');
    const tip2OffsetY = document.getElementById('tip2OffsetY');
    const tip3OffsetX = document.getElementById('tip3OffsetX');
    const tip3OffsetY = document.getElementById('tip3OffsetY');

    const treeZoom = document.getElementById('treeZoom');

    const panelPhyloX = document.getElementById('panelPhyloX');
    const panelPhyloY = document.getElementById('panelPhyloY');
    const panelPhyloZ = document.getElementById('panelPhyloZ');
    const panelGeoX = document.getElementById('panelGeoX');
    const panelGeoY = document.getElementById('panelGeoY');
    const panelGeoZ = document.getElementById('panelGeoZ');
    const panelHostX = document.getElementById('panelHostX');
    const panelHostY = document.getElementById('panelHostY');
    const panelHostZ = document.getElementById('panelHostZ');

    const rootOffsetXVal = document.getElementById('rootOffsetXVal');
    const rootOffsetYVal = document.getElementById('rootOffsetYVal');
    const internalOffsetXVal = document.getElementById('internalOffsetXVal');
    const internalOffsetYVal = document.getElementById('internalOffsetYVal');

    const tip1OffsetXVal = document.getElementById('tip1OffsetXVal');
    const tip1OffsetYVal = document.getElementById('tip1OffsetYVal');
    const tip2OffsetXVal = document.getElementById('tip2OffsetXVal');
    const tip2OffsetYVal = document.getElementById('tip2OffsetYVal');
    const tip3OffsetXVal = document.getElementById('tip3OffsetXVal');
    const tip3OffsetYVal = document.getElementById('tip3OffsetYVal');

    const treeZoomVal = document.getElementById('treeZoomVal');

    const panelPhyloXVal = document.getElementById('panelPhyloXVal');
    const panelPhyloYVal = document.getElementById('panelPhyloYVal');
    const panelPhyloZVal = document.getElementById('panelPhyloZVal');
    const panelGeoXVal = document.getElementById('panelGeoXVal');
    const panelGeoYVal = document.getElementById('panelGeoYVal');
    const panelGeoZVal = document.getElementById('panelGeoZVal');
    const panelHostXVal = document.getElementById('panelHostXVal');
    const panelHostYVal = document.getElementById('panelHostYVal');
    const panelHostZVal = document.getElementById('panelHostZVal');

    const panelPhylogenetics = document.getElementById('panelPhylogenetics');
    const panelPhylogeography = document.getElementById('panelPhylogeography');
    const panelHostTransmission = document.getElementById('panelHostTransmission');

    // Max rate settings
    const maxMutationRate = document.getElementById('maxMutationRate');
    const maxMutationRateVal = document.getElementById('maxMutationRateVal');
    const maxDiffusionRate = document.getElementById('maxDiffusionRate');
    const maxDiffusionRateVal = document.getElementById('maxDiffusionRateVal');
    const maxTransmissionRate = document.getElementById('maxTransmissionRate');
    const maxTransmissionRateVal = document.getElementById('maxTransmissionRateVal');

    // Store max rate values
    let maxMutationRateValue = 10;
    let maxDiffusionRateValue = 10;
    let maxTransmissionRateValue = 10;

    function toggleSettings(open) {
        const shouldOpen = (open === undefined) ? (settingsPanel.style.display === 'none') : open;
        settingsPanel.style.display = shouldOpen ? 'block' : 'none';
    }

    settingsBtn.addEventListener('click', () => toggleSettings());
    closeSettingsBtn.addEventListener('click', () => toggleSettings(false));

    let offsetRaf = null;
    function scheduleApplyOffsets() {
        if (offsetRaf) cancelAnimationFrame(offsetRaf);
        offsetRaf = requestAnimationFrame(() => {
            offsetRaf = null;

            // --- Node offsets ---
            NODE_OFFSETS.root.x = parseInt(rootOffsetX.value, 10);
            NODE_OFFSETS.root.y = parseInt(rootOffsetY.value, 10);
            NODE_OFFSETS.internal.x = parseInt(internalOffsetX.value, 10);
            NODE_OFFSETS.internal.y = parseInt(internalOffsetY.value, 10);

            NODE_OFFSETS.tip1.x = parseInt(tip1OffsetX.value, 10);
            NODE_OFFSETS.tip1.y = parseInt(tip1OffsetY.value, 10);
            NODE_OFFSETS.tip2.x = parseInt(tip2OffsetX.value, 10);
            NODE_OFFSETS.tip2.y = parseInt(tip2OffsetY.value, 10);
            NODE_OFFSETS.tip3.x = parseInt(tip3OffsetX.value, 10);
            NODE_OFFSETS.tip3.y = parseInt(tip3OffsetY.value, 10);

            // --- Tree zoom (branch-length multiplier) ---
            TREE_VIEW.zoom = parseFloat(treeZoom.value);

            // --- Panel size/position for CANVAS side panels ---
            PANEL_VIEW.phylo.x = parseInt(panelPhyloX.value, 10);
            PANEL_VIEW.phylo.y = parseInt(panelPhyloY.value, 10);
            PANEL_VIEW.phylo.z = parseFloat(panelPhyloZ.value);
            PANEL_VIEW.geo.x = parseInt(panelGeoX.value, 10);
            PANEL_VIEW.geo.y = parseInt(panelGeoY.value, 10);
            PANEL_VIEW.geo.z = parseFloat(panelGeoZ.value);
            PANEL_VIEW.host.x = parseInt(panelHostX.value, 10);
            PANEL_VIEW.host.y = parseInt(panelHostY.value, 10);
            PANEL_VIEW.host.z = parseFloat(panelHostZ.value);

            // --- UI labels ---
            rootOffsetXVal.textContent = rootOffsetX.value;
            rootOffsetYVal.textContent = rootOffsetY.value;
            internalOffsetXVal.textContent = internalOffsetX.value;
            internalOffsetYVal.textContent = internalOffsetY.value;

            tip1OffsetXVal.textContent = tip1OffsetX.value;
            tip1OffsetYVal.textContent = tip1OffsetY.value;
            tip2OffsetXVal.textContent = tip2OffsetX.value;
            tip2OffsetYVal.textContent = tip2OffsetY.value;
            tip3OffsetXVal.textContent = tip3OffsetX.value;
            tip3OffsetYVal.textContent = tip3OffsetY.value;

            treeZoomVal.textContent = TREE_VIEW.zoom.toFixed(2) + '×';

            panelPhyloXVal.textContent = panelPhyloX.value;
            panelPhyloYVal.textContent = panelPhyloY.value;
            panelPhyloZVal.textContent = `${parseFloat(panelPhyloZ.value).toFixed(2)}×`;
            panelGeoXVal.textContent = panelGeoX.value;
            panelGeoYVal.textContent = panelGeoY.value;
            panelGeoZVal.textContent = `${parseFloat(panelGeoZ.value).toFixed(2)}×`;
            panelHostXVal.textContent = panelHostX.value;
            panelHostYVal.textContent = panelHostY.value;
            panelHostZVal.textContent = `${parseFloat(panelHostZ.value).toFixed(2)}×`;

            // Rebuild geometry + restart sequences so everything stays consistent.
            if (typeof window.rebuildTree === 'function') window.rebuildTree();
        });
    }

    [rootOffsetX, rootOffsetY, internalOffsetX, internalOffsetY,
        tip1OffsetX, tip1OffsetY, tip2OffsetX, tip2OffsetY, tip3OffsetX, tip3OffsetY,
        treeZoom,
        panelPhyloX, panelPhyloY, panelPhyloZ,
        panelGeoX, panelGeoY, panelGeoZ,
        panelHostX, panelHostY, panelHostZ
    ].forEach(el => {
        el.addEventListener('input', scheduleApplyOffsets);
    });

    // Sync UI on load
    scheduleApplyOffsets();

    resetOffsetsBtn.addEventListener('click', () => {
        // Node offsets
        [rootOffsetX, rootOffsetY, internalOffsetX, internalOffsetY,
            tip1OffsetX, tip1OffsetY, tip2OffsetX, tip2OffsetY, tip3OffsetX, tip3OffsetY
        ].forEach(el => el.value = 0);

        // Zoom
        treeZoom.value = 1.0;

        // Panels
        [panelPhyloX, panelPhyloY, panelGeoX, panelGeoY, panelHostX, panelHostY].forEach(el => el.value = 0);
        [panelPhyloZ, panelGeoZ, panelHostZ].forEach(el => el.value = 1.0);

        scheduleApplyOffsets();
    });

    // Max rate sliders
    maxMutationRate.addEventListener('input', (e) => {
        maxMutationRateValue = parseInt(e.target.value);
        maxMutationRateVal.textContent = maxMutationRateValue;
        mutationSlider.max = maxMutationRateValue;
        // If current value exceeds new max, adjust it
        if (mutationRate > maxMutationRateValue) {
            mutationRate = maxMutationRateValue;
            mutationSlider.value = maxMutationRateValue;
            mutationValue.textContent = mutationRate.toFixed(2);
        }
    });

    maxDiffusionRate.addEventListener('input', (e) => {
        maxDiffusionRateValue = parseInt(e.target.value);
        maxDiffusionRateVal.textContent = maxDiffusionRateValue;
        diffusionSlider.max = maxDiffusionRateValue;
        // If current value exceeds new max, adjust it
        if (diffusionRate > maxDiffusionRateValue) {
            diffusionRate = maxDiffusionRateValue;
            diffusionSlider.value = maxDiffusionRateValue;
            diffusionValue.textContent = diffusionRate.toFixed(2);
        }
    });

    maxTransmissionRate.addEventListener('input', (e) => {
        maxTransmissionRateValue = parseInt(e.target.value);
        maxTransmissionRateVal.textContent = maxTransmissionRateValue;
        transmissionSlider.max = maxTransmissionRateValue;
        // If current value exceeds new max, adjust it
        if (transmissionRate > maxTransmissionRateValue) {
            transmissionRate = maxTransmissionRateValue;
            transmissionSlider.value = maxTransmissionRateValue;
            transmissionValue.textContent = transmissionRate.toFixed(2);
        }
    });

    playBtn.addEventListener('click', () => {
        if (!isPlaying) {
            // Disable time travel when playing
            if (timeTravelMode) {
                timeTravelCheckbox.checked = false;
                timeTravelMode = false;
                timeSliderContainer.classList.remove('active');
            }

            if (sequences.length === 0) {
                initAnimation();
            }
            // Start all sequences moving
            sequences.forEach(seq => {
                seq.started = true;
            });
            isPlaying = true;
            playBtn.textContent = '⏸ Pause';
            animate();
        } else {
            isPlaying = false;
            playBtn.textContent = '▶ Play';
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
        }
    });

    // pauseBtn.addEventListener('click', () => {
    //     isPlaying = false;
    //     playBtn.textContent = '▶ Play';
    //     if (animationFrame) {
    //         cancelAnimationFrame(animationFrame);
    //     }
    // });

    resetBtn.addEventListener('click', () => {
        isPlaying = false;
        choroplethCache = null;
        playBtn.textContent = '▶ Play';
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }

        // Clear animation history
        animationHistory.sequences.clear();
        animationHistory.initialized = false;
        animationHistory.maxProgress = 0;

        // Reset time travel slider to present (tips)
        if (timeTravelMode) {
            timeSlider.value = 100;
            // Disable time travel mode since we cleared history
            timeTravelCheckbox.checked = false;
            timeTravelMode = false;
            timeSliderContainer.classList.remove('active');
        }

        initAnimation();
    });

    speedSlider.addEventListener('input', (e) => {
        speed = parseFloat(e.target.value);
        speedValue.textContent = speed + 'x';
    });

    const seedInput = document.getElementById('seedInput');
    seedInput.addEventListener('change', (e) => {
        // Reset animation with new seed (seed will be applied in initAnimation)
        isPlaying = false;
        playBtn.textContent = '▶ Play';
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }

        // Clear animation history
        animationHistory.sequences.clear();
        animationHistory.initialized = false;
        animationHistory.maxProgress = 0;

        initAnimation();
    });

    mutationSlider.addEventListener('input', (e) => {
        mutationRate = parseFloat(e.target.value);
        mutationValue.textContent = mutationRate.toFixed(2);
    });

    highlightCheckbox.addEventListener('change', (e) => {
        highlightTrackedNucleotide = e.target.checked;
    });

    phylogeneticsCheckbox.addEventListener('change', (e) => {
        showPhylogenetics = e.target.checked;

        // Show/hide child controls
        phylogeneticsControls.style.display = showPhylogenetics ? 'flex' : 'none';

        // Redraw to show/hide phylogenetics immediately
        if (!isPlaying) {
            renderCurrentState();
        }
    });

    // Panel visibility buttons
    const showPhyloPanelBtn = document.getElementById('showPhyloPanelBtn');
    const showGeoPanelBtn = document.getElementById('showGeoPanelBtn');
    const showHostPanelBtn = document.getElementById('showHostPanelBtn');

    showPhyloPanelBtn.addEventListener('click', (e) => {
        showPhyloPanel = !showPhyloPanel;
        showPhyloPanelBtn.classList.toggle('active', showPhyloPanel);
        if (!isPlaying) {
            renderCurrentState();
        }
    });

    showGeoPanelBtn.addEventListener('click', (e) => {
        showGeoPanel = !showGeoPanel;
        showGeoPanelBtn.classList.toggle('active', showGeoPanel);
        if (!isPlaying) {
            renderCurrentState();
        }
    });

    showHostPanelBtn.addEventListener('click', (e) => {
        showHostPanel = !showHostPanel;
        showHostPanelBtn.classList.toggle('active', showHostPanel);
        if (!isPlaying) {
            renderCurrentState();
        }
    });

    phylogeographyCheckbox.addEventListener('change', (e) => {
        showPhylogeography = e.target.checked;

        // Show/hide child controls
        phylogeographyControls.style.display = showPhylogeography ? 'flex' : 'none';

        // Redraw to show/hide map immediately
        if (!isPlaying) {
            renderCurrentState();
        }
    });

    diffusionSlider.addEventListener('input', (e) => {
        diffusionRate = parseFloat(e.target.value);
        diffusionValue.textContent = diffusionRate.toFixed(2);
    });

    trackAllBranchesCheckbox.addEventListener('change', (e) => {
        trackAllBranches = e.target.checked;

        // Redraw immediately if not playing to show/hide second branch
        if (!isPlaying && showPhylogeography) {
            renderCurrentState();
        }
    });

    stickyPathsCheckbox.addEventListener('change', (e) => {
        stickyPaths = e.target.checked;

        // Update all stars to use sticky or fading trails
        geoStars.forEach(({ star }) => {
            star.setStickyPaths(stickyPaths);
        });
    });

    drawLocationsCheckbox.addEventListener('change', (e) => {
        drawLocations = e.target.checked;
    });

    choroplethCheckbox.addEventListener("change", (e) => {
        showChoroplethMap = e.target.checked;
        choroplethCache = null;   
        renderCurrentState();
    });

    hostTransmissionCheckbox.addEventListener('change', (e) => {
        showHostTransmission = e.target.checked;

        // Show/hide child controls
        hostTransmissionControls.style.display = showHostTransmission ? 'flex' : 'none';

        // Redraw to show/hide host transmission panel immediately
        if (!isPlaying) {
            renderCurrentState();
        }
    });

    transmissionSlider.addEventListener('input', (e) => {
        transmissionRate = parseFloat(e.target.value);
        transmissionValue.textContent = transmissionRate.toFixed(2);
    });

    trackAllHostBranchesCheckbox.addEventListener('change', (e) => {
        trackAllHostBranches = e.target.checked;

        // Redraw immediately if not playing
        if (!isPlaying) {
            renderCurrentState();
        }
    });

    observationsCheckbox.addEventListener('change', (e) => {
        observationsMode = e.target.checked;

        // If enabling observations mode, stop animation
        if (observationsMode && isPlaying) {
            // pauseBtn.click();
        }

        // Redraw immediately
        if (!isPlaying) {
            renderCurrentState();
        }
    });

    timeTravelCheckbox.addEventListener('change', (e) => {
        timeTravelMode = e.target.checked;

        // Show/hide time slider
        if (timeTravelMode) {
            // Check if we have history
            if (!animationHistory.initialized || animationHistory.sequences.size === 0) {
                alert('Please run the animation first to generate history for time travel.');
                e.target.checked = false;
                timeTravelMode = false;
                return;
            }

            timeSliderContainer.classList.add('active');
            // Stop animation if playing
            if (isPlaying) {
                playBtn.click();
            }
            // Set slider to current maximum progress
            timeSlider.value = 100;
            // Don't reset - just render current state
            renderCurrentState();
        } else {
            timeSliderContainer.classList.remove('active');
            // Clear hideInTimeTravel flags
            sequences.forEach(seq => {
                seq.hideInTimeTravel = false;
            });
            // Just render current state, don't reset
            renderCurrentState();
        }
    });

    timeSlider.addEventListener('input', (e) => {
        if (timeTravelMode) {
            handleTimeTravel(parseFloat(e.target.value));
        }
    });

    // Help modal controls
    const phyloHelpBtn = document.getElementById('phyloHelpBtn');
    const phyloHelpModal = document.getElementById('phyloHelpModal');
    const phyloHelpClose = document.getElementById('phyloHelpClose');

    phyloHelpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        phyloHelpModal.classList.add('active');
    });

    phyloHelpClose.addEventListener('click', () => {
        phyloHelpModal.classList.remove('active');
    });

    // Close modal when clicking outside the content
    phyloHelpModal.addEventListener('click', (e) => {
        if (e.target === phyloHelpModal) {
            phyloHelpModal.classList.remove('active');
        }
    });

    // Phylogeography help modal
    const geoHelpBtn = document.getElementById('geoHelpBtn');
    const geoHelpModal = document.getElementById('geoHelpModal');
    const geoHelpClose = document.getElementById('geoHelpClose');

    geoHelpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        geoHelpModal.classList.add('active');
    });

    geoHelpClose.addEventListener('click', () => {
        geoHelpModal.classList.remove('active');
    });

    geoHelpModal.addEventListener('click', (e) => {
        if (e.target === geoHelpModal) {
            geoHelpModal.classList.remove('active');
        }
    });

    // Host transmission help modal
    const hostHelpBtn = document.getElementById('hostHelpBtn');
    const hostHelpModal = document.getElementById('hostHelpModal');
    const hostHelpClose = document.getElementById('hostHelpClose');

    hostHelpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hostHelpModal.classList.add('active');
    });

    hostHelpClose.addEventListener('click', () => {
        hostHelpModal.classList.remove('active');
    });

    hostHelpModal.addEventListener('click', (e) => {
        if (e.target === hostHelpModal) {
            hostHelpModal.classList.remove('active');
        }
    });

    // Close any modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (phyloHelpModal.classList.contains('active')) {
                phyloHelpModal.classList.remove('active');
            }
            if (geoHelpModal.classList.contains('active')) {
                geoHelpModal.classList.remove('active');
            }
            if (hostHelpModal.classList.contains('active')) {
                hostHelpModal.classList.remove('active');
            }
        }
    });

    // Initial draw with async loading

    // -------------------------------
    // Tree-size extension (added)
    // Keeps EXACT single-tree geometry when numTips === 3.
    // -------------------------------
    const numTipsSelect = document.getElementById('numTipsSelect');

    function getNumTips() {
        const v = numTipsSelect ? parseInt(numTipsSelect.value, 10) : 3;
        return Number.isFinite(v) ? v : 3;
    }

    // Store the original 3-tip builder (from the single-tree version).
    const __buildTree3 = buildTree;

    // Balanced binary layout for N tips (N > 3): guarantees no edge-overlap in x
    // by using a planar embedding: tips are placed left-to-right, internal nodes are midpoints.
    function buildTreeMulti(p, nTips) {
        const z = TREE_VIEW.zoom;

        const rootX = p.rootX + 30 + p.horizontalShift + NODE_OFFSETS.root.x;
        const rootY = p.rootY + p.verticalShift + NODE_OFFSETS.root.y;

        // Spacing tuned to roughly match the single-tree scale, but keep things compact.
        const xStep = Math.max(18, 0.55 * p.L_internal_to_tips * z);
        const yStep = Math.max(26, 0.85 * p.L_internal_to_tips * z);

        const xs = Array.from({ length: nTips }, (_, i) => rootX + (i - (nTips - 1) / 2) * xStep);

        let nodeCounter = 0;
        function makeId(prefix) {
            nodeCounter += 1;
            return `${prefix}_${nodeCounter}`;
        }

        function buildSpan(i0, i1, depth) {
            if (i0 === i1) {
                return {
                    id: `tip${i0 + 1}`,
                    x: xs[i0],
                    y: rootY + depth * yStep,
                    children: [],
                    //   label: `Tip ${i0 + 1}`,
                    label: (nTips > 25) ? `${i0 + 1}` : `Tip ${i0 + 1}`,
                };
            }
            const mid = Math.floor((i0 + i1) / 2);
            const left = buildSpan(i0, mid, depth + 1);
            const right = buildSpan(mid + 1, i1, depth + 1);

            return {
                id: `internal_${i0}_${i1}`,
                x: (left.x + right.x) / 2,
                y: rootY + depth * yStep,
                children: [left, right],
            };
        }

        // For nTips>3, we create a single root with two children spanning all tips.
        const tree = buildSpan(0, nTips - 1, 0);
        tree.id = "root";
        tree.x = rootX;
        tree.y = rootY;

        // Ensure exactly two children from the root for consistent downstream logic.
        // If buildSpan already returned a leaf (nTips==1) it won't happen here.
        if (!tree.children || tree.children.length === 0) {
            // Shouldn't happen for nTips>3, but keep safe.
            tree.children = [];
        }
        const marginTop = 60;
        const marginBottom = 140; // bigger bottom safety
        const marginLeft = 80;
        const marginRight = 60;

        const maxWidth = canvas.width - (marginLeft + marginRight);
        const maxHeight = canvas.height - (marginTop + marginBottom);


        // Calculate tree bounds and rescale if needed to fit within canvas
        const bounds = getTreeBounds(tree);
        //   const margin = 60; // Margin from canvas edges
        //   const maxWidth = canvas.width - 2 * margin;
        //   const maxHeight = canvas.height - 2 * margin;

        const treeWidth = bounds.maxX - bounds.minX;
        const treeHeight = bounds.maxY - bounds.minY;

        // Calculate scale factor needed to fit within canvas
        const scaleX = treeWidth > maxWidth ? maxWidth / treeWidth : 1;
        const scaleY = treeHeight > maxHeight ? maxHeight / treeHeight : 1;
        const scale = Math.min(scaleX, scaleY);
        function scaleTreeXY(node, sx, sy, ox, oy) {
            node.x = ox + sx * (node.x - ox);
            node.y = oy + sy * (node.y - oy);
            for (const ch of node.children) scaleTreeXY(ch, sx, sy, ox, oy);
        }
        scaleTreeXY(tree, scaleX, scaleY, rootX, rootY);
        return tree;
    }



    // Apply scaling and recentering if needed
    //   if (scale < 1) {
    //       const centerX = canvas.width / 2;
    //       const centerY = canvas.height / 2;
    //       const treeCenterX = (bounds.minX + bounds.maxX) / 2;
    //       const treeCenterY = (bounds.minY + bounds.maxY) / 2;

    //       scaleTree(tree, scale, treeCenterX, treeCenterY);

    //       // Recalculate bounds after scaling
    //       const newBounds = getTreeBounds(tree);
    //       const newCenterX = (newBounds.minX + newBounds.maxX) / 2;
    //       const newCenterY = (newBounds.minY + newBounds.maxY) / 2;

    //       // Translate to center
    //       const dx = centerX - newCenterX;
    //       const dy = centerY - newCenterY;
    //       translateTree(tree, dx, dy);
    //   }
    //         const sx = (treeWidth > maxWidth)  ? (maxWidth / treeWidth)  : 1;
    // const sy = treeHeight > maxHeight ? maxHeight / treeHeight : 1;; // keep vertical branch lengths


    //   if (scale < 1) {
    //     // Scale about the ROOT so the root stays fixed at (rootX, rootY)
    //     scaleTree(tree, scale, rootX, rootY);
    // }


    // Helper function to calculate tree bounds
    function getTreeBounds(node) {
        let minX = node.x;
        let maxX = node.x;
        let minY = node.y;
        let maxY = node.y;

        function traverse(n) {
            minX = Math.min(minX, n.x);
            maxX = Math.max(maxX, n.x);
            minY = Math.min(minY, n.y);
            maxY = Math.max(maxY, n.y);

            if (n.children) {
                n.children.forEach(traverse);
            }
        }

        traverse(node);
        return { minX, maxX, minY, maxY };
    }
    // ------------------------------------------------------------
    // Find node by id (robust to tree rebuilds / rescaling)
    // ------------------------------------------------------------
    function findNodeById(node, id) {
        if (!node || id == null) return null;

        if (node.id === id) return node;

        if (!node.children) return null;

        for (const child of node.children) {
            const found = findNodeById(child, id);
            if (found) return found;
        }

        return null;
    }

    // Helper function to scale tree around a center point
    function scaleTree(node, scale, centerX, centerY) {
        // scale=0.5
        function traverse(n) {
            n.x = centerX + (n.x - centerX) * scale;
            n.y = centerY + (n.y - centerY) * scale;

            if (n.children) {
                n.children.forEach(traverse);
            }
        }

        traverse(node);
    }

    // Helper function to translate entire tree
    function translateTree(node, dx, dy) {
        function traverse(n) {
            n.x += dx;
            n.y += dy;

            if (n.children) {
                n.children.forEach(traverse);
            }
        }

        traverse(node);
    }

    // Override buildTree used by drawTree().
    buildTree = function (p) {
        const n = getNumTips();
        if (n === 3) return __buildTree3(p);
        return buildTreeMulti(p, n);
    };

    // Redraw when tree size changes
    if (numTipsSelect) {
        numTipsSelect.addEventListener('change', () => {
            // Stop any running animation and reset state similarly to the built-in Reset button.
            isPlaying = false;
            if (playBtn) playBtn.textContent = '▶ Play';
            if (animationFrame) cancelAnimationFrame(animationFrame);

            // Clear animation history (if present)
            if (typeof animationHistory !== 'undefined' && animationHistory) {
                if (animationHistory.sequences && animationHistory.sequences.clear) animationHistory.sequences.clear();
                animationHistory.initialized = false;
                animationHistory.maxProgress = 0;
            }

            // Reset time travel mode (if active)
            if (typeof timeTravelMode !== 'undefined' && timeTravelMode) {
                if (timeSlider) timeSlider.value = 100;
                if (timeTravelCheckbox) timeTravelCheckbox.checked = false;
                timeTravelMode = false;
                if (timeSliderContainer) timeSliderContainer.classList.remove('active');
            }

            // Hide in-canvas panels by default for trees > 3 tips
            const n = getNumTips();
            if (n > 3) {
                showPhyloPanel = false;
                showGeoPanel = false;
                showHostPanel = false;
                showPhyloPanelBtn.classList.remove('active');
                showGeoPanelBtn.classList.remove('active');
                showHostPanelBtn.classList.remove('active');

                // Hide specific node position settings
                const rootSettings = document.getElementById('rootSettingsGroup');
                const internalSettings = document.getElementById('internalSettingsGroup');
                const tip1Settings = document.getElementById('tip1SettingsGroup');
                const tip2Settings = document.getElementById('tip2SettingsGroup');
                const tip3Settings = document.getElementById('tip3SettingsGroup');

                if (rootSettings) rootSettings.style.display = 'none';
                if (internalSettings) internalSettings.style.display = 'none';
                if (tip1Settings) tip1Settings.style.display = 'none';
                if (tip2Settings) tip2Settings.style.display = 'none';
                if (tip3Settings) tip3Settings.style.display = 'none';
            } else {
                showPhyloPanel = true;
                showGeoPanel = true;
                showHostPanel = true;
                showPhyloPanelBtn.classList.add('active');
                showGeoPanelBtn.classList.add('active');
                showHostPanelBtn.classList.add('active');

                // Show specific node position settings
                const rootSettings = document.getElementById('rootSettingsGroup');
                const internalSettings = document.getElementById('internalSettingsGroup');
                const tip1Settings = document.getElementById('tip1SettingsGroup');
                const tip2Settings = document.getElementById('tip2SettingsGroup');
                const tip3Settings = document.getElementById('tip3SettingsGroup');

                if (rootSettings) rootSettings.style.display = 'block';
                if (internalSettings) internalSettings.style.display = 'block';
                if (tip1Settings) tip1Settings.style.display = 'block';
                if (tip2Settings) tip2Settings.style.display = 'block';
                if (tip3Settings) tip3Settings.style.display = 'block';
            }

            // Rebuild and redraw
            drawTree();
            if (typeof initAnimation === 'function') initAnimation();
            if (!isPlaying && typeof renderCurrentState === 'function') renderCurrentState();
        });
    }

    // If something throws, show it in-page (so it never fails silently into a blank canvas).
    (function installErrorOverlay() {
        const box = document.createElement('div');
        box.style.cssText = 'position:fixed;left:16px;bottom:16px;max-width:520px;padding:10px 12px;border:1px solid #e0b4b4;border-radius:10px;background:#fff5f5;color:#8a1f1f;font:12px/1.35 JetBrains Mono, monospace;z-index:99999;display:none;white-space:pre-wrap;';
        document.body.appendChild(box);
        window.addEventListener('error', (e) => {
            box.style.display = 'block';
            box.textContent = 'JS error: ' + (e.message || e.error || 'unknown') + (e.filename ? `\n${e.filename}:${e.lineno}:${e.colno}` : '');
        });
        window.addEventListener('unhandledrejection', (e) => {
            box.style.display = 'block';
            box.textContent = 'Promise rejection: ' + (e.reason ? String(e.reason) : 'unknown');
        });
    })();


    (async function boot() {
        await loadWorldLand();
        await loadNaturalEarthCountries();

        // Set initial panel visibility and settings groups based on tree size
        const initialTips = getNumTips();
        if (initialTips > 3) {
            showPhyloPanel = false;
            showGeoPanel = false;
            showHostPanel = false;
            showPhyloPanelBtn.classList.remove('active');
            showGeoPanelBtn.classList.remove('active');
            showHostPanelBtn.classList.remove('active');

            // Hide specific node position settings
            const rootSettings = document.getElementById('rootSettingsGroup');
            const internalSettings = document.getElementById('internalSettingsGroup');
            const tip1Settings = document.getElementById('tip1SettingsGroup');
            const tip2Settings = document.getElementById('tip2SettingsGroup');
            const tip3Settings = document.getElementById('tip3SettingsGroup');

            if (rootSettings) rootSettings.style.display = 'none';
            if (internalSettings) internalSettings.style.display = 'none';
            if (tip1Settings) tip1Settings.style.display = 'none';
            if (tip2Settings) tip2Settings.style.display = 'none';
            if (tip3Settings) tip3Settings.style.display = 'none';
        }

        drawTree();
        initAnimation();
    })();
    // =============================
    // Branch tracking buttons
    // =============================

    function setBranchTrackMode(mode) {

        branchTrackMode = mode;

        // update rendering immediately
        renderCurrentState();

        // optional: highlight active button
        const ids = {
            phylo: 'trackPhyloBtn',
            geo: 'trackGeoBtn',
            host: 'trackHostBtn',
            none: 'trackNoneBtn'
        };

        Object.entries(ids).forEach(([m, id]) => {
            const btn = document.getElementById(id);
            if (!btn) return;

            const isActive = (m === mode);
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

    }


    // Attach listeners AFTER DOM exists
    document.getElementById('trackPhyloBtn')?.addEventListener(
        'click',
        () => setBranchTrackMode('phylo')
    );

    document.getElementById('trackGeoBtn')?.addEventListener(
        'click',
        () => setBranchTrackMode('geo')
    );

    document.getElementById('trackHostBtn')?.addEventListener(
        'click',
        () => setBranchTrackMode('host')
    );

    document.getElementById('trackNoneBtn')?.addEventListener(
        'click',
        () => setBranchTrackMode('none')
    );
}
