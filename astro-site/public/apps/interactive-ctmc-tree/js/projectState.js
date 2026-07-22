import { DEFAULT_APP_STATE } from './appState.js';

export const PROJECT_STATE_STORAGE_KEY = 'interactiveMultiTree.frontend.projectState.v1';
export const PROJECT_STATE_HASH_PREFIX = '#state=';

const PROJECT_STATE_VERSION = 1;

const SERIALIZABLE_APP_STATE_KEYS = Object.freeze([
    ...Object.keys(DEFAULT_APP_STATE).filter(key => key !== 'timeTravelMode'),
    'branchTrackMode',
]);

function deepClone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
}

function pickSerializableAppState(appState = {}) {
    return Object.fromEntries(
        SERIALIZABLE_APP_STATE_KEYS.map(key => [key, appState[key]]),
    );
}

function safeParse(text) {
    try {
        return JSON.parse(text);
    } catch (_error) {
        return null;
    }
}

function readNumberInput(node, fallback) {
    const parsed = Number(node?.value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function assignNumberInput(node, value) {
    if (!node || value == null) return;
    node.value = String(value);
}

function assignCheckbox(node, value) {
    if (!node || value == null) return;
    node.checked = Boolean(value);
}

function assignText(node, value, formatter = String) {
    if (!node || value == null) return;
    node.textContent = formatter(value);
}

function normalizeProjectState(projectState) {
    if (!projectState || typeof projectState !== 'object') return null;
    return {
        version: projectState.version || PROJECT_STATE_VERSION,
        seed: projectState.seed,
        numTips: projectState.numTips,
        appState: projectState.appState && typeof projectState.appState === 'object'
            ? projectState.appState
            : {},
        nodeOffsets: projectState.nodeOffsets && typeof projectState.nodeOffsets === 'object'
            ? projectState.nodeOffsets
            : {},
        treeView: projectState.treeView && typeof projectState.treeView === 'object'
            ? projectState.treeView
            : {},
        panelView: projectState.panelView && typeof projectState.panelView === 'object'
            ? projectState.panelView
            : {},
        customModel: projectState.customModel && typeof projectState.customModel === 'object'
            ? projectState.customModel
            : {},
    };
}

function mergeNestedNumbers(target, source) {
    if (!target || !source || typeof source !== 'object') return;
    Object.keys(source).forEach(key => {
        if (!(key in target)) return;
        if (target[key] && typeof target[key] === 'object' && source[key] && typeof source[key] === 'object') {
            mergeNestedNumbers(target[key], source[key]);
            return;
        }
        const numeric = Number(source[key]);
        if (Number.isFinite(numeric)) target[key] = numeric;
    });
}

export function serializeProjectState({
    dom,
    appState,
    nodeOffsets,
    treeView,
    panelView,
    customModelController,
} = {}) {
    return {
        version: PROJECT_STATE_VERSION,
        seed: readNumberInput(dom?.seedInput, 42),
        numTips: readNumberInput(dom?.numTipsSelect, 3),
        appState: pickSerializableAppState(appState),
        nodeOffsets: deepClone(nodeOffsets || {}),
        treeView: deepClone(treeView || {}),
        panelView: deepClone(panelView || {}),
        customModel: {
            selectedModelId: customModelController?.getSelectedModelId?.() || null,
        },
    };
}

export function encodeProjectStateHash(projectState) {
    return `${PROJECT_STATE_HASH_PREFIX}${encodeURIComponent(JSON.stringify(projectState))}`;
}

export function decodeProjectStateHash(hash = '') {
    if (typeof hash !== 'string' || !hash.startsWith(PROJECT_STATE_HASH_PREFIX)) return null;
    const decoded = safeParse(decodeURIComponent(hash.slice(PROJECT_STATE_HASH_PREFIX.length)));
    return normalizeProjectState(decoded);
}

export function readPersistedProjectState({
    storage = null,
    locationHash = '',
} = {}) {
    const fromHash = decodeProjectStateHash(locationHash);
    if (fromHash) return fromHash;

    const rawStorageValue = storage?.getItem?.(PROJECT_STATE_STORAGE_KEY);
    return normalizeProjectState(safeParse(rawStorageValue || 'null'));
}

export function writePersistedProjectState({
    storage = null,
    windowObject = null,
    projectState,
} = {}) {
    const normalized = normalizeProjectState(projectState);
    if (!normalized) return null;

    const serialized = JSON.stringify(normalized);
    storage?.setItem?.(PROJECT_STATE_STORAGE_KEY, serialized);

    const hash = encodeProjectStateHash(normalized);
    if (windowObject?.history?.replaceState) {
        const { pathname = '', search = '' } = windowObject.location || {};
        windowObject.history.replaceState(null, '', `${pathname}${search}${hash}`);
    } else if (windowObject?.location) {
        windowObject.location.hash = hash;
    }

    return normalized;
}

export function applyProjectState({
    projectState,
    dom,
    appState,
    nodeOffsets,
    treeView,
    panelView,
} = {}) {
    const normalized = normalizeProjectState(projectState);
    if (!normalized) {
        return {
            selectedCustomModelId: null,
        };
    }

    Object.entries(normalized.appState || {}).forEach(([key, value]) => {
        if (!SERIALIZABLE_APP_STATE_KEYS.includes(key)) return;
        if (key in appState) appState[key] = value;
    });

    mergeNestedNumbers(nodeOffsets, normalized.nodeOffsets);
    mergeNestedNumbers(treeView, normalized.treeView);
    mergeNestedNumbers(panelView, normalized.panelView);

    assignNumberInput(dom?.seedInput, normalized.seed);
    assignNumberInput(dom?.numTipsSelect, normalized.numTips);

    assignNumberInput(dom?.speedSlider, appState?.speed);
    assignText(dom?.speedValue, appState?.speed, value => `${value}x`);
    assignNumberInput(dom?.mutationSlider, appState?.mutationRate);
    assignText(dom?.mutationValue, appState?.mutationRate, value => Number(value).toFixed(2));
    assignNumberInput(dom?.diffusionSlider, appState?.diffusionRate);
    assignText(dom?.diffusionValue, appState?.diffusionRate, value => Number(value).toFixed(2));
    assignNumberInput(dom?.transmissionSlider, appState?.transmissionRate);
    assignText(dom?.transmissionValue, appState?.transmissionRate, value => Number(value).toFixed(2));

    assignNumberInput(dom?.maxMutationRate, appState?.maxMutationRateValue);
    assignText(dom?.maxMutationRateVal, appState?.maxMutationRateValue);
    assignNumberInput(dom?.maxDiffusionRate, appState?.maxDiffusionRateValue);
    assignText(dom?.maxDiffusionRateVal, appState?.maxDiffusionRateValue);
    assignNumberInput(dom?.maxTransmissionRate, appState?.maxTransmissionRateValue);
    assignText(dom?.maxTransmissionRateVal, appState?.maxTransmissionRateValue);

    assignCheckbox(dom?.highlightCheckbox, appState?.highlightTrackedNucleotide);
    assignCheckbox(dom?.phylogeneticsCheckbox, appState?.showPhylogenetics);
    assignCheckbox(dom?.phylogeographyCheckbox, appState?.showPhylogeography);
    assignCheckbox(dom?.hostTransmissionCheckbox, appState?.showHostTransmission);
    assignCheckbox(dom?.trackAllBranchesCheckbox, appState?.trackAllBranches);
    assignCheckbox(dom?.trackAllHostBranchesCheckbox, appState?.trackAllHostBranches);
    assignCheckbox(dom?.stickyPathsCheckbox, appState?.stickyPaths);
    assignCheckbox(dom?.drawLocationsCheckbox, appState?.drawLocations);
    assignCheckbox(dom?.choroplethCheckbox, appState?.showChoroplethMap);
    assignCheckbox(dom?.observationsCheckbox, appState?.observationsMode);
    assignCheckbox(dom?.customCtmcCheckbox, appState?.showCustomCtmc);
    assignNumberInput(dom?.customCtmcRateSlider, appState?.customCtmcRate);
    assignText(dom?.customCtmcRateValue, appState?.customCtmcRate, value => Number(value).toFixed(2));
    assignCheckbox(dom?.trackAllCustomBranchesCheckbox, appState?.trackAllCustomBranches);

    assignNumberInput(dom?.rootOffsetX, nodeOffsets?.root?.x);
    assignNumberInput(dom?.rootOffsetY, nodeOffsets?.root?.y);
    assignNumberInput(dom?.internalOffsetX, nodeOffsets?.internal?.x);
    assignNumberInput(dom?.internalOffsetY, nodeOffsets?.internal?.y);
    assignNumberInput(dom?.tip1OffsetX, nodeOffsets?.tip1?.x);
    assignNumberInput(dom?.tip1OffsetY, nodeOffsets?.tip1?.y);
    assignNumberInput(dom?.tip2OffsetX, nodeOffsets?.tip2?.x);
    assignNumberInput(dom?.tip2OffsetY, nodeOffsets?.tip2?.y);
    assignNumberInput(dom?.tip3OffsetX, nodeOffsets?.tip3?.x);
    assignNumberInput(dom?.tip3OffsetY, nodeOffsets?.tip3?.y);

    assignNumberInput(dom?.treeZoom, treeView?.zoom);
    assignNumberInput(dom?.panelPhyloX, panelView?.phylo?.x);
    assignNumberInput(dom?.panelPhyloY, panelView?.phylo?.y);
    assignNumberInput(dom?.panelPhyloZ, panelView?.phylo?.z);
    assignNumberInput(dom?.panelGeoX, panelView?.geo?.x);
    assignNumberInput(dom?.panelGeoY, panelView?.geo?.y);
    assignNumberInput(dom?.panelGeoZ, panelView?.geo?.z);
    assignNumberInput(dom?.panelHostX, panelView?.host?.x);
    assignNumberInput(dom?.panelHostY, panelView?.host?.y);
    assignNumberInput(dom?.panelHostZ, panelView?.host?.z);

    return {
        selectedCustomModelId: normalized.customModel?.selectedModelId || null,
    };
}

export function createProjectStateController({
    storage = null,
    windowObject = null,
    dom,
    appState,
    nodeOffsets,
    treeView,
    panelView,
    customModelController,
} = {}) {
    let persistRaf = null;

    function capture() {
        return serializeProjectState({
            dom,
            appState,
            nodeOffsets,
            treeView,
            panelView,
            customModelController,
        });
    }

    function persistNow() {
        return writePersistedProjectState({
            storage,
            windowObject,
            projectState: capture(),
        });
    }

    function schedulePersist() {
        const scheduleFrame = windowObject?.requestAnimationFrame?.bind(windowObject)
            || (callback => setTimeout(callback, 0));
        const cancelFrame = windowObject?.cancelAnimationFrame?.bind(windowObject)
            || clearTimeout;

        if (persistRaf) cancelFrame(persistRaf);
        persistRaf = scheduleFrame(() => {
            persistRaf = null;
            persistNow();
        });
    }

    function restore() {
        return applyProjectState({
            projectState: readPersistedProjectState({
                storage,
                locationHash: windowObject?.location?.hash || '',
            }),
            dom,
            appState,
            nodeOffsets,
            treeView,
            panelView,
        });
    }

    return {
        capture,
        persistNow,
        schedulePersist,
        restore,
    };
}
