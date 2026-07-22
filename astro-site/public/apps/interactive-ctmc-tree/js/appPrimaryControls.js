import { renderIfIdle } from './appControlsShared.js';

export function bindPrimaryControls({
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
} = {}) {
    const {
        playBtn,
        resetBtn,
        speedSlider,
        speedValue,
        mutationSlider,
        mutationValue,
        seedInput,
        highlightCheckbox,
        phylogeneticsCheckbox,
        phylogeneticsControls,
        phylogeographyCheckbox,
        phylogeographyControls,
        diffusionSlider,
        diffusionValue,
        trackAllBranchesCheckbox,
        stickyPathsCheckbox,
        drawLocationsCheckbox,
        choroplethCheckbox,
        hostTransmissionCheckbox,
        hostTransmissionControls,
        transmissionSlider,
        transmissionValue,
        trackAllHostBranchesCheckbox,
        showPhyloPanelBtn,
        showGeoPanelBtn,
        showHostPanelBtn,
        numTipsSelect,
        maxMutationRate,
        maxMutationRateVal,
        maxDiffusionRate,
        maxDiffusionRateVal,
        maxTransmissionRate,
        maxTransmissionRateVal,
    } = dom;

    maxMutationRate?.addEventListener('input', event => {
        const maxRate = state.setRateCap('maxMutationRateValue', parseInt(event.target.value, 10), 'mutationRate');
        if (maxMutationRateVal) maxMutationRateVal.textContent = maxRate;
        if (mutationSlider) {
            mutationSlider.max = maxRate;
            mutationSlider.value = state.mutationRate;
        }
        if (mutationValue) mutationValue.textContent = state.mutationRate.toFixed(2);
        notifyStateChange();
    });

    maxDiffusionRate?.addEventListener('input', event => {
        const maxRate = state.setRateCap('maxDiffusionRateValue', parseInt(event.target.value, 10), 'diffusionRate');
        if (maxDiffusionRateVal) maxDiffusionRateVal.textContent = maxRate;
        if (diffusionSlider) {
            diffusionSlider.max = maxRate;
            diffusionSlider.value = state.diffusionRate;
        }
        if (diffusionValue) diffusionValue.textContent = state.diffusionRate.toFixed(2);
        notifyStateChange();
    });

    maxTransmissionRate?.addEventListener('input', event => {
        const maxRate = state.setRateCap('maxTransmissionRateValue', parseInt(event.target.value, 10), 'transmissionRate');
        if (maxTransmissionRateVal) maxTransmissionRateVal.textContent = maxRate;
        if (transmissionSlider) {
            transmissionSlider.max = maxRate;
            transmissionSlider.value = state.transmissionRate;
        }
        if (transmissionValue) transmissionValue.textContent = state.transmissionRate.toFixed(2);
        notifyStateChange();
    });

    playBtn?.addEventListener('click', () => {
        if (!isPlaybackRunning()) {
            if (state.timeTravelMode) exitTimeTravelMode({ resetSlider: false });
            animationController.startPlayback();
            return;
        }
        stopPlayback();
    });

    resetBtn?.addEventListener('click', () => {
        resetPlaybackState({ invalidateGeoCaches: true });
        animationController.initAnimation();
    });

    speedSlider?.addEventListener('input', event => {
        state.setNumber('speed', event.target.value);
        if (speedValue) speedValue.textContent = `${state.speed}x`;
        notifyStateChange();
    });

    seedInput?.addEventListener('change', () => {
        resetPlaybackState();
        animationController.initAnimation();
        notifyStateChange();
    });

    mutationSlider?.addEventListener('input', event => {
        state.setNumber('mutationRate', event.target.value);
        if (mutationValue) mutationValue.textContent = state.mutationRate.toFixed(2);
        notifyStateChange();
    });

    highlightCheckbox?.addEventListener('change', event => {
        state.setFlag('highlightTrackedNucleotide', event.target.checked);
        notifyStateChange();
    });

    phylogeneticsCheckbox?.addEventListener('change', event => {
        state.setFlag('showPhylogenetics', event.target.checked);
        if (phylogeneticsControls) phylogeneticsControls.style.display = state.showPhylogenetics ? 'flex' : 'none';
        renderIfIdle(isPlaybackRunning, renderCurrentState);
        notifyStateChange();
    });

    showPhyloPanelBtn?.addEventListener('click', () => {
        const isActive = state.togglePanel('showPhyloPanel');
        showPhyloPanelBtn.classList.toggle('active', isActive);
        renderIfIdle(isPlaybackRunning, renderCurrentState);
        notifyStateChange();
    });

    showGeoPanelBtn?.addEventListener('click', () => {
        const isActive = state.togglePanel('showGeoPanel');
        showGeoPanelBtn.classList.toggle('active', isActive);
        renderIfIdle(isPlaybackRunning, renderCurrentState);
        notifyStateChange();
    });

    showHostPanelBtn?.addEventListener('click', () => {
        const isActive = state.togglePanel('showHostPanel');
        showHostPanelBtn.classList.toggle('active', isActive);
        renderIfIdle(isPlaybackRunning, renderCurrentState);
        notifyStateChange();
    });

    phylogeographyCheckbox?.addEventListener('change', event => {
        state.setFlag('showPhylogeography', event.target.checked);
        if (phylogeographyControls) phylogeographyControls.style.display = state.showPhylogeography ? 'flex' : 'none';
        renderIfIdle(isPlaybackRunning, renderCurrentState);
        notifyStateChange();
    });

    diffusionSlider?.addEventListener('input', event => {
        state.setNumber('diffusionRate', event.target.value);
        if (diffusionValue) diffusionValue.textContent = state.diffusionRate.toFixed(2);
        notifyStateChange();
    });

    transmissionSlider?.addEventListener('input', event => {
        state.setNumber('transmissionRate', event.target.value);
        if (transmissionValue) transmissionValue.textContent = state.transmissionRate.toFixed(2);
        notifyStateChange();
    });

    trackAllBranchesCheckbox?.addEventListener('change', event => {
        state.setFlag('trackAllBranches', event.target.checked);
        if (!isPlaybackRunning() && state.showPhylogeography) renderCurrentState();
        notifyStateChange();
    });

    stickyPathsCheckbox?.addEventListener('change', event => {
        state.setFlag('stickyPaths', event.target.checked);
        animationController.setStickyPaths(state.stickyPaths);
        notifyStateChange();
    });

    drawLocationsCheckbox?.addEventListener('change', event => {
        state.setFlag('drawLocations', event.target.checked);
        if (!isPlaybackRunning() && state.showPhylogeography) renderCurrentState();
        notifyStateChange();
    });

    choroplethCheckbox?.addEventListener('change', event => {
        state.setFlag('showChoroplethMap', event.target.checked);
        geoMap.invalidateCaches();
        geoMap.prebuildPanelCaches();
        renderCurrentState();
        notifyStateChange();
    });

    hostTransmissionCheckbox?.addEventListener('change', event => {
        state.setFlag('showHostTransmission', event.target.checked);
        if (hostTransmissionControls) hostTransmissionControls.style.display = state.showHostTransmission ? 'flex' : 'none';
        renderIfIdle(isPlaybackRunning, renderCurrentState);
        notifyStateChange();
    });

    trackAllHostBranchesCheckbox?.addEventListener('change', event => {
        state.setFlag('trackAllHostBranches', event.target.checked);
        renderIfIdle(isPlaybackRunning, renderCurrentState);
        notifyStateChange();
    });

    numTipsSelect?.addEventListener('change', () => {
        resetPlaybackState();
        const numTips = getNumTips();
        syncTipCountUi(numTips);
        setTree(createTreeLayout(numTips));
        animationController.initAnimation();
        renderIfIdle(isPlaybackRunning, renderCurrentState);
        notifyStateChange();
    });
}
