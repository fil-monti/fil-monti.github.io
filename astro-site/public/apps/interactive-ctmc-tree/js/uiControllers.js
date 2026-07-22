import {
    BRANCH_TRACK_BUTTON_KEYS,
    HELP_MODAL_BINDINGS,
    NODE_SETTINGS_GROUP_KEYS,
} from './domElements.js';

const NODE_OFFSET_FIELDS = [
    { groupKey: 'root', prop: 'x', inputKey: 'rootOffsetX', valueKey: 'rootOffsetXVal' },
    { groupKey: 'root', prop: 'y', inputKey: 'rootOffsetY', valueKey: 'rootOffsetYVal' },
    { groupKey: 'internal', prop: 'x', inputKey: 'internalOffsetX', valueKey: 'internalOffsetXVal' },
    { groupKey: 'internal', prop: 'y', inputKey: 'internalOffsetY', valueKey: 'internalOffsetYVal' },
    { groupKey: 'tip1', prop: 'x', inputKey: 'tip1OffsetX', valueKey: 'tip1OffsetXVal' },
    { groupKey: 'tip1', prop: 'y', inputKey: 'tip1OffsetY', valueKey: 'tip1OffsetYVal' },
    { groupKey: 'tip2', prop: 'x', inputKey: 'tip2OffsetX', valueKey: 'tip2OffsetXVal' },
    { groupKey: 'tip2', prop: 'y', inputKey: 'tip2OffsetY', valueKey: 'tip2OffsetYVal' },
    { groupKey: 'tip3', prop: 'x', inputKey: 'tip3OffsetX', valueKey: 'tip3OffsetXVal' },
    { groupKey: 'tip3', prop: 'y', inputKey: 'tip3OffsetY', valueKey: 'tip3OffsetYVal' },
];

const TREE_VIEW_FIELDS = [
    { prop: 'zoom', inputKey: 'treeZoom', valueKey: 'treeZoomVal', format: value => `${value.toFixed(2)}×` },
];

const PANEL_VIEW_FIELDS = [
    { panelKey: 'phylo', prop: 'x', inputKey: 'panelPhyloX', valueKey: 'panelPhyloXVal', format: String },
    { panelKey: 'phylo', prop: 'y', inputKey: 'panelPhyloY', valueKey: 'panelPhyloYVal', format: String },
    { panelKey: 'phylo', prop: 'z', inputKey: 'panelPhyloZ', valueKey: 'panelPhyloZVal', format: value => `${value.toFixed(2)}×` },
    { panelKey: 'geo', prop: 'x', inputKey: 'panelGeoX', valueKey: 'panelGeoXVal', format: String },
    { panelKey: 'geo', prop: 'y', inputKey: 'panelGeoY', valueKey: 'panelGeoYVal', format: String },
    { panelKey: 'geo', prop: 'z', inputKey: 'panelGeoZ', valueKey: 'panelGeoZVal', format: value => `${value.toFixed(2)}×` },
    { panelKey: 'host', prop: 'x', inputKey: 'panelHostX', valueKey: 'panelHostXVal', format: String },
    { panelKey: 'host', prop: 'y', inputKey: 'panelHostY', valueKey: 'panelHostYVal', format: String },
    { panelKey: 'host', prop: 'z', inputKey: 'panelHostZ', valueKey: 'panelHostZVal', format: value => `${value.toFixed(2)}×` },
];

function parseIntValue(input, fallback = 0) {
    const nextValue = Number.parseInt(input?.value ?? '', 10);
    return Number.isFinite(nextValue) ? nextValue : fallback;
}

function parseFloatValue(input, fallback = 0) {
    const nextValue = Number.parseFloat(input?.value ?? '');
    return Number.isFinite(nextValue) ? nextValue : fallback;
}

function setInputValue(input, value) {
    if (input) input.value = String(value);
}

function setTextValue(node, text) {
    if (node) node.textContent = text;
}

export function createSettingsController({
    dom,
    nodeOffsets,
    treeView,
    panelView,
    defaultNodeOffsets,
    defaultTreeView,
    defaultPanelView,
    onRebuildTree,
    onStateChange = null,
    doc = document,
}) {
    let offsetRaf = null;

    function syncModalBodyState() {
        const hasActiveSettings = Boolean(dom.settingsPanel && !dom.settingsPanel.hidden);
        const hasActiveHelp = Boolean(doc.querySelector?.('.help-modal.active'));
        const hasActiveCustomEditor = Boolean(doc.querySelector?.('.custom-model-editor-modal:not([hidden])'));
        doc.body?.classList.toggle('has-open-modal', hasActiveSettings || hasActiveHelp || hasActiveCustomEditor);
    }

    function setSettingsVisibility(visible) {
        const panel = dom.settingsPanel;
        if (!panel) return;
        panel.hidden = !visible;
        panel.setAttribute('aria-hidden', visible ? 'false' : 'true');
        panel.classList.toggle('active', visible);
        dom.settingsBtn?.setAttribute('aria-expanded', visible ? 'true' : 'false');
        syncModalBodyState();
    }

    function toggleSettings(open) {
        const panel = dom.settingsPanel;
        if (!panel) return;
        const shouldOpen = open === undefined ? panel.hidden : open;
        setSettingsVisibility(shouldOpen);
    }

    function setNodeSettingsGroupVisibility(visible) {
        NODE_SETTINGS_GROUP_KEYS.forEach(key => {
            const group = dom[key];
            if (group) group.style.display = visible ? 'block' : 'none';
        });
    }

    function applyOffsets() {
        NODE_OFFSET_FIELDS.forEach(({ groupKey, prop, inputKey, valueKey }) => {
            const value = parseIntValue(dom[inputKey], nodeOffsets[groupKey][prop]);
            nodeOffsets[groupKey][prop] = value;
            setTextValue(dom[valueKey], String(value));
        });

        TREE_VIEW_FIELDS.forEach(({ prop, inputKey, valueKey, format }) => {
            const value = parseFloatValue(dom[inputKey], treeView[prop]);
            treeView[prop] = value;
            setTextValue(dom[valueKey], format(value));
        });

        PANEL_VIEW_FIELDS.forEach(({ panelKey, prop, inputKey, valueKey, format }) => {
            const parser = prop === 'z' ? parseFloatValue : parseIntValue;
            const value = parser(dom[inputKey], panelView[panelKey][prop]);
            panelView[panelKey][prop] = value;
            setTextValue(dom[valueKey], format(value));
        });

        onRebuildTree?.();
        onStateChange?.();
    }

    function scheduleApplyOffsets() {
        if (offsetRaf) cancelAnimationFrame(offsetRaf);
        offsetRaf = requestAnimationFrame(() => {
            offsetRaf = null;
            applyOffsets();
        });
    }

    function resetOffsets() {
        NODE_OFFSET_FIELDS.forEach(({ groupKey, prop, inputKey }) => {
            setInputValue(dom[inputKey], defaultNodeOffsets[groupKey][prop]);
        });

        TREE_VIEW_FIELDS.forEach(({ prop, inputKey }) => {
            setInputValue(dom[inputKey], defaultTreeView[prop]);
        });

        PANEL_VIEW_FIELDS.forEach(({ panelKey, prop, inputKey }) => {
            setInputValue(dom[inputKey], defaultPanelView[panelKey][prop]);
        });

        scheduleApplyOffsets();
    }

    const offsetInputs = [
        ...NODE_OFFSET_FIELDS.map(({ inputKey }) => dom[inputKey]),
        ...TREE_VIEW_FIELDS.map(({ inputKey }) => dom[inputKey]),
        ...PANEL_VIEW_FIELDS.map(({ inputKey }) => dom[inputKey]),
    ].filter(Boolean);

    dom.settingsBtn?.setAttribute('aria-expanded', 'false');
    dom.settingsBtn?.addEventListener('click', () => toggleSettings());
    dom.closeSettingsBtn?.addEventListener('click', () => toggleSettings(false));
    dom.settingsPanel?.addEventListener('click', event => {
        if (event.target === dom.settingsPanel) {
            toggleSettings(false);
        }
    });
    offsetInputs.forEach(input => input.addEventListener('input', scheduleApplyOffsets));
    dom.resetOffsetsBtn?.addEventListener('click', resetOffsets);
    doc.addEventListener('keydown', event => {
        if (event.key === 'Escape' && dom.settingsPanel && !dom.settingsPanel.hidden) {
            toggleSettings(false);
        }
    });

    return {
        resetOffsets,
        scheduleApplyOffsets,
        setNodeSettingsGroupVisibility,
        toggleSettings,
    };
}

export function createBranchTrackController({ dom, initialMode = 'none', onModeChange }) {
    function updateButtons(mode) {
        Object.entries(BRANCH_TRACK_BUTTON_KEYS).forEach(([buttonMode, key]) => {
            const button = dom[key];
            if (!button) return;
            button.classList.toggle('active', buttonMode === mode);
            button.setAttribute('aria-pressed', buttonMode === mode ? 'true' : 'false');
        });
    }

    function setMode(mode) {
        updateButtons(mode);
        onModeChange?.(mode);
    }

    Object.entries(BRANCH_TRACK_BUTTON_KEYS).forEach(([mode, key]) => {
        dom[key]?.addEventListener('click', () => setMode(mode));
    });

    updateButtons(initialMode);

    return { setMode };
}

export function bindHelpModals({ dom, doc = document }) {
    const activeModalSelector = '.help-modal.active';

    function closeModal(modal) {
        if (!modal) return;
        modal.classList.remove('active');
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
        if (!doc.querySelector(activeModalSelector)) {
            doc.body.classList.remove('has-open-modal');
        }
    }

    function openModal(modal) {
        if (!modal) return;
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
        modal.classList.add('active');
        doc.body.classList.add('has-open-modal');
    }

    HELP_MODAL_BINDINGS.forEach(({ buttonKey, modalKey, closeKey }) => {
        const button = dom[buttonKey];
        const modal = dom[modalKey];
        const closeButton = dom[closeKey];
        if (!button || !modal || !closeButton) return;

        button.addEventListener('click', event => {
            event.stopPropagation();
            openModal(modal);
        });
        closeButton.addEventListener('click', () => closeModal(modal));
        modal.addEventListener('click', event => {
            if (event.target === modal) closeModal(modal);
        });
    });

    doc.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        doc.querySelectorAll(activeModalSelector).forEach(closeModal);
    });
}

export function installErrorOverlay(doc = document, win = window) {
    const box = doc.createElement('div');
    box.style.cssText = 'position:fixed;left:16px;bottom:16px;max-width:520px;padding:10px 12px;border:1px solid #e0b4b4;border-radius:10px;background:#fff5f5;color:#8a1f1f;font:12px/1.35 JetBrains Mono,monospace;z-index:99999;display:none;white-space:pre-wrap;';
    doc.body.appendChild(box);
    win.addEventListener('error', event => {
        box.style.display = 'block';
        box.textContent = 'JS error: ' + (event.message || event.error || 'unknown') + (event.filename ? `\n${event.filename}:${event.lineno}:${event.colno}` : '');
    });
    win.addEventListener('unhandledrejection', event => {
        box.style.display = 'block';
        box.textContent = 'Promise rejection: ' + (event.reason ? String(event.reason) : 'unknown');
    });
}
