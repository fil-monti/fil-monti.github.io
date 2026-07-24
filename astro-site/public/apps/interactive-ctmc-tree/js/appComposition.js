import { createRenderSnapshot } from './appSnapshots.js';
import {
    rebuildTree as rebuildTreeState,
    exitTimeTravelMode as exitTimeTravelModeState,
    resetPlaybackState as resetPlaybackStateState,
} from './appOrchestration.js';
import { getGeoViewport } from './panelRenderers.js';
import { renderVisualization } from './appRenderPipeline.js?v=20260723-tree-visible';
import {
    createAnimationProcessDefinitionsFromModelManifests,
    createDefaultModelManifests,
    createModelRuntimesFromModelManifests,
} from './modelManifests.js';
import {
    createGeoCTMCStarClass,
} from './geoStarSimulation.js';
import {
    createHostTransmissionCTMCClass,
} from './hostTransmissionSimulation.js';

export function createGeoViewportGetter({
    canvasWidth,
    panelView,
    getGeoViewportFn = getGeoViewport,
} = {}) {
    return function geoViewport() {
        return getGeoViewportFn({ canvasWidth, panelView });
    };
}

export function createSimulationClasses({
    geoStates,
    geoTransitionMatrix,
    hostStates,
    hostTransitionMatrix,
    projectEquirect,
    getGeoRoute,
    geographyRng,
    hostTransmissionRng,
    createGeoCTMCStarClassImpl = createGeoCTMCStarClass,
    createHostTransmissionCTMCClassImpl = createHostTransmissionCTMCClass,
} = {}) {
    const GeoCTMCStar = createGeoCTMCStarClassImpl({
        geoStates,
        transitionMatrix: geoTransitionMatrix,
        projectEquirect,
        getRoute: getGeoRoute,
        sampleCategorical: geographyRng.sampleCategorical,
        sampleExp: geographyRng.sampleExp,
    });

    const HostTransmissionCTMC = createHostTransmissionCTMCClassImpl({
        hostStates,
        hostTransitionMatrix,
        sampleCategorical: hostTransmissionRng.sampleCategorical,
        sampleExp: hostTransmissionRng.sampleExp,
    });

    return {
        GeoCTMCStar,
        HostTransmissionCTMC,
    };
}

export function createModelBundle({
    colors,
    getNumTips,
    rngStreams,
    HostTransmissionCTMC,
    hostStateColors,
    appState,
    customModelController,
    GeoCTMCStar,
    geoStates,
    geoMap,
    geoViewport,
    projectEquirect,
    hostStates,
    drawVirus,
    hostIconByName,
} = {}) {
    const modelManifests = createDefaultModelManifests({
        colors,
        getNumTips,
        hostVisualRandom: rngStreams.hostVisual.random,
        HostTransmissionCTMC,
        hostStateColors,
        getTransmissionRate: () => appState.transmissionRate,
        getShowHostTransmission: () => appState.showHostTransmission,
        getTrackAllHostBranches: () => appState.trackAllHostBranches,
        getCustomRuntime: () => customModelController.getRuntime(),
        getCustomCtmcRate: () => appState.customCtmcRate,
        getTrackAllCustomBranches: () => appState.trackAllCustomBranches,
        getShowCustomCtmc: () => appState.showCustomCtmc,
        GeoCTMCStar,
        geoStates,
        geoMap,
        getTrackAllBranches: () => appState.trackAllBranches,
        getShowPhylogeography: () => appState.showPhylogeography,
        getStickyPaths: () => appState.stickyPaths,
        getDiffusionRate: () => appState.diffusionRate,
        getGeoViewport: geoViewport,
        projectEquirect,
        hostStates,
        drawVirus,
        hostIconByName,
    });

    return {
        modelManifests,
        modelRuntimes: createModelRuntimesFromModelManifests(modelManifests),
        animationProcessDefinitions: createAnimationProcessDefinitionsFromModelManifests(modelManifests),
    };
}

export function createRenderCurrentState({
    ctx,
    canvasWidth,
    canvasHeight,
    getTree,
    setTree,
    getNumTips,
    createTreeLayout,
    syncCanvasResolution,
    appState,
    getAnimationController,
    panelView,
    colors,
    modelRuntimes,
    createRenderSnapshotFn = createRenderSnapshot,
    renderVisualizationFn = renderVisualization,
} = {}) {
    return function renderCurrentState() {
        const animationController = getAnimationController();
        const snapshot = createRenderSnapshotFn({
            animationState: animationController?.getState?.() || {},
            modelRuntimes,
        });

        setTree(renderVisualizationFn({
            ctx,
            canvasWidth,
            canvasHeight,
            tree: getTree(),
            getNumTips,
            createTreeLayout,
            syncCanvasResolution,
            appState,
            animationController,
            snapshot,
            panelView,
            colors,
            modelRuntimes,
        }));
    };
}

export function createTreeRebuilder({
    getAnimationController,
    geoMap,
    createTreeLayout,
    setTree,
    renderCurrentState,
    rebuildTreeFn = rebuildTreeState,
} = {}) {
    return function rebuildTree() {
        rebuildTreeFn({
            getAnimationController,
            geoMap,
            createTreeLayout,
            setTree,
            renderCurrentState,
        });
    };
}

export function createPlaybackHelpers({
    dom,
    appState,
    geoMap,
    getAnimationController,
    exitTimeTravelModeFn = exitTimeTravelModeState,
    resetPlaybackStateFn = resetPlaybackStateState,
} = {}) {
    function isPlaybackRunning() {
        return getAnimationController()?.isPlaying() || false;
    }

    function stopPlayback() {
        getAnimationController()?.stopPlayback();
    }

    function exitTimeTravelMode({ resetSlider = true } = {}) {
        exitTimeTravelModeFn({
            dom,
            appState,
            animationController: getAnimationController(),
            resetSlider,
        });
    }

    function resetPlaybackState({ invalidateGeoCaches = false } = {}) {
        resetPlaybackStateFn({
            stopPlayback,
            geoMap,
            animationController: getAnimationController(),
            appState,
            exitTimeTravelMode,
            invalidateGeoCaches,
        });
    }

    return {
        isPlaybackRunning,
        stopPlayback,
        exitTimeTravelMode,
        resetPlaybackState,
    };
}

export function createAnimationControllerOptions({
    getTree,
    findNodeById,
    getNumTips,
    getSeed,
    setSeed,
    initialSequence,
    colors,
    nucleotides,
    geoStates,
    hostStateColors,
    projectEquirect,
    getGeoViewport,
    GeoCTMCStar,
    HostTransmissionCTMC,
    appState,
    customModelController,
    processDefinitions,
    mutationRandom,
    hostVisualRandom,
    renderCurrentState,
    onPlaybackStateChange,
} = {}) {
    return {
        getTree,
        findNodeById,
        getNumTips,
        getSeed,
        setSeed,
        initialSequence,
        colors,
        nucleotides,
        geoStates,
        hostStateColors,
        projectEquirect,
        getGeoViewport,
        GeoCTMCStar,
        HostTransmissionCTMC,
        getSpeed: () => appState.speed,
        getMutationRate: () => appState.mutationRate,
        getDiffusionRate: () => appState.diffusionRate,
        getTransmissionRate: () => appState.transmissionRate,
        getStickyPaths: () => appState.stickyPaths,
        getTrackAllBranches: () => appState.trackAllBranches,
        getTrackAllHostBranches: () => appState.trackAllHostBranches,
        getTrackAllCustomBranches: () => appState.trackAllCustomBranches,
        getShowPhylogeography: () => appState.showPhylogeography,
        getShowHostTransmission: () => appState.showHostTransmission,
        getShowCustomCtmc: () => appState.showCustomCtmc,
        getCustomCtmcRate: () => appState.customCtmcRate,
        getCustomCTMCClass: () => customModelController.getRuntime()?.CTMCClass || null,
        getCustomCTMCStateCount: () => customModelController.getRuntime()?.spec?.stateCount || 0,
        processDefinitions,
        getTimeTravelMode: () => appState.timeTravelMode,
        mutationRandom,
        hostVisualRandom,
        renderCurrentState,
        onPlaybackStateChange,
    };
}
