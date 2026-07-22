export const DEFAULT_APP_STATE = Object.freeze({
    speed: 0.1,
    mutationRate: 5,
    branchTrackMode: 'phylo',
    highlightTrackedNucleotide: true,
    showPhylogenetics: true,
    showPhylogeography: true,
    showHostTransmission: true,
    showCustomCtmc: false,
    showPhyloPanel: true,
    showGeoPanel: true,
    showHostPanel: true,
    showCustomCtmcPanel: true,
    stickyPaths: false,
    drawLocations: true,
    trackAllBranches: true,
    trackAllHostBranches: true,
    trackAllCustomBranches: true,
    diffusionRate: 5,
    transmissionRate: 5,
    customCtmcRate: 1.8,
    showChoroplethMap: false,
    observationsMode: false,
    timeTravelMode: false,
    maxMutationRateValue: 10,
    maxDiffusionRateValue: 10,
    maxTransmissionRateValue: 10,
});

export function createAppState(overrides = {}) {
    const state = {
        ...DEFAULT_APP_STATE,
        ...overrides,
    };

    function setValue(key, value) {
        state[key] = value;
        return value;
    }

    Object.defineProperties(state, {
        setValue: {
            enumerable: false,
            value: setValue,
        },
        setFlag: {
            enumerable: false,
            value(key, enabled) {
                return setValue(key, Boolean(enabled));
            },
        },
        toggleFlag: {
            enumerable: false,
            value(key) {
                return setValue(key, !state[key]);
            },
        },
        setNumber: {
            enumerable: false,
            value(key, value, fallback = state[key]) {
                const numeric = Number(value);
                return setValue(key, Number.isFinite(numeric) ? numeric : fallback);
            },
        },
        setMode: {
            enumerable: false,
            value(key, value) {
                return setValue(key, value);
            },
        },
        setRateCap: {
            enumerable: false,
            value(limitKey, limitValue, rateKey) {
                const nextLimit = state.setNumber(limitKey, limitValue);
                if (rateKey && state[rateKey] > nextLimit) {
                    setValue(rateKey, nextLimit);
                }
                return nextLimit;
            },
        },
        togglePanel: {
            enumerable: false,
            value(panelKey) {
                return state.toggleFlag(panelKey);
            },
        },
        setPanelVisibility: {
            enumerable: false,
            value(visible) {
                state.setFlag('showPhyloPanel', visible);
                state.setFlag('showGeoPanel', visible);
                state.setFlag('showHostPanel', visible);
                return visible;
            },
        },
        syncTipCountVisibility: {
            enumerable: false,
            value(numTips) {
                const showPanels = numTips <= 3;
                state.setPanelVisibility(showPanels);
                return showPanels;
            },
        },
        setTimeTravelMode: {
            enumerable: false,
            value(enabled) {
                return state.setFlag('timeTravelMode', enabled);
            },
        },
    });

    return state;
}
