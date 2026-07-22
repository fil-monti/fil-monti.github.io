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

    function syncCanvasResolution() {
        const dpr = Math.max(1, windowObject?.devicePixelRatio || 1);
        const displayW = canvas?.clientWidth || canvasWidth;
        const displayH = canvas?.clientHeight || canvasHeight;
        const targetW = Math.max(1, Math.round(displayW * dpr));
        const targetH = Math.max(1, Math.round(displayH * dpr));

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
