import {
    buildSubstitutionModelCatalog,
    createDefaultCustomSubstitutionModelDraft,
    parseCustomSubstitutionModelImport,
    createSubstitutionModelRuntime,
    describeSubstitutionModel,
    findSubstitutionModelSpec,
    readCustomSubstitutionModelSpecs,
    removeCustomSubstitutionModelSpec,
    serializeCustomSubstitutionModelExport,
    upsertCustomSubstitutionModelSpec,
    validateCustomSubstitutionModelDraft,
} from './customSubstitutionModels.js';
import {
    populateSubstitutionModelSelect,
    renderCustomSubstitutionEditor,
    renderCustomSubstitutionEditorFeedback,
} from './customSubstitutionEditor.js';

function createEditorRefs(dom) {
    return {
        stateCountSelect: dom.customModelStateCount,
        modelModeSelect: dom.customModelMode,
        nameInput: dom.customModelName,
        baseRateInput: dom.customModelBaseRate,
        baseRateLabel: dom.customModelBaseRateLabel,
        editorLead: dom.customModelEditorLead,
        editorSummary: dom.customModelEditorSummary,
        matrixLabel: dom.customModelMatrixLabel,
        matrixNote: dom.customModelMatrixNote,
        statesGrid: dom.customModelStatesGrid,
        matrixGrid: dom.customModelMatrixGrid,
        saveButton: dom.saveCustomModelBtn,
    };
}

function cloneModelDraft(spec) {
    return {
        ...spec,
        states: (spec?.states || []).map(state => ({ ...state })),
        transitionWeights: (spec?.transitionWeights || []).map(row => [...row]),
    };
}

function createExportFilename(name) {
    const safeSlug = String(name || 'custom-model')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'custom-model';
    return `${safeSlug}.json`;
}

function formatSelectedModelSummary(selectedSpec, describeModelImpl, runtimeSpec) {
    if (!selectedSpec || !runtimeSpec) return 'No custom substitution model selected.';
    const prefix = selectedSpec.builtIn ? 'Built-in template' : 'Saved custom model';
    return `${prefix} • ${selectedSpec.name} • ${describeModelImpl(runtimeSpec)}`;
}

function setEditorVisibility(editor, isOpen) {
    if (!editor) return;
    editor.hidden = !isOpen;
    editor.setAttribute('aria-hidden', isOpen ? 'false' : 'true');

    const doc = editor.ownerDocument || globalThis.document;
    if (!doc?.body?.classList) return;

    if (isOpen) {
        doc.body.classList.add('has-open-modal');
        return;
    }

    if (!doc.querySelector?.('.help-modal.active')) {
        doc.body.classList.remove('has-open-modal');
    }
}

export function createCustomModelController({
    dom,
    storage,
    appState,
    sampleCategorical,
    sampleExp,
    resetPlaybackState,
    initAnimation,
    renderCurrentState,
    dependencies = {},
}) {
    const {
        buildCatalogImpl = buildSubstitutionModelCatalog,
        createDraftImpl = createDefaultCustomSubstitutionModelDraft,
        createRuntimeImpl = createSubstitutionModelRuntime,
        describeModelImpl = describeSubstitutionModel,
        findSpecImpl = findSubstitutionModelSpec,
        readSpecsImpl = readCustomSubstitutionModelSpecs,
        removeSpecImpl = removeCustomSubstitutionModelSpec,
        parseImportImpl = parseCustomSubstitutionModelImport,
        serializeExportImpl = serializeCustomSubstitutionModelExport,
        upsertSpecImpl = upsertCustomSubstitutionModelSpec,
        validateDraftImpl = validateCustomSubstitutionModelDraft,
        populateSelectImpl = populateSubstitutionModelSelect,
        renderEditorImpl = renderCustomSubstitutionEditor,
        renderEditorFeedbackImpl = renderCustomSubstitutionEditorFeedback,
    } = dependencies;

    const editorRefs = createEditorRefs(dom);

    let savedCustomModelSpecs = readSpecsImpl(storage);
    let substitutionModelCatalog = buildCatalogImpl(savedCustomModelSpecs);
    let selectedCustomModelId = substitutionModelCatalog[0]?.id || null;
    let customModelDraft = createDraftImpl();
    let customModelDraftValidation = validateDraftImpl(customModelDraft);
    let customModelRuntime = null;

    function setStatus(message, tone = 'normal') {
        if (!dom.customModelEditorStatus) return;
        dom.customModelEditorStatus.textContent = message || '';
        dom.customModelEditorStatus.style.color = tone === 'error' ? '#f87171' : '#8b949e';
    }

    function setTransferStatus(message, tone = 'normal') {
        if (!dom.customModelTransferStatus) return;
        dom.customModelTransferStatus.textContent = message || '';
        dom.customModelTransferStatus.style.color = tone === 'error' ? '#f87171' : '#8b949e';
    }

    function createRuntimeForSelection() {
        if (!selectedCustomModelId) return null;
        const selectedSpec = findSpecImpl(substitutionModelCatalog, selectedCustomModelId);
        if (!selectedSpec) return null;
        return createRuntimeImpl({
            spec: selectedSpec,
            sampleCategorical,
            sampleExp,
        });
    }

    function rerenderIfVisible() {
        if (!appState?.showCustomCtmc) return;
        resetPlaybackState?.();
        initAnimation?.();
    }

    function renderEditor() {
        customModelDraftValidation = validateDraftImpl(customModelDraft);
        customModelDraft = customModelDraftValidation.draft;
        renderEditorImpl({
            draft: customModelDraft,
            validation: customModelDraftValidation,
            selectedSpec: findSpecImpl(substitutionModelCatalog, selectedCustomModelId),
            refs: editorRefs,
        });
    }

    function refreshEditorFeedback() {
        customModelDraftValidation = validateDraftImpl(customModelDraft);
        customModelDraft = customModelDraftValidation.draft;
        renderEditorFeedbackImpl({
            draft: customModelDraft,
            validation: customModelDraftValidation,
            selectedSpec: findSpecImpl(substitutionModelCatalog, selectedCustomModelId),
            refs: editorRefs,
        });
    }

    function refreshSummary() {
        const selectedSpec = findSpecImpl(substitutionModelCatalog, selectedCustomModelId);
        if (dom.customModelSummary) {
            dom.customModelSummary.textContent = customModelRuntime
                ? formatSelectedModelSummary(selectedSpec, describeModelImpl, customModelRuntime.spec)
                : 'No custom substitution model selected.';
        }
        if (dom.customCtmcRateSlider) dom.customCtmcRateSlider.value = String(appState.customCtmcRate);
        if (dom.customCtmcRateValue) dom.customCtmcRateValue.textContent = appState.customCtmcRate.toFixed(2);
        if (dom.editCustomModelBtn) {
            dom.editCustomModelBtn.textContent = selectedSpec?.builtIn ? 'Customize copy...' : 'Edit model...';
        }
        if (dom.deleteCustomModelBtn) {
            dom.deleteCustomModelBtn.disabled = !selectedSpec || selectedSpec.builtIn;
        }
    }

    function rebuildCatalog(preferredId = selectedCustomModelId) {
        savedCustomModelSpecs = readSpecsImpl(storage);
        substitutionModelCatalog = buildCatalogImpl(savedCustomModelSpecs);
        const selectedSpec = findSpecImpl(substitutionModelCatalog, preferredId);
        selectedCustomModelId = selectedSpec?.id || substitutionModelCatalog[0]?.id || null;
        populateSelectImpl(dom.customModelSelect, substitutionModelCatalog, selectedCustomModelId);
        customModelRuntime = createRuntimeForSelection();
        refreshSummary();
    }

    function selectModel(modelId, { resetAnimation = true } = {}) {
        rebuildCatalog(modelId);
        if (resetAnimation) rerenderIfVisible();
        renderCurrentState?.();
    }

    const controller = {
        initialize() {
            rebuildCatalog(selectedCustomModelId);
            renderEditor();
        },
        getCatalog: () => substitutionModelCatalog,
        getSelectedModelId: () => selectedCustomModelId,
        getRuntime: () => customModelRuntime,
        getDraft: () => customModelDraft,
        getDraftValidation: () => customModelDraftValidation,
        setDraft(nextDraft) {
            customModelDraft = nextDraft;
            renderEditor();
        },
        rebuildCatalog,
        selectModel,
        openEditor({ fromSelection = false } = {}) {
            if (fromSelection && selectedCustomModelId) {
                const selectedSpec = findSpecImpl(substitutionModelCatalog, selectedCustomModelId);
                if (selectedSpec) {
                    customModelDraft = cloneModelDraft(selectedSpec);
                    if (selectedSpec.builtIn) customModelDraft.id = null;
                }
            }
            renderEditor();
            setStatus('');
            setEditorVisibility(dom.customModelEditor, true);
        },
        closeEditor() {
            setEditorVisibility(dom.customModelEditor, false);
            setStatus('');
        },
        saveDraft() {
            customModelDraftValidation = validateDraftImpl(customModelDraft);
            if (!customModelDraftValidation.isValid) {
                throw new Error(customModelDraftValidation.errors[0] || 'Please fix the highlighted issues before saving.');
            }
            const savedSpec = upsertSpecImpl(storage, customModelDraft);
            customModelDraft = cloneModelDraft(savedSpec);
            rebuildCatalog(savedSpec.id);
            renderEditor();
            setStatus(`Saved ${savedSpec.name}.`);
            rerenderIfVisible();
            renderCurrentState?.();
            return savedSpec;
        },
        deleteSelected() {
            removeSpecImpl(storage, selectedCustomModelId);
            customModelDraft = createDraftImpl();
            rebuildCatalog();
            renderEditor();
            rerenderIfVisible();
            renderCurrentState?.();
        },
        exportSelectedModel() {
            const selectedSpec = findSpecImpl(substitutionModelCatalog, selectedCustomModelId);
            if (!selectedSpec) {
                throw new Error('Select a substitution model before exporting.');
            }
            return {
                spec: selectedSpec,
                filename: createExportFilename(selectedSpec.name),
                text: serializeExportImpl(selectedSpec),
            };
        },
        importModelsFromText(text) {
            const importedSpecs = parseImportImpl(text);
            const savedSpecs = importedSpecs.map(spec => upsertSpecImpl(storage, spec));
            const selectedSpec = savedSpecs[savedSpecs.length - 1] || null;
            customModelDraft = selectedSpec ? cloneModelDraft(selectedSpec) : createDraftImpl();
            rebuildCatalog(selectedSpec?.id);
            renderEditor();
            rerenderIfVisible();
            renderCurrentState?.();
            return {
                importedSpecs: savedSpecs,
                selectedSpec,
            };
        },
        importModelsFromTextAndReport(text) {
            const result = controller.importModelsFromText(text);
            const importedCount = result.importedSpecs.length;
            const selectedName = result.selectedSpec?.name || 'Imported model';
            controller.setTransferStatus(
                `Imported ${importedCount} model${importedCount === 1 ? '' : 's'} and selected ${selectedName}.`
            );
            controller.refreshSummary();
            return result;
        },
        setStatus,
        setTransferStatus,
        renderEditor,
        refreshEditorFeedback,
        cloneSelectionIntoDraft() {
            const selectedSpec = findSpecImpl(substitutionModelCatalog, selectedCustomModelId);
            customModelDraft = selectedSpec ? cloneModelDraft(selectedSpec) : createDraftImpl();
            if (selectedSpec?.builtIn) customModelDraft.id = null;
            renderEditor();
        },
        resetDraft() {
            customModelDraft = createDraftImpl();
            renderEditor();
        },
        refreshSummary,
    };

    customModelRuntime = createRuntimeForSelection();

    return controller;
}
