export function renderIfIdle(isPlaybackRunning, renderCurrentState) {
    if (!isPlaybackRunning()) renderCurrentState();
}

export function downloadTextFile(filename, text, mimeType = 'application/json') {
    const blob = new Blob([text], { type: mimeType });
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
    }, 0);
}

export function syncPrimaryControlsFromState(dom, state) {
    const {
        speedSlider,
        speedValue,
        mutationSlider,
        mutationValue,
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
        observationsCheckbox,
        timeTravelCheckbox,
        maxMutationRate,
        maxMutationRateVal,
        maxDiffusionRate,
        maxDiffusionRateVal,
        maxTransmissionRate,
        maxTransmissionRateVal,
    } = dom;

    if (speedSlider) speedSlider.value = String(state.speed);
    if (speedValue) speedValue.textContent = `${state.speed}x`;
    if (mutationSlider) mutationSlider.value = String(state.mutationRate);
    if (mutationValue) mutationValue.textContent = state.mutationRate.toFixed(2);
    if (diffusionSlider) diffusionSlider.value = String(state.diffusionRate);
    if (diffusionValue) diffusionValue.textContent = state.diffusionRate.toFixed(2);
    if (transmissionSlider) transmissionSlider.value = String(state.transmissionRate);
    if (transmissionValue) transmissionValue.textContent = state.transmissionRate.toFixed(2);

    if (maxMutationRate) maxMutationRate.value = String(state.maxMutationRateValue);
    if (maxMutationRateVal) maxMutationRateVal.textContent = String(state.maxMutationRateValue);
    if (maxDiffusionRate) maxDiffusionRate.value = String(state.maxDiffusionRateValue);
    if (maxDiffusionRateVal) maxDiffusionRateVal.textContent = String(state.maxDiffusionRateValue);
    if (maxTransmissionRate) maxTransmissionRate.value = String(state.maxTransmissionRateValue);
    if (maxTransmissionRateVal) maxTransmissionRateVal.textContent = String(state.maxTransmissionRateValue);
    if (mutationSlider) mutationSlider.max = String(state.maxMutationRateValue);
    if (diffusionSlider) diffusionSlider.max = String(state.maxDiffusionRateValue);
    if (transmissionSlider) transmissionSlider.max = String(state.maxTransmissionRateValue);

    if (highlightCheckbox) highlightCheckbox.checked = state.highlightTrackedNucleotide;
    if (phylogeneticsCheckbox) phylogeneticsCheckbox.checked = state.showPhylogenetics;
    if (phylogeneticsControls) phylogeneticsControls.style.display = state.showPhylogenetics ? 'flex' : 'none';
    if (phylogeographyCheckbox) phylogeographyCheckbox.checked = state.showPhylogeography;
    if (phylogeographyControls) phylogeographyControls.style.display = state.showPhylogeography ? 'flex' : 'none';
    if (hostTransmissionCheckbox) hostTransmissionCheckbox.checked = state.showHostTransmission;
    if (hostTransmissionControls) hostTransmissionControls.style.display = state.showHostTransmission ? 'flex' : 'none';

    if (trackAllBranchesCheckbox) trackAllBranchesCheckbox.checked = state.trackAllBranches;
    if (stickyPathsCheckbox) stickyPathsCheckbox.checked = state.stickyPaths;
    if (drawLocationsCheckbox) drawLocationsCheckbox.checked = state.drawLocations;
    if (choroplethCheckbox) choroplethCheckbox.checked = state.showChoroplethMap;
    if (trackAllHostBranchesCheckbox) trackAllHostBranchesCheckbox.checked = state.trackAllHostBranches;
    if (observationsCheckbox) observationsCheckbox.checked = state.observationsMode;
    if (timeTravelCheckbox) timeTravelCheckbox.checked = state.timeTravelMode;
}

export function syncPanelToggleButtons(dom, state) {
    dom.showPhyloPanelBtn?.classList.toggle('active', state.showPhyloPanel);
    dom.showGeoPanelBtn?.classList.toggle('active', state.showGeoPanel);
    dom.showHostPanelBtn?.classList.toggle('active', state.showHostPanel);
    dom.showCustomCtmcPanelBtn?.classList.toggle('active', state.showCustomCtmcPanel);
}
