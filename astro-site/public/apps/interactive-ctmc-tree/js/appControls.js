import {
    syncPanelToggleButtons,
    syncPrimaryControlsFromState,
} from './appControlsShared.js';
import { bindPrimaryControls } from './appPrimaryControls.js';
import { bindCustomModelControls } from './appCustomModelControls.js';
import { bindAuxiliaryControls } from './appAuxiliaryControls.js';

export function bindAppControls({
    dom,
    state,
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
    onStateChange = null,
    customModelController,
    alertFn = message => window.alert(message),
}) {
    const notifyStateChange = () => onStateChange?.();

    syncPrimaryControlsFromState(dom, state);

    bindPrimaryControls({
        dom,
        state,
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
        notifyStateChange,
    });

    bindCustomModelControls({
        dom,
        state,
        animationController,
        renderCurrentState,
        isPlaybackRunning,
        resetPlaybackState,
        notifyStateChange,
        customModelController,
    });

    bindAuxiliaryControls({
        dom,
        state,
        animationController,
        renderCurrentState,
        isPlaybackRunning,
        stopPlayback,
        exitTimeTravelMode,
        notifyStateChange,
        alertFn,
    });

    syncPanelToggleButtons(dom, state);
}
