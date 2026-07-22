export const CANVAS_NEUTRALS = Object.freeze({
    ink: '#2d3947',
    muted: '#66798c',
    subtle: '#aab9c6',
    branch: '#5a6d81',
    arrow: '#b2bfcb',
    ocean: '#d9eef9',
    oceanChoroplethFallback: '#c8e2f3',
    oceanBorder: '#9fc7dc',
    uncoloredLand: '#b8d8ae',
    badgeOverlay: 'rgba(255,255,255,0.18)',
    nodeShadow: 'rgba(45,57,71,0.12)',
});

export const CANVAS_NUCLEOTIDE_COLORS = Object.freeze({
    A: '#d86b86',
    T: '#6e9fd8',
    G: '#d7a341',
    C: '#76a95f',
});

export const CANVAS_LINEAGE_COLORS = Object.freeze([
    '#d86b86',
    '#d98b60',
    '#d7a341',
    '#76a95f',
    '#6e9fd8',
    '#9f84d4',
    '#c96e98',
    '#58a49d',
    '#d7a06a',
    '#95af5f',
]);

export const CANVAS_THREE_TIP_LINEAGE_COLORS = Object.freeze({
    primary: '#d86b86',
    sibling: '#d98b60',
    outer: '#d7a341',
});

export const CANVAS_GEO_STATE_COLORS = Object.freeze({
    'North America': '#7ea9c8',
    'South America': '#5fa0af',
    'Europe': '#c9a46d',
    'Africa': '#9abc73',
    'Middle East': '#d7a06a',
    'East Asia': '#d88a74',
    'Australia': '#b38dcb',
});

export const CANVAS_GEO_SPECIAL_COLORS = Object.freeze({
    antarctica: '#ffffff',
    unknown: '#d3d3d3',
    uncoloredLand: CANVAS_NEUTRALS.uncoloredLand,
});

export const CANVAS_HOST_STATE_COLORS = Object.freeze({
    0: '#6e9fd8',
    1: '#686f82',
    2: '#d89aaa',
    3: '#8a674e',
    4: '#2d3947',
});

export const CANVAS_HOST_PALETTE = Object.freeze({
    human: '#6e9fd8',
    bat: '#686f82',
    elephant: '#7b8896',
    mouse: '#8a674e',
    mosquito: '#2d3947',
    virus: '#d86b86',
});

export const CANVAS_HOST_ILLUSTRATION_COLORS = Object.freeze({
    humanHighlight: 'rgba(255,255,255,0.22)',
    bat: {
        fur: '#4d5368',
        furLight: '#68718a',
        innerEar: '#d9c4b6',
        eye: '#1c2430',
        outline: 'rgba(45,57,71,0.22)',
        sparkle: 'rgba(255,255,255,0.45)',
    },
    monkey: {
        fur: '#7b624e',
        tail: '#6a5241',
        face: '#edd7c5',
        eye: '#1f2732',
        sparkle: 'rgba(255,255,255,0.45)',
    },
    pig: {
        pink: '#e3a7b5',
        pinkLight: '#efc7d0',
        outline: 'rgba(127, 90, 101, 0.34)',
        eye: '#1f2732',
        hoof: '#c78f99',
        nostril: 'rgba(112, 71, 83, 0.52)',
        sparkle: 'rgba(255,255,255,0.5)',
        bellyGlow: 'rgba(255,255,255,0.16)',
    },
    mosquito: {
        wingGlow: 'rgba(255,255,255,0.12)',
    },
    virus: {
        sheen: 'rgba(255,255,255,0.26)',
    },
});

export const CANVAS_CUSTOM_STATE_COLORS = Object.freeze([
    CANVAS_NUCLEOTIDE_COLORS.A,
    CANVAS_NUCLEOTIDE_COLORS.C,
    CANVAS_NUCLEOTIDE_COLORS.G,
    CANVAS_NUCLEOTIDE_COLORS.T,
    '#9f84d4',
    '#58a49d',
    '#c96e98',
    '#d98b60',
    '#95af5f',
    '#7c8fa3',
]);

export const CANVAS_FIGURE_LABEL_COLORS = Object.freeze({
    activeHalo: 'rgba(110,159,216,0.12)',
    activeLabel: '#5d8ea3',
    inactiveLabel: '#66798c',
    title: '#5c6f82',
});
