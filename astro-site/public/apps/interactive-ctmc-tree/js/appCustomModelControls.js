import { resizeCustomSubstitutionModelDraft } from './customSubstitutionModels.js';
import {
    downloadTextFile,
    renderIfIdle,
} from './appControlsShared.js';

export function bindCustomModelControls({
    dom,
    state,
    animationController,
    renderCurrentState,
    isPlaybackRunning,
    resetPlaybackState,
    notifyStateChange,
    customModelController,
} = {}) {
    if (!customModelController) return;

    const {
        addCustomCtmcPanelBtn,
        customCtmcSectionWrap,
        removeCustomCtmcPanelBtn,
        customCtmcCheckbox,
        customCtmcControls,
        showCustomCtmcPanelBtn,
        customModelSelect,
        importCustomModelBtn,
        exportCustomModelBtn,
        customModelImportInput,
        editCustomModelBtn,
        deleteCustomModelBtn,
        customCtmcRateSlider,
        customCtmcRateValue,
        trackAllCustomBranchesCheckbox,
        customModelEditor,
        customModelName,
        customModelStateCount,
        customModelMode,
        customModelBaseRate,
        customModelStatesGrid,
        customModelMatrixGrid,
        resetCustomModelDraftBtn,
        saveCustomModelBtn,
        closeCustomModelEditorBtn,
    } = dom;

    const rerenderCustomProcess = () => {
        resetPlaybackState();
        animationController.initAnimation();
        renderIfIdle(isPlaybackRunning, renderCurrentState);
    };

    const refreshCustomDraftFeedback = ({ rerenderEditor = false } = {}) => {
        customModelController.setStatus('');
        if (rerenderEditor) {
            customModelController.renderEditor();
            return;
        }
        customModelController.refreshEditorFeedback?.();
    };

    const openCustomPanelSection = () => {
        if (customCtmcSectionWrap) customCtmcSectionWrap.hidden = false;
        if (addCustomCtmcPanelBtn) addCustomCtmcPanelBtn.hidden = true;
    };

    const closeCustomPanelSection = () => {
        if (customCtmcSectionWrap) customCtmcSectionWrap.hidden = true;
        if (addCustomCtmcPanelBtn) addCustomCtmcPanelBtn.hidden = false;
        customModelController.closeEditor();
    };

    addCustomCtmcPanelBtn?.addEventListener('click', () => {
        state.setFlag('showCustomCtmc', true);
        openCustomPanelSection();
        if (customCtmcCheckbox) customCtmcCheckbox.checked = true;
        if (customCtmcControls) customCtmcControls.style.display = 'flex';
        rerenderCustomProcess();
    });

    removeCustomCtmcPanelBtn?.addEventListener('click', () => {
        state.setFlag('showCustomCtmc', false);
        closeCustomPanelSection();
        rerenderCustomProcess();
    });

    customCtmcCheckbox?.addEventListener('change', event => {
        state.setFlag('showCustomCtmc', event.target.checked);
        if (customCtmcControls) customCtmcControls.style.display = state.showCustomCtmc ? 'flex' : 'none';
        if (state.showCustomCtmc) openCustomPanelSection();
        else closeCustomPanelSection();
        rerenderCustomProcess();
        notifyStateChange();
    });

    showCustomCtmcPanelBtn?.addEventListener('click', () => {
        const isActive = state.togglePanel('showCustomCtmcPanel');
        showCustomCtmcPanelBtn.classList.toggle('active', isActive);
        renderIfIdle(isPlaybackRunning, renderCurrentState);
        notifyStateChange();
    });

    customModelSelect?.addEventListener('change', event => {
        customModelController.selectModel(event.target.value);
        customModelController.refreshSummary();
        notifyStateChange();
    });

    editCustomModelBtn?.addEventListener('click', () => {
        customModelController.openEditor({ fromSelection: true });
    });

    deleteCustomModelBtn?.addEventListener('click', () => {
        customModelController.deleteSelected();
        customModelController.refreshSummary();
        notifyStateChange();
    });

    exportCustomModelBtn?.addEventListener('click', () => {
        try {
            const { filename, text, spec } = customModelController.exportSelectedModel();
            downloadTextFile(filename, text, 'application/json');
            customModelController.setTransferStatus(`Exported ${spec.name} as ${filename}.`);
        } catch (error) {
            customModelController.setTransferStatus(String(error?.message || error), 'error');
        }
    });

    importCustomModelBtn?.addEventListener('click', () => {
        customModelImportInput?.click();
    });

    customModelImportInput?.addEventListener('change', async event => {
        const file = event.target?.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            customModelController.importModelsFromTextAndReport(text);
            notifyStateChange();
        } catch (error) {
            customModelController.setTransferStatus(String(error?.message || error), 'error');
        } finally {
            event.target.value = '';
        }
    });

    customCtmcRateSlider?.addEventListener('input', event => {
        state.setNumber('customCtmcRate', event.target.value);
        if (customCtmcRateValue) customCtmcRateValue.textContent = state.customCtmcRate.toFixed(2);
        notifyStateChange();
    });

    trackAllCustomBranchesCheckbox?.addEventListener('change', event => {
        state.setFlag('trackAllCustomBranches', event.target.checked);
        renderIfIdle(isPlaybackRunning, renderCurrentState);
        notifyStateChange();
    });

    customModelName?.addEventListener('input', event => {
        const draft = customModelController.getDraft();
        draft.name = event.target.value;
        refreshCustomDraftFeedback();
    });

    customModelStateCount?.addEventListener('change', event => {
        const nextDraft = resizeCustomSubstitutionModelDraft(customModelController.getDraft(), event.target.value);
        customModelController.setDraft(nextDraft);
        customModelController.setStatus('');
    });

    customModelMode?.addEventListener('change', event => {
        const draft = customModelController.getDraft();
        draft.modelMode = event.target.value;
        refreshCustomDraftFeedback({ rerenderEditor: true });
    });

    customModelBaseRate?.addEventListener('input', event => {
        const draft = customModelController.getDraft();
        draft.baseRate = event.target.value;
        refreshCustomDraftFeedback();
    });

    customModelStatesGrid?.addEventListener('input', event => {
        const target = event.target;
        const stateIndex = Number(target?.dataset?.stateIndex);
        if (!Number.isFinite(stateIndex)) return;
        const draft = customModelController.getDraft();
        if (!draft.states[stateIndex]) return;

        if (target.dataset.field === 'label') {
            draft.states[stateIndex].label = target.value;
            refreshCustomDraftFeedback({ rerenderEditor: true });
            return;
        }

        if (target.dataset.field === 'color') {
            draft.states[stateIndex].color = target.value;
            refreshCustomDraftFeedback();
        }
    });

    customModelMatrixGrid?.addEventListener('input', event => {
        const target = event.target;
        const rowIndex = Number(target?.dataset?.rowIndex);
        const columnIndex = Number(target?.dataset?.columnIndex);
        if (!Number.isFinite(rowIndex) || !Number.isFinite(columnIndex) || rowIndex === columnIndex) return;
        const draft = customModelController.getDraft();
        if (!draft.transitionWeights[rowIndex]) return;
        draft.transitionWeights[rowIndex][columnIndex] = target.value;
        refreshCustomDraftFeedback();
    });

    resetCustomModelDraftBtn?.addEventListener('click', () => {
        customModelController.resetDraft();
        customModelController.setStatus('Draft reset to the default template.');
    });

    saveCustomModelBtn?.addEventListener('click', () => {
        try {
            const savedSpec = customModelController.saveDraft();
            customModelController.setStatus(`Saved ${savedSpec.name}.`);
            customModelController.refreshSummary();
            notifyStateChange();
        } catch (error) {
            customModelController.setStatus(String(error?.message || error), 'error');
        }
    });

    closeCustomModelEditorBtn?.addEventListener('click', () => {
        customModelController.closeEditor();
    });

    customModelEditor?.querySelector?.('[data-close-custom-model-editor]')?.addEventListener('click', () => {
        customModelController.closeEditor();
    });

    customModelEditor?.addEventListener('click', event => {
        if (event.target === customModelEditor) {
            customModelController.closeEditor();
        }
    });

    globalThis.document?.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !customModelEditor?.hidden) {
            customModelController.closeEditor();
        }
    });

    customModelController.refreshSummary();
    if (customCtmcRateValue) customCtmcRateValue.textContent = state.customCtmcRate.toFixed(2);
    if (trackAllCustomBranchesCheckbox) trackAllCustomBranchesCheckbox.checked = state.trackAllCustomBranches;
    if (customCtmcCheckbox) customCtmcCheckbox.checked = state.showCustomCtmc;
    if (customCtmcControls) customCtmcControls.style.display = state.showCustomCtmc ? 'flex' : 'none';
    if (showCustomCtmcPanelBtn) showCustomCtmcPanelBtn.classList.toggle('active', state.showCustomCtmcPanel);
    if (state.showCustomCtmc) openCustomPanelSection();
    else closeCustomPanelSection();
}
