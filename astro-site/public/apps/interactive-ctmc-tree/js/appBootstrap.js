import { CANVAS_DEFAULTS } from './config.js';
import { buildTree, buildTreeMulti } from './treeGeometry.js';

export function cloneConfig(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
}

export function getSafeStorage(windowObject = (typeof window !== 'undefined' ? window : null)) {
    try {
        return windowObject?.localStorage || null;
    } catch (_error) {
        return null;
    }
}

export function createCanvasRuntime({
    canvas,
    ctx,
    windowObject = (typeof window !== 'undefined' ? window : null),
    canvasDefaults = CANVAS_DEFAULTS,
} = {}) {
    const canvasWidth = Number(canvas?.getAttribute?.('width')) || canvasDefaults.width;
    const canvasHeight = Number(canvas?.getAttribute?.('height')) || canvasDefaults.height;
    const doc = canvas?.ownerDocument || windowObject?.document || null;
    const root = doc?.documentElement || null;
    const isPresentation = root?.getAttribute?.('data-presentation') === '1';
    const presentationResolutionScale = isPresentation ? 2 : 1;
    const maxCanvasPixels = isPresentation ? 16_000_000 : 8_000_000;

    function syncCanvasResolution() {
        const dpr = Math.max(1, windowObject?.devicePixelRatio || 1);
        const renderScale = dpr * presentationResolutionScale;
        const displayW = canvas?.clientWidth || canvasWidth;
        const displayH = canvas?.clientHeight || canvasHeight;
        let targetW = Math.max(1, Math.round(displayW * renderScale));
        let targetH = Math.max(1, Math.round(displayH * renderScale));
        const targetPixels = targetW * targetH;

        if (targetPixels > maxCanvasPixels) {
            const downscale = Math.sqrt(maxCanvasPixels / targetPixels);
            targetW = Math.max(1, Math.floor(targetW * downscale));
            targetH = Math.max(1, Math.floor(targetH * downscale));
        }

        if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
        }

        ctx.setTransform(targetW / canvasWidth, 0, 0, targetH / canvasHeight, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
    }

    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    syncCanvasResolution();

    return {
        canvasWidth,
        canvasHeight,
        syncCanvasResolution,
    };
}

export function createMutableLayoutState({
    defaultTreeParams,
    defaultNodeOffsets,
    defaultTreeView,
    defaultPanelView,
} = {}) {
    return {
        treeParams: cloneConfig(defaultTreeParams),
        nodeOffsets: cloneConfig(defaultNodeOffsets),
        treeView: cloneConfig(defaultTreeView),
        panelView: cloneConfig(defaultPanelView),
    };
}

export function createUniformTransitionMatrix(stateCount) {
    return Array.from({ length: stateCount }, () => Array(stateCount).fill(1 / stateCount));
}

export function parseTipCountValue(value, fallback = 3) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function getNumTipsFromSelect(select, fallback = 3) {
    return parseTipCountValue(select?.value, fallback);
}

function getUrlSearchParams(windowObject = (typeof window !== 'undefined' ? window : null)) {
    try {
        return new URLSearchParams(windowObject?.location?.search || '');
    } catch (_error) {
        return null;
    }
}

function readFirstParam(params, keys = []) {
    for (const key of keys) {
        const value = params?.get?.(key);
        if (value != null && value !== '') return value;
    }
    return null;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function parseModelList(value = '') {
    return value
        .split(',')
        .map(model => model.trim().toLowerCase())
        .filter(Boolean);
}

function isPhylogeneticsAlias(value) {
    return [
        'dna',
        'nucleotide',
        'nucleotides',
        'phylo',
        'phylogenetic',
        'phylogenetics',
    ].includes(value);
}

function isDisabledParamValue(value) {
    return [
        '0',
        'default',
        'false',
        'none',
        'off',
    ].includes(String(value || '').trim().toLowerCase());
}

export function getProjectStateLaunchOptions({
    windowObject = (typeof window !== 'undefined' ? window : null),
} = {}) {
    const params = getUrlSearchParams(windowObject);
    if (!params) {
        return {
            restore: true,
            persist: true,
        };
    }

    const stateValue = readFirstParam(params, ['state']);
    const stateIsDisabled = isDisabledParamValue(stateValue);

    return {
        restore: !stateIsDisabled && !isDisabledParamValue(readFirstParam(params, ['restoreState', 'restore'])),
        persist: !stateIsDisabled && !isDisabledParamValue(readFirstParam(params, ['persistState', 'persist'])),
    };
}

export function applyLaunchDefaults({
    windowObject = (typeof window !== 'undefined' ? window : null),
    dom,
    appState,
    minTips = 1,
    maxTips = 40,
} = {}) {
    const params = getUrlSearchParams(windowObject);
    if (!params) return { applied: false };

    let applied = false;
    const treeSizeRaw = readFirstParam(params, ['treeSize', 'numTips', 'tips']);
    const treeSize = parseInt(treeSizeRaw, 10);

    if (Number.isFinite(treeSize) && dom?.numTipsSelect) {
        dom.numTipsSelect.value = String(clamp(treeSize, minTips, maxTips));
        applied = true;
    }

    const modelList = parseModelList(readFirstParam(params, ['models', 'mode']) || '');
    const phylogeneticsOnly = modelList.length > 0 && modelList.every(isPhylogeneticsAlias);

    if (phylogeneticsOnly && appState) {
        appState.showPhylogenetics = true;
        appState.showPhylogeography = false;
        appState.showHostTransmission = false;
        appState.showCustomCtmc = false;
        appState.showPhyloPanel = true;
        appState.showGeoPanel = false;
        appState.showHostPanel = false;
        appState.showCustomCtmcPanel = false;
        appState.branchTrackMode = 'phylo';
        appState.highlightTrackedNucleotide = true;
        applied = true;
    }

    return { applied };
}

export function createTreeLayoutFactory({
    getNumTips,
    treeParams,
    treeView,
    nodeOffsets,
    canvasWidth,
    canvasHeight,
    buildTreeImpl = buildTree,
    buildTreeMultiImpl = buildTreeMulti,
} = {}) {
    return function createTreeLayout(nTips = getNumTips()) {
        return nTips === 3
            ? buildTreeImpl(treeParams, treeView.zoom, nodeOffsets)
            : buildTreeMultiImpl(
                treeParams,
                nTips,
                treeView.zoom,
                nodeOffsets,
                { width: canvasWidth, height: canvasHeight },
            );
    };
}
