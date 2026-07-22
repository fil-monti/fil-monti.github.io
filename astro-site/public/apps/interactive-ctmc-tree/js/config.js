import {
  CANVAS_GEO_STATE_COLORS,
  CANVAS_HOST_PALETTE,
  CANVAS_HOST_STATE_COLORS,
  CANVAS_NUCLEOTIDE_COLORS,
} from './canvasPalette.js';

export const CANVAS_DEFAULTS = {
  width: 1000,
  height: 700,
};

export const NUCLEOTIDE_COLORS = CANVAS_NUCLEOTIDE_COLORS;

export const NUCLEOTIDES = ["A", "T", "G", "C"];

export const DEFAULT_TREE_PARAMS = {
  rootX: 500,
  rootY: 100,
  horizontalShift: -38,
  verticalShift: -11.34,
  L_root_to_internal: 300,
  L_internal_to_tips: 250,
  L_root_to_tip3: 557.029,
  baseHalfSpreadRoot: Math.PI / 6,
  baseHalfSpreadInternal: Math.PI / 8,
  rootAngleScale: 2 / 3,
  internalAngleScale: 2 / 3,
};

export const DEFAULT_NODE_OFFSETS = {
  root: { x: 0, y: 0 },
  internal: { x: 0, y: 0 },
  tip1: { x: 0, y: 0 },
  tip2: { x: 0, y: 0 },
  tip3: { x: 0, y: 0 },
};

export const DEFAULT_TREE_VIEW = {
  zoom: 1.0,
};

export const DEFAULT_PANEL_VIEW = {
  phylo: { x: 0, y: 0, z: 1.0 },
  geo: { x: 0, y: 0, z: 1.0 },
  host: { x: 0, y: 0, z: 1.0 },
  custom: { x: 0, y: 0, z: 1.0 },
};

export const PANEL_LAYOUT = {
  phylo: {
    anchor: { x: 80, y: 80 },
    ctmc: {
      size: 120,
      arrowHeadLength: 8,
      nodeRadius: 16,
      transitionDotRadius: 6,
      titleOffsetY: -35,
      trackingLabelOffsetY: 30,
    },
    legend: {
      originX: 80,
      originY: 260,
      boxSize: 18,
      horizontalSpacing: 85,
      verticalSpacing: 24,
    },
  },
  geo: {
    baseOffsetRight: 360,
    baseY: 50,
    width: 342,
    height: 200,
    titleOffsetY: -12,
    trackedOffsets: {
      center: { x: 0, y: 0 },
      left: { x: -4.5, y: 0 },
      right: { x: 4.5, y: 0 },
    },
  },
  host: {
    baseOffsetRight: 360,
    baseY: 280 + 0.71 * (96 / 2.54),
    width: 342,
    height: 280,
    titleOffsetY: -12,
    ringRadius: 95,
    activeHaloRadius: 50,
    labelOffsetY: 48,
    activeScale: 0.5,
    inactiveScale: 0.4,
    pigScaleMultiplier: 1.3,
    iconYOffset: {
      Bat: 14,
      Pig: -10,
      Mosquito: 15,
    },
    trackedOffsets: {
      center: { x: 0, y: 0 },
      left: { x: -8, y: 0 },
      right: { x: 8, y: 0 },
    },
  },
  custom: {
    baseOffsetRight: 940,
    baseY: 378,
    width: 292,
    height: 224,
    titleOffsetY: -12,
    ringRadius: 78,
    activeHaloRadius: 28,
    labelOffsetY: 48,
    activeScale: 0.42,
    inactiveScale: 0.34,
    trackedOffsets: {
      farLeft: { x: -14, y: 0 },
      left: { x: -7, y: 0 },
      center: { x: 0, y: 0 },
      right: { x: 7, y: 0 },
      farRight: { x: 14, y: 0 },
    },
  },
};

export const TREE_STATE_LAYOUT = {
  geoBadge: {
    minWidth: 110,
    widthPerCharacter: 7.5,
    sequenceHeight: 18,
    extraHeightTop: 34,
    extraHeightBottom: 30,
    verticalOffset: 20,
    minFontSize: 9,
    fontSize: 12,
    cornerRadius: 6,
    labelBottomOffset: 13,
    labelLift: 40,
  },
  geoLabel: {
    minFontSize: 9,
    fontSize: 12,
    offsetY: 21,
  },
  hostMarker: {
    defaultHostScale: 0.35,
    pigHostScale: 0.525,
    jitterRadius: 8,
    virusHorizontalOffset: 30,
    verticalOffset: -35,
    panelTravelVirusScale: 0.4,
    panelIdleVirusScale: 0.33,
    treeVirusScale: 0.3,
  },
};

export const GEO_STATES = [
  { name: "North America", lon: -100, lat: 40, color: CANVAS_GEO_STATE_COLORS["North America"] },
  { name: "South America", lon: -60, lat: -15, color: CANVAS_GEO_STATE_COLORS["South America"] },
  { name: "Europe", lon: 10, lat: 50, color: CANVAS_GEO_STATE_COLORS["Europe"] },
  { name: "Africa", lon: 20, lat: 5, color: CANVAS_GEO_STATE_COLORS["Africa"] },
  { name: "Middle East", lon: 50, lat: 25, color: CANVAS_GEO_STATE_COLORS["Middle East"] },
  { name: "East Asia", lon: 110, lat: 35, color: CANVAS_GEO_STATE_COLORS["East Asia"] },
  { name: "Australia", lon: 135, lat: -25, color: CANVAS_GEO_STATE_COLORS["Australia"] },
];

export const COUNTRY_TO_GEOSTATE = {
  "United States of America": "North America",
  Canada: "North America",
  Mexico: "North America",
  Brazil: "South America",
  Argentina: "South America",
  Chile: "South America",
  France: "Europe",
  Germany: "Europe",
  "United Kingdom": "Europe",
  Italy: "Europe",
  "South Africa": "Africa",
  Nigeria: "Africa",
  Egypt: "Africa",
  "Saudi Arabia": "Middle East",
  Iran: "Middle East",
  "United Arab Emirates": "Middle East",
  China: "East Asia",
  Japan: "East Asia",
  "South Korea": "East Asia",
  Taiwan: "East Asia",
  Russia: "East Asia",
  Australia: "Australia",
  "New Zealand": "Australia",
};

export const REGION_COUNTRIES = {
  "North America": ["Canada", "United States of America", "Mexico"],
  "South America": [
    "Argentina", "Bolivia", "Brazil", "Chile", "Colombia", "Ecuador",
    "Guyana", "Paraguay", "Peru", "Suriname", "Uruguay", "Venezuela", "French Guiana",
  ],
  Europe: [
    "Albania", "Andorra", "Austria", "Belarus", "Belgium", "Bosnia and Herz.",
    "Bulgaria", "Croatia", "Czechia", "Denmark", "Estonia", "Finland", "France",
    "Germany", "Greece", "Hungary", "Ireland", "Italy", "Kosovo", "Latvia",
    "Liechtenstein", "Lithuania", "Luxembourg", "Macedonia", "Moldova", "Monaco",
    "Montenegro", "Netherlands", "Norway", "Poland", "Portugal", "Romania",
    "San Marino", "Serbia", "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland",
    "Ukraine", "United Kingdom", "Vatican",
  ],
  "Middle East": [
    "Turkey", "Cyprus", "Syria", "Lebanon", "Israel", "Jordan", "Iraq", "Iran",
    "Saudi Arabia", "Yemen", "Oman", "United Arab Emirates", "Qatar", "Bahrain",
    "Kuwait", "Palestine",
  ],
  "East Asia": ["China", "Mongolia", "Japan", "North Korea", "South Korea", "Taiwan", "Russia"],
  Australia: ["Australia", "New Zealand", "Papua New Guinea"],
};

export const HOST_STATES = [
  { name: "Human" },
  { name: "Bat" },
  { name: "Pig" },
  { name: "Monkey" },
  { name: "Mosquito" },
];

export const HOST_TRANSITION_MATRIX = [
  [0.10, 0.10, 0.30, 0.20, 0.30],
  [0.10, 0.10, 0.15, 0.30, 0.35],
  [0.30, 0.15, 0.10, 0.25, 0.20],
  [0.20, 0.30, 0.25, 0.10, 0.15],
  [0.30, 0.35, 0.20, 0.15, 0.00],
];

export const HOST_STATE_COLORS = CANVAS_HOST_STATE_COLORS;

export const HOST_PALETTE = CANVAS_HOST_PALETTE;

export const INITIAL_SEQUENCE = ["A", "T", "G", "C", "A"];
