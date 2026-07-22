import { createAppLifecycle } from './appLifecycle.js';
import { bindAppControls } from './appControls.js';
import { syncTipCountUi as syncTipCountUiState } from './appOrchestration.js';
import {
    createSettingsController,
    installErrorOverlay,
} from './uiControllers.js';

export function createAppInitializer({
    dom,
    appState,
    animationController,
    geoMap,
    getNumTips,
    createTreeLayout,
    setTree,
    renderCurrentState,
    isPlaybackRunning,
    stopPlayback,
    resetPlaybackState,
    exitTimeTravelMode,
    syncCanvasResolution,
    nodeOffsets,
    treeView,
    panelView,
    defaultNodeOffsets,
    defaultTreeView,
    defaultPanelView,
    onRebuildTree,
    onStateChange,
    customModelController,
    dependencies = {},
}) {
    const {
        createSettingsControllerImpl = createSettingsController,
        bindAppControlsImpl = bindAppControls,
        installErrorOverlayImpl = installErrorOverlay,
        createAppLifecycleImpl = createAppLifecycle,
        syncTipCountUiImpl = syncTipCountUiState,
    } = dependencies;

    const settingsController = createSettingsControllerImpl({
        dom,
        nodeOffsets,
        treeView,
        panelView,
        defaultNodeOffsets,
        defaultTreeView,
        defaultPanelView,
        onRebuildTree,
        onStateChange,
    });
    settingsController.scheduleApplyOffsets();

    function syncTipCountUi(numTips) {
        return syncTipCountUiImpl({
            numTips,
            appState,
            panelButtons: [dom.showPhyloPanelBtn, dom.showGeoPanelBtn, dom.showHostPanelBtn],
            settingsController,
        });
    }

    bindAppControlsImpl({
        dom,
        state: appState,
        animationController,
        geoMap,
        getNumTips,
        createTreeLayout,
        setTree,
        syncTipCountUi,
        renderCurrentState,
        isPlaybackRunning,
        stopPlayback,
        resetPlaybackState,
        exitTimeTravelMode,
        onStateChange,
        customModelController,
    });

    installErrorOverlayImpl();

    const lifecycle = createAppLifecycleImpl({
        geoMap,
        syncCanvasResolution,
        renderCurrentState,
        isPlaybackRunning,
        getNumTips,
        syncTipCountUi,
        createTreeLayout,
        setTree,
        initAnimation: () => animationController.initAnimation(),
    });

    return {
        settingsController,
        syncTipCountUi,
        lifecycle,
        start() {
            lifecycle.start();
        },
    };
}
