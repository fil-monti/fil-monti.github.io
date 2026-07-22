export function rebuildTree({
    getAnimationController,
    geoMap,
    createTreeLayout,
    setTree,
    renderCurrentState,
}) {
    const animationController = getAnimationController?.();
    const wasPlaying = animationController?.isPlaying?.() || false;
    geoMap?.invalidateCaches?.();
    setTree?.(createTreeLayout?.());
    animationController?.initAnimation?.();
    if (wasPlaying) {
        animationController?.startPlayback?.();
    } else {
        renderCurrentState?.();
    }
}

export function exitTimeTravelMode({
    dom,
    appState,
    animationController,
    resetSlider = true,
}) {
    if (resetSlider && dom?.timeSlider) dom.timeSlider.value = 100;
    if (dom?.timeTravelCheckbox) dom.timeTravelCheckbox.checked = false;
    appState?.setTimeTravelMode?.(false);
    dom?.timeSliderContainer?.classList?.remove?.('active');

    const sequences = animationController?.getState?.()?.sequences || [];
    sequences.forEach(sequence => {
        sequence.hideInTimeTravel = false;
    });
}

export function resetPlaybackState({
    stopPlayback,
    geoMap,
    animationController,
    appState,
    exitTimeTravelMode,
    invalidateGeoCaches = false,
}) {
    stopPlayback?.();
    if (invalidateGeoCaches) geoMap?.invalidateCaches?.();
    animationController?.clearHistory?.();
    if (appState?.timeTravelMode) exitTimeTravelMode?.();
}

export function syncTipCountUi({
    numTips,
    appState,
    panelButtons = [],
    settingsController,
}) {
    const showPanels = appState?.syncTipCountVisibility?.(numTips);
    panelButtons.forEach(button => button?.classList?.toggle?.('active', showPanels));
    settingsController?.setNodeSettingsGroupVisibility?.(showPanels);
    return showPanels;
}
