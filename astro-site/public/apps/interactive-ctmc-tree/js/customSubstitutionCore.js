import { CANVAS_CUSTOM_STATE_COLORS, CANVAS_NUCLEOTIDE_COLORS } from './canvasPalette.js';

export const CUSTOM_SUBSTITUTION_MODEL_STORAGE_KEY = 'interactiveMultiTree.frontend.customSubstitutionModels.v1';
export const CUSTOM_SUBSTITUTION_MODEL_EXPORT_FORMAT = 'interactiveMultiTree.customSubstitutionModel.v1';

const DEFAULT_STATE_LABELS = Object.freeze(['A', 'C', 'G', 'T', 'R', 'Y', 'M', 'K', 'S', 'W']);
const DEFAULT_STATE_COLORS = CANVAS_CUSTOM_STATE_COLORS;
const DEFAULT_MODEL_MODE = 'shared-rate';
export const DEFAULT_BASE_RATE = 1.8;
const SUPPORTED_MODEL_MODES = new Set(['shared-rate', 'q-matrix']);

const BUILT_IN_SUBSTITUTION_MODELS = Object.freeze([
    Object.freeze({
        id: 'builtin-jc69',
        builtIn: true,
        name: 'JC69-like DNA',
        stateCount: 4,
        states: [
            { label: 'A', color: CANVAS_NUCLEOTIDE_COLORS.A },
            { label: 'C', color: CANVAS_NUCLEOTIDE_COLORS.C },
            { label: 'G', color: CANVAS_NUCLEOTIDE_COLORS.G },
            { label: 'T', color: CANVAS_NUCLEOTIDE_COLORS.T },
        ],
        transitionWeights: [
            [0, 1, 1, 1],
            [1, 0, 1, 1],
            [1, 1, 0, 1],
            [1, 1, 1, 0],
        ],
        modelMode: 'shared-rate',
        baseRate: 1.8,
    }),
    Object.freeze({
        id: 'builtin-transition-bias',
        builtIn: true,
        name: 'Transition-biased DNA',
        stateCount: 4,
        states: [
            { label: 'A', color: CANVAS_NUCLEOTIDE_COLORS.A },
            { label: 'C', color: CANVAS_NUCLEOTIDE_COLORS.C },
            { label: 'G', color: CANVAS_NUCLEOTIDE_COLORS.G },
            { label: 'T', color: CANVAS_NUCLEOTIDE_COLORS.T },
        ],
        transitionWeights: [
            [0, 0.7, 2.6, 0.7],
            [0.7, 0, 0.7, 2.6],
            [2.6, 0.7, 0, 0.7],
            [0.7, 2.6, 0.7, 0],
        ],
        modelMode: 'shared-rate',
        baseRate: 1.95,
    }),
    Object.freeze({
        id: 'builtin-ry',
        builtIn: true,
        name: 'Purine / Pyrimidine',
        stateCount: 2,
        states: [
            { label: 'R', color: DEFAULT_STATE_COLORS[4] },
            { label: 'Y', color: DEFAULT_STATE_COLORS[5] },
        ],
        transitionWeights: [
            [0, 1.4],
            [0.6, 0],
        ],
        modelMode: 'q-matrix',
        baseRate: 1.45,
    }),
]);

function clampStateCount(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 4;
    return Math.max(2, Math.min(10, Math.round(numeric)));
}

function sanitizeLabel(value, fallback) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    return trimmed || fallback;
}

function sanitizeRate(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : DEFAULT_BASE_RATE;
}

function clampWeight(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 32);
}

function cloneStates(states = []) {
    return states.map(state => ({ ...state }));
}

function cloneMatrix(matrix = []) {
    return matrix.map(row => [...row]);
}

function buildDefaultStates(count) {
    return Array.from({ length: count }, (_, index) => ({
        label: DEFAULT_STATE_LABELS[index] || `S${index + 1}`,
        color: DEFAULT_STATE_COLORS[index] || '#64748b',
    }));
}

function buildDefaultWeights(count) {
    return Array.from({ length: count }, (_, rowIndex) => (
        Array.from({ length: count }, (_, columnIndex) => (rowIndex === columnIndex ? 0 : 1))
    ));
}

export function buildSubstitutionModelSummary(spec) {
    const modeLabel = spec.modelMode === 'q-matrix' ? 'true CTMC Q-matrix' : 'shared-rate weights';
    return `${spec.stateCount} states • ${modeLabel} • base rate ${spec.baseRate.toFixed(2)}`;
}

function createPortableCustomSubstitutionModelSpec(spec) {
    const normalized = normalizeCustomSubstitutionModelSpec(spec);
    return {
        name: normalized.name,
        stateCount: normalized.stateCount,
        states: cloneStates(normalized.states),
        transitionWeights: cloneMatrix(normalized.transitionWeights),
        modelMode: normalized.modelMode,
        baseRate: normalized.baseRate,
        sourceId: normalized.id,
        sourceBuiltIn: normalized.builtIn,
    };
}

function extractImportModels(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];

    if (Array.isArray(payload.models)) return payload.models;
    if (payload.model && typeof payload.model === 'object') return [payload.model];
    if (
        payload.stateCount != null ||
        Array.isArray(payload.states) ||
        Array.isArray(payload.transitionWeights)
    ) {
        return [payload];
    }
    return [];
}

function prepareDraft(rawDraft = {}) {
    const stateCount = clampStateCount(rawDraft.stateCount ?? rawDraft.states?.length ?? 4);
    const previousStates = Array.isArray(rawDraft.states) ? cloneStates(rawDraft.states) : [];
    const previousWeights = Array.isArray(rawDraft.transitionWeights) ? cloneMatrix(rawDraft.transitionWeights) : [];
    const defaultStates = buildDefaultStates(stateCount);

    return {
        ...createDefaultCustomSubstitutionModelDraft(),
        ...rawDraft,
        stateCount,
        states: Array.from({ length: stateCount }, (_, index) => ({
            ...defaultStates[index],
            ...(previousStates[index] || {}),
        })),
        transitionWeights: Array.from({ length: stateCount }, (_, rowIndex) => (
            Array.from({ length: stateCount }, (_, columnIndex) => {
                if (rowIndex === columnIndex) return 0;
                const preserved = previousWeights?.[rowIndex]?.[columnIndex];
                return preserved == null ? 1 : preserved;
            })
        )),
    };
}

export function getBuiltInSubstitutionModelSpecs() {
    return BUILT_IN_SUBSTITUTION_MODELS.map(spec => normalizeCustomSubstitutionModelSpec(spec));
}

export function createDefaultCustomSubstitutionModelDraft() {
    return {
        id: null,
        name: 'Custom substitution model',
        stateCount: 4,
        states: buildDefaultStates(4),
        transitionWeights: buildDefaultWeights(4),
        modelMode: DEFAULT_MODEL_MODE,
        baseRate: DEFAULT_BASE_RATE,
    };
}

export function serializeCustomSubstitutionModelExport(spec, {
    exportedAt = new Date().toISOString(),
} = {}) {
    return JSON.stringify({
        format: CUSTOM_SUBSTITUTION_MODEL_EXPORT_FORMAT,
        exportedAt,
        model: createPortableCustomSubstitutionModelSpec(spec),
    }, null, 2);
}

export function resizeCustomSubstitutionModelDraft(draft, nextStateCount) {
    const count = clampStateCount(nextStateCount);
    const previousStates = Array.isArray(draft?.states) ? draft.states : [];
    const previousWeights = Array.isArray(draft?.transitionWeights) ? draft.transitionWeights : [];
    const defaultStates = buildDefaultStates(count);

    return {
        ...draft,
        stateCount: count,
        states: Array.from({ length: count }, (_, index) => ({
            ...defaultStates[index],
            ...(previousStates[index] || {}),
        })),
        transitionWeights: Array.from({ length: count }, (_, rowIndex) => (
            Array.from({ length: count }, (_, columnIndex) => {
                if (rowIndex === columnIndex) return 0;
                const preserved = previousWeights?.[rowIndex]?.[columnIndex];
                return preserved == null ? 1 : clampWeight(preserved);
            })
        )),
    };
}

export function normalizeCustomSubstitutionModelSpec(rawSpec = {}) {
    const draft = prepareDraft(rawSpec);
    const stateCount = draft.stateCount;

    const states = draft.states.map((state, index) => ({
        label: sanitizeLabel(state?.label, DEFAULT_STATE_LABELS[index] || `S${index + 1}`),
        color: typeof state?.color === 'string' && state.color ? state.color : DEFAULT_STATE_COLORS[index] || '#64748b',
    }));

    const uniqueLabels = new Set(states.map(state => state.label.toLowerCase()));
    if (uniqueLabels.size !== states.length) {
        throw new Error('Each state label must be unique.');
    }

    const transitionWeights = draft.transitionWeights.map((row, rowIndex) => (
        row.map((value, columnIndex) => (rowIndex === columnIndex ? 0 : clampWeight(value)))
    ));

    const name = sanitizeLabel(rawSpec.name, 'Custom substitution model');
    const id = rawSpec.id && /^(builtin|custom)-/.test(rawSpec.id)
        ? rawSpec.id
        : `custom-${slugify(name) || 'model'}-${Date.now().toString(36)}`;

    return {
        id,
        builtIn: /^builtin-/.test(id),
        name,
        stateCount,
        states,
        transitionWeights,
        modelMode: SUPPORTED_MODEL_MODES.has(rawSpec.modelMode) ? rawSpec.modelMode : DEFAULT_MODEL_MODE,
        baseRate: sanitizeRate(rawSpec.baseRate),
    };
}

export function parseCustomSubstitutionModelImport(text, {
    batchId = Date.now().toString(36),
} = {}) {
    let payload;
    try {
        payload = JSON.parse(text);
    } catch (_error) {
        throw new Error('Import file is not valid JSON.');
    }

    const importedModels = extractImportModels(payload);
    if (!importedModels.length) {
        throw new Error('Import JSON does not contain a supported substitution model payload.');
    }

    return importedModels.map((rawSpec, index) => normalizeCustomSubstitutionModelSpec({
        ...rawSpec,
        id: `custom-import-${batchId}-${index}`,
        builtIn: false,
    }));
}

export function validateCustomSubstitutionModelDraft(rawDraft = {}) {
    const draft = prepareDraft(rawDraft);
    const isQMatrixMode = draft.modelMode === 'q-matrix';
    const errors = [];
    const warnings = [];

    const trimmedName = typeof draft.name === 'string' ? draft.name.trim() : '';
    if (!trimmedName) {
        errors.push('Add a model name before saving.');
    }

    const baseRateNumber = Number(draft.baseRate);
    const baseRateInvalid = !(Number.isFinite(baseRateNumber) && baseRateNumber > 0);
    if (baseRateInvalid) {
        errors.push(isQMatrixMode
            ? 'Global Q scale must be a positive number.'
            : 'Base transition rate must be a positive number.');
    }

    const stateDiagnostics = draft.states.map((state, index) => {
        const trimmedLabel = typeof state?.label === 'string' ? state.label.trim() : '';
        return {
            index,
            trimmedLabel,
            displayLabel: trimmedLabel || `State ${index + 1}`,
            missing: !trimmedLabel,
            duplicate: false,
        };
    });

    const labelIndexByKey = new Map();
    stateDiagnostics.forEach(entry => {
        if (entry.missing) {
            errors.push(`${entry.displayLabel} needs a short label.`);
            return;
        }
        const key = entry.trimmedLabel.toLowerCase();
        if (!labelIndexByKey.has(key)) labelIndexByKey.set(key, []);
        labelIndexByKey.get(key).push(entry.index);
    });

    labelIndexByKey.forEach(indices => {
        if (indices.length <= 1) return;
        indices.forEach(index => {
            stateDiagnostics[index].duplicate = true;
        });
        const repeatedLabel = stateDiagnostics[indices[0]]?.trimmedLabel || 'Unnamed state';
        errors.push(`State labels must be unique. "${repeatedLabel}" is repeated.`);
    });

    if (!SUPPORTED_MODEL_MODES.has(draft.modelMode)) {
        errors.push('Choose one of the supported simulation modes.');
    }

    const matrixRowDiagnostics = draft.transitionWeights.map((row, rowIndex) => {
        const invalidColumns = [];
        const negativeColumns = [];
        let rowSum = 0;

        row.forEach((value, columnIndex) => {
            if (rowIndex === columnIndex) return;
            const numeric = Number(value);
            if (!Number.isFinite(numeric)) {
                invalidColumns.push(columnIndex);
                return;
            }
            if (numeric < 0) {
                negativeColumns.push(columnIndex);
                return;
            }
            rowSum += numeric;
        });

        const rowLabel = stateDiagnostics[rowIndex]?.displayLabel || `State ${rowIndex + 1}`;
        if (invalidColumns.length || negativeColumns.length) {
            errors.push(`${rowLabel} has invalid off-diagonal entries. Use numbers greater than or equal to zero.`);
        }

        const zeroOffDiagonal = rowSum <= 0;
        if (zeroOffDiagonal) {
            warnings.push(isQMatrixMode
                ? `${rowLabel} has no outgoing rate, so it will behave like an absorbing state.`
                : `${rowLabel} has no outgoing weight, so its row will be redistributed evenly when you save.`);
        }

        return {
            rowIndex,
            rowLabel,
            invalidColumns,
            negativeColumns,
            zeroOffDiagonal,
            rowSum,
        };
    });

    const isValid = errors.length === 0;

    let previewSummary = `${draft.stateCount} states • ${isQMatrixMode ? 'true CTMC Q-matrix' : 'shared-rate weights'}`;
    if (!baseRateInvalid) {
        previewSummary += ` • base rate ${baseRateNumber.toFixed(2)}`;
    }

    let normalizedPreview = null;
    if (isValid) {
        normalizedPreview = normalizeCustomSubstitutionModelSpec({
            ...draft,
            id: rawDraft.id || 'custom-preview',
            name: trimmedName,
            baseRate: baseRateNumber,
        });
        previewSummary = buildSubstitutionModelSummary(normalizedPreview);
    }

    return {
        draft,
        isValid,
        errors,
        warnings,
        previewSummary,
        normalizedPreview,
        stateDiagnostics,
        matrixRowDiagnostics,
        fieldStatus: {
            nameInvalid: !trimmedName,
            baseRateInvalid,
            missingStateLabels: stateDiagnostics.filter(entry => entry.missing).map(entry => entry.index),
            duplicateStateLabels: stateDiagnostics.filter(entry => entry.duplicate).map(entry => entry.index),
            invalidMatrixRows: matrixRowDiagnostics
                .filter(row => row.invalidColumns.length || row.negativeColumns.length)
                .map(row => row.rowIndex),
            warningMatrixRows: matrixRowDiagnostics
                .filter(row => row.zeroOffDiagonal)
                .map(row => row.rowIndex),
        },
    };
}

export function readCustomSubstitutionModelSpecs(storage) {
    if (!storage?.getItem) return [];
    try {
        const raw = JSON.parse(storage.getItem(CUSTOM_SUBSTITUTION_MODEL_STORAGE_KEY) || '[]');
        if (!Array.isArray(raw)) return [];
        return raw.map(spec => normalizeCustomSubstitutionModelSpec(spec));
    } catch (_error) {
        return [];
    }
}

function writeCustomSubstitutionModelSpecs(storage, specs) {
    if (!storage?.setItem) return;
    storage.setItem(CUSTOM_SUBSTITUTION_MODEL_STORAGE_KEY, JSON.stringify(specs));
}

export function upsertCustomSubstitutionModelSpec(storage, rawSpec) {
    const normalized = normalizeCustomSubstitutionModelSpec(rawSpec);
    if (normalized.builtIn) {
        throw new Error('Built-in substitution models cannot be overwritten.');
    }
    const current = readCustomSubstitutionModelSpecs(storage).filter(spec => spec.id !== normalized.id);
    current.push(normalized);
    writeCustomSubstitutionModelSpecs(storage, current);
    return normalized;
}

export function removeCustomSubstitutionModelSpec(storage, id) {
    if (!storage?.setItem || !id || /^builtin-/.test(id)) return;
    const current = readCustomSubstitutionModelSpecs(storage).filter(spec => spec.id !== id);
    writeCustomSubstitutionModelSpecs(storage, current);
}

export function buildSubstitutionModelCatalog(customSpecs = []) {
    return [
        ...getBuiltInSubstitutionModelSpecs(),
        ...customSpecs.map(spec => normalizeCustomSubstitutionModelSpec(spec)),
    ];
}

export function findSubstitutionModelSpec(catalog, modelId) {
    const models = Array.isArray(catalog) ? catalog : [];
    return models.find(spec => spec.id === modelId) || models[0] || null;
}

export function describeSubstitutionModel(spec) {
    if (!spec) return '';
    return buildSubstitutionModelSummary(normalizeCustomSubstitutionModelSpec(spec));
}
