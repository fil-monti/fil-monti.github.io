import { generateRandomVirusColor } from './sequenceSimulation.js';
import {
    createDiscreteProcessAdapter,
    createGeoProcessAdapter,
} from './animationProcesses.js';
import {
    createPhyloModelRuntime,
    createGeoModelRuntime,
    createHostModelRuntime,
} from './modelPanelRuntimes.js';
import { createCustomSubstitutionModelManifest } from './customSubstitutionModels.js';
import {
    createHostStyle,
    createSingleTipHostStyle,
    createThreeTipInitialHostStyle,
    createThreeTipSplitHostStyle,
    DEFAULT_GEO_STAR_COLOR,
} from './renderStyles.js';
import { CANVAS_NEUTRALS } from './canvasPalette.js';

export function createAnimationProcessDefinitionsFromModelManifests(manifests = []) {
    return manifests
        .filter(manifest => typeof manifest?.createAnimationProcess === 'function')
        .map(manifest => ({
            key: manifest.key,
            stateKey: manifest.stateKey,
            createProcess: manifest.createAnimationProcess,
        }));
}

export function createModelRuntimesFromModelManifests(manifests = []) {
    return manifests
        .map(manifest => manifest?.createRenderRuntime?.())
        .filter(Boolean);
}

export function createDefaultModelManifests({
    colors,
    getNumTips,
    hostVisualRandom,
    HostTransmissionCTMC,
    hostStateColors,
    getTransmissionRate,
    getShowHostTransmission,
    getTrackAllHostBranches,
    getCustomRuntime = null,
    getCustomCTMCClass,
    getCustomCTMCStateCount,
    getCustomCtmcRate,
    getTrackAllCustomBranches,
    getShowCustomCtmc,
    getCustomRenderer,
    GeoCTMCStar,
    geoStates,
    geoMap = null,
    getTrackAllBranches,
    getShowPhylogeography,
    getStickyPaths,
    getDiffusionRate,
    getGeoViewport,
    projectEquirect,
    hostStates,
    drawVirus,
    hostIconByName,
}) {
    const nextHostVisualRandom = typeof hostVisualRandom === 'function' ? hostVisualRandom : (() => 0);
    const geoStateColors = (geoStates || []).map(state => state.color || CANVAS_NEUTRALS.subtle);

    return [
        {
            key: 'phylo',
            createRenderRuntime() {
                return createPhyloModelRuntime({ colors });
            },
        },
        {
            key: 'host',
            stateKey: 'hostCTMCs',
            createAnimationProcess({ getEntries, setEntries }) {
                return createDiscreteProcessAdapter({
                    key: 'host',
                    getEntries,
                    setEntries,
                    updatePhase: 'preFixation',
                    shouldInit: () => true,
                    shouldUpdate: () => getShowHostTransmission(),
                    getTrackAll: () => getTrackAllHostBranches(),
                    buildEntry: ({ sequence, initContext }) => {
                        const nTips = getNumTips();
                        const style = nTips === 1
                            ? createSingleTipHostStyle()
                            : nTips === 3
                            ? createThreeTipInitialHostStyle(sequence)
                            : (() => {
                                const color = generateRandomVirusColor(initContext.usedColors, nextHostVisualRandom);
                                initContext.usedColors.push(color);
                                return createHostStyle({ sequenceKey: sequence.sequenceId, color, lineage: 'random' });
                            })();
                        const ctmc = new HostTransmissionCTMC(0);
                        return { sequenceId: sequence.sequenceId, ctmc, ...style };
                    },
                    buildSplitEntry: ({ parentEntry, newSequence, child, childIndex }) => {
                        const nTips = getNumTips();
                        const style = nTips === 3
                            ? createThreeTipSplitHostStyle(child)
                            : (() => {
                                const color = childIndex === 0
                                    ? parentEntry.color
                                    : generateRandomVirusColor([parentEntry.color], nextHostVisualRandom);
                                return createHostStyle({
                                    sequenceKey: newSequence.sequenceId,
                                    color,
                                    lineage: childIndex === 0 ? 'inherited' : 'split',
                                });
                            })();
                        return {
                            sequenceId: newSequence.sequenceId,
                            ctmc: new HostTransmissionCTMC(0),
                            ...style,
                        };
                    },
                    getRate: () => getTransmissionRate(),
                    getBranchState: entry => ({
                        stateKey: entry.ctmc.i,
                        color: hostStateColors[entry.ctmc.i] || CANVAS_NEUTRALS.ink,
                    }),
                });
            },
            createRenderRuntime() {
                return createHostModelRuntime({
                    hostStates,
                    drawVirus,
                    hostIconByName,
                });
            },
        },
        createCustomSubstitutionModelManifest({
            getNumTips,
            hostVisualRandom: nextHostVisualRandom,
            getShowCustomCtmc,
            getTrackAllCustomBranches,
            getCustomCtmcRate,
            getCustomRuntime,
            getCustomCTMCClass,
            getCustomCTMCStateCount,
            getCustomRenderer,
        }),
        {
            key: 'geo',
            stateKey: 'geoStars',
            createAnimationProcess({ getEntries, setEntries, getEntriesByKey }) {
                return createGeoProcessAdapter({
                    getEntries,
                    setEntries,
                    GeoCTMCStar,
                    geoStates,
                    geoStateColors,
                    getTrackAllBranches,
                    getShowPhylogeography,
                    getStickyPaths,
                    getDiffusionRate,
                    getGeoViewport,
                    projectEquirect,
                    getHostEntries: () => getEntriesByKey('host'),
                    defaultColor: DEFAULT_GEO_STAR_COLOR,
                });
            },
            createRenderRuntime() {
                if (!geoMap) return null;
                return createGeoModelRuntime({
                    geoMap,
                    drawVirus,
                });
            },
        },
    ];
}
