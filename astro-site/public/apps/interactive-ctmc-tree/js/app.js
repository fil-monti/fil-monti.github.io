// =============================================================================
// app.js  –  Phylogenetics / Phylogeography / Host-transmission visualisation
// =============================================================================

import {
    NUCLEOTIDE_COLORS,
    NUCLEOTIDES,
    DEFAULT_TREE_PARAMS,
    DEFAULT_NODE_OFFSETS,
    DEFAULT_TREE_VIEW,
    DEFAULT_PANEL_VIEW,
    GEO_STATES,
    HOST_STATES,
    HOST_TRANSITION_MATRIX,
    HOST_STATE_COLORS,
    HOST_PALETTE,
    INITIAL_SEQUENCE,
} from './config.js';
import {
    findNodeById,
} from './treeGeometry.js';
import { createHostRenderers } from './hostIcons.js';
import { createGeoMapRenderer, projectEquirect } from './geoMap.js';
import { getDomRefs } from './domElements.js';
import { registerDevTreeHooks } from './devTools.js';
import { createAppInitializer } from './appInitializer.js';
import { createAppState } from './appState.js';
import { createSeededRandomStreams } from './randomUtils.js';
import { createGeoRouteBuilder } from './geoRouteUtils.js';
import { createAnimationController } from './animationController.js';
import { createCustomModelController } from './customModelController.js';
import { createProjectStateController } from './projectState.js';
import {
    createCanvasRuntime,
    createMutableLayoutState,
    createTreeLayoutFactory,
    createUniformTransitionMatrix,
    applyLaunchDefaults,
    getProjectStateLaunchOptions,
    getNumTipsFromSelect,
    getSafeStorage,
} from './appBootstrap.js';
import {
    createAnimationControllerOptions,
    createGeoViewportGetter,
    createModelBundle,
    createPlaybackHelpers,
    createRenderCurrentState,
    createSimulationClasses,
    createTreeRebuilder,
} from './appComposition.js';

export default function initApp() {

    const dom = getDomRefs();
    const { canvas } = dom;
    const ctx = canvas.getContext('2d');
    const {
        canvasWidth: CANVAS_W,
        canvasHeight: CANVAS_H,
        syncCanvasResolution,
    } = createCanvasRuntime({
        canvas,
        ctx,
        windowObject: window,
    });

    const colors = NUCLEOTIDE_COLORS;
    const nucleotides = NUCLEOTIDES;
    const {
        treeParams: TREE_PARAMS,
        nodeOffsets: NODE_OFFSETS,
        treeView: TREE_VIEW,
        panelView: PANEL_VIEW,
    } = createMutableLayoutState({
        defaultTreeParams: DEFAULT_TREE_PARAMS,
        defaultNodeOffsets: DEFAULT_NODE_OFFSETS,
        defaultTreeView: DEFAULT_TREE_VIEW,
        defaultPanelView: DEFAULT_PANEL_VIEW,
    });
    const geoStates = GEO_STATES;
    const geoTransitionMatrix = createUniformTransitionMatrix(geoStates.length);
    const hostStates = HOST_STATES;
    const hostTransitionMatrix = HOST_TRANSITION_MATRIX;
    const hostPalette = HOST_PALETTE;
    const initialSequence = INITIAL_SEQUENCE;
    const rng = createSeededRandomStreams(42, [
        'mutation',
        'geography',
        'hostTransmission',
        'hostVisual',
        'customCTMC',
    ]);

    const getNumTips = () => getNumTipsFromSelect(dom.numTipsSelect, 3);
    const createTreeLayout = createTreeLayoutFactory({
        getNumTips,
        treeParams: TREE_PARAMS,
        treeView: TREE_VIEW,
        nodeOffsets: NODE_OFFSETS,
        canvasWidth: CANVAS_W,
        canvasHeight: CANVAS_H,
    });
    let tree = createTreeLayout(3);
    let animationController = null;

    const geoRouteBuilder = createGeoRouteBuilder({
        geoStates,
        projectGeoState: (state, offsetX, offsetY, mapWidth, mapHeight) =>
            projectEquirect(state.lon, state.lat, offsetX, offsetY, mapWidth, mapHeight),
    });
    const {
        GeoCTMCStar,
        HostTransmissionCTMC,
    } = createSimulationClasses({
        geoStates,
        geoTransitionMatrix,
        hostStates,
        hostTransitionMatrix,
        projectEquirect,
        getGeoRoute: geoRouteBuilder.getRoute,
        geographyRng: rng.streams.geography,
        hostTransmissionRng: rng.streams.hostTransmission,
    });

    const { HOST_ICON, drawVirus } = createHostRenderers(hostPalette);
    const storage = getSafeStorage(window);
    const appState = createAppState();
    const geoViewport = createGeoViewportGetter({
        canvasWidth: CANVAS_W,
        panelView: PANEL_VIEW,
    });
    const geoMap = createGeoMapRenderer({
        geoStates,
        getViewport: geoViewport,
        getShowChoroplethMap: () => appState.showChoroplethMap,
    });

    const projectStateController = createProjectStateController({
        storage,
        windowObject: window,
        dom,
        appState,
        nodeOffsets: NODE_OFFSETS,
        treeView: TREE_VIEW,
        panelView: PANEL_VIEW,
        customModelController: null,
    });
    const projectStateLaunchOptions = getProjectStateLaunchOptions({ windowObject: window });
    const restoredProjectState = projectStateLaunchOptions.restore
        ? projectStateController.restore()
        : { selectedCustomModelId: null };
    applyLaunchDefaults({
        windowObject: window,
        dom,
        appState,
    });
    const playback = createPlaybackHelpers({
        dom,
        appState,
        geoMap,
        getAnimationController: () => animationController,
    });
    let renderCurrentState = () => {};

    const customModelController = createCustomModelController({
        dom,
        storage,
        appState,
        sampleCategorical: rng.streams.customCTMC.sampleCategorical,
        sampleExp: rng.streams.customCTMC.sampleExp,
        resetPlaybackState: (...args) => playback.resetPlaybackState(...args),
        initAnimation: () => animationController?.initAnimation(),
        renderCurrentState: (...args) => renderCurrentState(...args),
    });
    const persistProjectState = createProjectStateController({
        storage,
        windowObject: window,
        dom,
        appState,
        nodeOffsets: NODE_OFFSETS,
        treeView: TREE_VIEW,
        panelView: PANEL_VIEW,
        customModelController,
    });
    const {
        modelRuntimes,
        animationProcessDefinitions,
    } = createModelBundle({
        colors,
        getNumTips,
        rngStreams: rng.streams,
        HostTransmissionCTMC,
        hostStateColors: HOST_STATE_COLORS,
        appState,
        customModelController,
        GeoCTMCStar,
        geoStates,
        geoMap,
        geoViewport,
        projectEquirect,
        hostStates,
        drawVirus,
        hostIconByName: HOST_ICON,
    });

    renderCurrentState = createRenderCurrentState({
        ctx,
        canvasWidth: CANVAS_W,
        canvasHeight: CANVAS_H,
        getTree: () => tree,
        setTree: nextTree => {
            tree = nextTree;
        },
        getNumTips,
        createTreeLayout,
        syncCanvasResolution,
        appState,
        getAnimationController: () => animationController,
        panelView: PANEL_VIEW,
        colors,
        modelRuntimes,
    });
    const rebuildTree = createTreeRebuilder({
        getAnimationController: () => animationController,
        geoMap,
        createTreeLayout,
        setTree: nextTree => {
            tree = nextTree;
        },
        renderCurrentState,
    });
    registerDevTreeHooks({
        treeParams: TREE_PARAMS,
        nodeOffsets: NODE_OFFSETS,
        rebuildTree,
        customModelController,
    });

    animationController = createAnimationController(createAnimationControllerOptions({
        getTree: () => tree,
        findNodeById,
        getNumTips,
        getSeed: () => (dom.seedInput ? parseInt(dom.seedInput.value, 10) || 42 : 42),
        setSeed: rng.setSeed,
        initialSequence,
        colors,
        nucleotides,
        geoStates,
        hostStateColors: HOST_STATE_COLORS,
        projectEquirect,
        getGeoViewport: geoViewport,
        GeoCTMCStar,
        HostTransmissionCTMC,
        appState,
        customModelController,
        processDefinitions: animationProcessDefinitions,
        mutationRandom: rng.streams.mutation.random,
        hostVisualRandom: rng.streams.hostVisual.random,
        renderCurrentState,
        onPlaybackStateChange: playing => {
            if (dom.playBtn) dom.playBtn.textContent = playing ? '⏸ Pause' : '▶ Play';
        },
    }));

    customModelController.initialize();
    if (restoredProjectState.selectedCustomModelId) {
        customModelController.selectModel(restoredProjectState.selectedCustomModelId, { resetAnimation: false });
    }

    const initializer = createAppInitializer({
        dom,
        appState,
        animationController,
        geoMap,
        getNumTips,
        createTreeLayout,
        setTree: nextTree => {
            tree = nextTree;
        },
        renderCurrentState,
        isPlaybackRunning: playback.isPlaybackRunning,
        stopPlayback: playback.stopPlayback,
        resetPlaybackState: playback.resetPlaybackState,
        exitTimeTravelMode: playback.exitTimeTravelMode,
        syncCanvasResolution,
        nodeOffsets: NODE_OFFSETS,
        treeView: TREE_VIEW,
        panelView: PANEL_VIEW,
        defaultNodeOffsets: DEFAULT_NODE_OFFSETS,
        defaultTreeView: DEFAULT_TREE_VIEW,
        defaultPanelView: DEFAULT_PANEL_VIEW,
        onRebuildTree: rebuildTree,
        onStateChange: () => {
            if (projectStateLaunchOptions.persist) persistProjectState.schedulePersist();
        },
        customModelController,
    });
    if (projectStateLaunchOptions.persist) persistProjectState.persistNow();
    initializer.start();
}
