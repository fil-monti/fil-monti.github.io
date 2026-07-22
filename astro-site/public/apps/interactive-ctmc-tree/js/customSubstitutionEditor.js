export function populateSubstitutionModelSelect(select, catalog, selectedId) {
    if (!select) return;
    select.textContent = '';

    const builtIns = (catalog || []).filter(spec => spec.builtIn);
    const customs = (catalog || []).filter(spec => !spec.builtIn);

    function appendGroup(label, items) {
        if (!items.length) return;
        const group = document.createElement('optgroup');
        group.label = label;
        items.forEach(spec => {
            const option = document.createElement('option');
            option.value = spec.id;
            option.textContent = spec.name;
            option.selected = spec.id === selectedId;
            group.appendChild(option);
        });
        select.appendChild(group);
    }

    appendGroup('Built-in models', builtIns);
    appendGroup('Saved custom models', customs);
}

function toggleClass(node, className, shouldAdd) {
    if (!node?.classList) return;
    node.classList.toggle(className, Boolean(shouldAdd));
}

function createLabeledList(title, items, tone) {
    if (!items?.length) return null;
    const wrap = document.createElement('div');
    const heading = document.createElement('div');
    heading.className = 'custom-model-editor-summary-title';
    heading.textContent = title;
    wrap.appendChild(heading);

    const list = document.createElement('ul');
    list.className = `custom-model-editor-list ${tone === 'error' ? 'is-error' : 'is-warning'}`;
    items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
    });
    wrap.appendChild(list);
    return wrap;
}

function getEditorLeadText(selectedSpec, draft) {
    if (selectedSpec?.builtIn && !draft.id) {
        return `You are starting from the built-in "${selectedSpec.name}" template. Saving will create a separate custom model.`;
    }
    if (draft.id && !selectedSpec?.builtIn) {
        return `You are editing the saved model "${draft.name}". Changes are validated live before they replace the saved version.`;
    }
    return 'Define states, colors, and substitution dynamics for a saved model.';
}

function getSaveButtonLabel(selectedSpec, draft) {
    if (selectedSpec?.builtIn && !draft.id) return 'Save as new model';
    if (draft.id && !selectedSpec?.builtIn) return 'Update saved model';
    return 'Save & load model';
}

export function renderCustomSubstitutionEditorFeedback({
    draft,
    validation,
    selectedSpec,
    refs,
}) {
    const {
        nameInput,
        baseRateInput,
        editorLead,
        editorSummary,
        saveButton,
        statesGrid,
        matrixGrid,
    } = refs;

    const errors = validation?.errors || [];
    const warnings = validation?.warnings || [];
    const hasWarningsOnly = !errors.length && warnings.length;
    const toneClass = errors.length ? 'is-invalid' : hasWarningsOnly ? 'is-warning' : 'is-valid';

    if (editorLead) {
        editorLead.textContent = getEditorLeadText(selectedSpec, draft);
    }

    if (editorSummary) {
        editorSummary.className = `custom-model-editor-summary ${toneClass}`;
        editorSummary.textContent = '';

        const top = document.createElement('div');
        top.className = 'custom-model-editor-summary-top';

        const badge = document.createElement('div');
        badge.className = `custom-model-editor-badge ${toneClass}`;
        badge.textContent = errors.length
            ? `${errors.length} issue${errors.length === 1 ? '' : 's'} to fix`
            : warnings.length
                ? `${warnings.length} warning${warnings.length === 1 ? '' : 's'} to review`
                : 'Ready to save';
        top.appendChild(badge);

        const preview = document.createElement('div');
        preview.className = 'custom-model-editor-preview';
        preview.textContent = `Preview: ${validation?.previewSummary || ''}`;
        top.appendChild(preview);

        editorSummary.appendChild(top);

        const errorList = createLabeledList('Fix before save', errors, 'error');
        if (errorList) editorSummary.appendChild(errorList);

        const warningList = createLabeledList('Heads-up', warnings, 'warning');
        if (warningList) editorSummary.appendChild(warningList);
    }

    if (saveButton) {
        saveButton.textContent = getSaveButtonLabel(selectedSpec, draft);
        saveButton.disabled = !validation?.isValid;
    }

    toggleClass(nameInput, 'custom-model-grid-field', true);
    toggleClass(nameInput, 'is-invalid', validation?.fieldStatus?.nameInvalid);
    toggleClass(baseRateInput, 'custom-model-grid-field', true);
    toggleClass(baseRateInput, 'is-invalid', validation?.fieldStatus?.baseRateInvalid);

    Array.from(statesGrid?.children || []).forEach((card, index) => {
        const stateIssue = validation?.stateDiagnostics?.[index];
        const isInvalid = Boolean(stateIssue?.missing || stateIssue?.duplicate);
        toggleClass(card, 'is-invalid', isInvalid);

        const labelInput = card.querySelector?.('input[data-field="label"]');
        toggleClass(labelInput, 'custom-model-grid-field', true);
        toggleClass(labelInput, 'is-invalid', isInvalid);
    });

    Array.from(matrixGrid?.querySelectorAll?.('tbody tr') || []).forEach((rowEl, rowIndex) => {
        const rowIssue = validation?.matrixRowDiagnostics?.[rowIndex];
        const isInvalid = Boolean(rowIssue?.invalidColumns?.length || rowIssue?.negativeColumns?.length);
        const isWarning = !isInvalid && Boolean(rowIssue?.zeroOffDiagonal);
        toggleClass(rowEl, 'is-invalid', isInvalid);
        toggleClass(rowEl, 'is-warning', isWarning);

        Array.from(rowEl.querySelectorAll('input')).forEach(input => {
            const columnIndex = Number(input.dataset.columnIndex);
            const hasInvalidValue = rowIssue?.invalidColumns?.includes(columnIndex) || rowIssue?.negativeColumns?.includes(columnIndex);
            toggleClass(input, 'custom-model-grid-field', true);
            toggleClass(input, 'is-invalid', hasInvalidValue);
            toggleClass(input, 'is-warning', !hasInvalidValue && isWarning && !input.disabled);
        });
    });
}

export function renderCustomSubstitutionEditor({
    draft,
    validation,
    selectedSpec,
    refs,
}) {
    const {
        stateCountSelect,
        modelModeSelect,
        nameInput,
        baseRateInput,
        baseRateLabel,
        editorLead,
        editorSummary,
        matrixLabel,
        matrixNote,
        statesGrid,
        matrixGrid,
        saveButton,
    } = refs;
    const isQMatrixMode = draft.modelMode === 'q-matrix';

    if (nameInput) nameInput.value = draft.name;
    if (stateCountSelect) {
        stateCountSelect.textContent = '';
        for (let count = 2; count <= 10; count += 1) {
            const option = document.createElement('option');
            option.value = String(count);
            option.textContent = String(count);
            option.selected = count === draft.stateCount;
            stateCountSelect.appendChild(option);
        }
    }
    if (modelModeSelect) modelModeSelect.value = draft.modelMode;
    if (baseRateInput) baseRateInput.value = String(draft.baseRate);
    if (baseRateLabel) {
        baseRateLabel.textContent = isQMatrixMode ? 'Global Q scale' : 'Base transition rate';
    }
    if (matrixLabel) {
        matrixLabel.textContent = isQMatrixMode
            ? 'Off-diagonal Q-matrix entries'
            : 'Off-diagonal substitution weights';
    }
    if (matrixNote) {
        matrixNote.textContent = isQMatrixMode
            ? 'Enter off-diagonal q_ij values. The diagonal is computed automatically as the negative row sum, so every Q row sums to zero.'
            : 'Diagonal cells stay zero. Each row is normalized automatically over the off-diagonal entries when the model is saved.';
    }

    if (statesGrid) {
        statesGrid.textContent = '';
        draft.states.forEach((state, index) => {
            const card = document.createElement('div');
            card.className = 'custom-model-state-card';
            card.dataset.stateIndex = String(index);

            const header = document.createElement('div');
            header.className = 'custom-model-state-card-header';
            header.textContent = `State ${index + 1}`;
            card.appendChild(header);

            const labelWrap = document.createElement('label');
            labelWrap.innerHTML = '<span>Label</span>';
            const labelInput = document.createElement('input');
            labelInput.type = 'text';
            labelInput.value = state.label;
            labelInput.dataset.stateIndex = String(index);
            labelInput.dataset.field = 'label';
            labelWrap.appendChild(labelInput);
            card.appendChild(labelWrap);

            const colorWrap = document.createElement('label');
            colorWrap.innerHTML = '<span>Color</span>';
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = state.color;
            colorInput.dataset.stateIndex = String(index);
            colorInput.dataset.field = 'color';
            colorWrap.appendChild(colorInput);
            card.appendChild(colorWrap);

            statesGrid.appendChild(card);
        });
    }

    if (matrixGrid) {
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const corner = document.createElement('th');
        corner.textContent = '';
        headerRow.appendChild(corner);
        draft.states.forEach(state => {
            const th = document.createElement('th');
            th.textContent = state.label;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        draft.transitionWeights.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');
            tr.dataset.rowIndex = String(rowIndex);
            const rowHeader = document.createElement('th');
            rowHeader.textContent = draft.states[rowIndex]?.label || `S${rowIndex + 1}`;
            tr.appendChild(rowHeader);

            row.forEach((value, columnIndex) => {
                const td = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'number';
                input.min = '0';
                input.step = '0.05';
                input.value = rowIndex === columnIndex ? '0' : String(value);
                input.disabled = rowIndex === columnIndex;
                input.dataset.rowIndex = String(rowIndex);
                input.dataset.columnIndex = String(columnIndex);
                td.appendChild(input);
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        matrixGrid.textContent = '';
        matrixGrid.appendChild(table);
    }

    renderCustomSubstitutionEditorFeedback({
        draft,
        validation,
        selectedSpec,
        refs: {
            nameInput,
            baseRateInput,
            editorLead,
            editorSummary,
            saveButton,
            statesGrid,
            matrixGrid,
        },
    });
}
