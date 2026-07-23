import { PANEL_LAYOUT } from './config.js';
import { createDiscreteProcessAdapter } from './animationProcesses.js';
import { createDiscreteStateCTMCClass } from './ctmcModel.js';
import { createFigureCTMCRenderer } from './ctmcFigureRenderer.js';
import { createFigureModelRuntime } from './modelPanelRuntimes.js';
import {
    createHostStyle,
    createSingleTipHostStyle,
    createThreeTipInitialHostStyle,
    createThreeTipSplitHostStyle,
} from './renderStyles.js';
import { CANVAS_FIGURE_LABEL_COLORS, CANVAS_NEUTRALS } from './canvasPalette.js';
import { generateRandomVirusColor } from './sequenceSimulation.js';
import {
    DEFAULT_BASE_RATE,
    buildSubstitutionModelSummary,
    normalizeCustomSubstitutionModelSpec,
} from './customSubstitutionCore.js';

const CUSTOM_TREE_LAYOUT = Object.freeze({
    defaultFigureScale: 0.34,
    jitterRadius: 8,
    tokenHorizontalOffset: 28,
    verticalOffset: -44,
    panelTravelTokenScale: 0.34,
    panelIdleTokenScale: 0.29,
    treeTokenScale: 0.24,
});

function withAlpha(color, alpha) {
    if (typeof color !== 'string') return color;
    if (color.startsWith('#') && color.length >= 7) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
}

function drawRoundedTag(ctx, cx, cy, width, height, radius, fillStyle, strokeStyle) {
    const x = cx - width / 2;
    const y = cy - height / 2;
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
}

function createStateFigure(state) {
    return (ctx, x, y, scale = 1) => {
        ctx.save();
        drawRoundedTag(
            ctx,
            x,
            y,
            48 * scale,
            36 * scale,
            11 * scale,
            withAlpha(state.color, 0.92),
            withAlpha(state.color, 0.55),
        );
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `700 ${Math.max(10, 15 * scale)}px "DM Sans"`;
        ctx.fillText(state.label, x, y + 0.5 * scale);
        ctx.restore();
    };
}

function drawStateToken(ctx, cx, cy, scale = 1, color = CANVAS_NEUTRALS.ink) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 8.2 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(color, 0.5);
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(cx, cy, 13 * scale, 0.15 * Math.PI, 1.7 * Math.PI);
    ctx.stroke();
    ctx.restore();
}

function clampWeight(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function normalizeTransitionMatrix(spec) {
    return spec.transitionWeights.map((row, rowIndex) => {
        const offDiagonal = row.map((value, columnIndex) => (rowIndex === columnIndex ? 0 : clampWeight(value)));
        const rowSum = offDiagonal.reduce((sum, value) => sum + value, 0);
        if (rowSum <= 0) {
            const fallback = spec.stateCount > 1 ? 1 / (spec.stateCount - 1) : 0;
            return offDiagonal.map((_, columnIndex) => (rowIndex === columnIndex ? 0 : fallback));
        }
        return offDiagonal.map((value, columnIndex) => (rowIndex === columnIndex ? 0 : value / rowSum));
    });
}

function buildGeneratorMatrix(spec) {
    return spec.transitionWeights.map((row, rowIndex) => {
        const offDiagonal = row.map((value, columnIndex) => (rowIndex === columnIndex ? 0 : clampWeight(value)));
        const rowSum = offDiagonal.reduce((sum, value) => sum + value, 0);
        return offDiagonal.map((value, columnIndex) => (rowIndex === columnIndex ? -rowSum : value));
    });
}

export function createSubstitutionModelRuntime({
    spec,
    sampleCategorical,
    sampleExp,
    panelViewKey = 'custom',
}) {
    const normalized = normalizeCustomSubstitutionModelSpec(spec);
    const states = normalized.states.map(state => ({
        name: state.label,
        drawFigure: createStateFigure(state),
    }));
    const transitionMatrix = normalizeTransitionMatrix(normalized);
    const generatorMatrix = normalized.modelMode === 'q-matrix' ? buildGeneratorMatrix(normalized) : null;

    const CTMCClass = createDiscreteStateCTMCClass({
        states,
        transitionMatrix,
        generatorMatrix,
        sampleCategorical,
        sampleExp,
        defaultRate: normalized.baseRate,
    });

    const renderer = createFigureCTMCRenderer({
        title: normalized.name,
        states,
        drawToken: drawStateToken,
        panelViewKey,
        panelLayout: PANEL_LAYOUT.custom,
        treeLayout: CUSTOM_TREE_LAYOUT,
        activeHaloColor: CANVAS_FIGURE_LABEL_COLORS.activeHalo,
        activeLabelColor: CANVAS_FIGURE_LABEL_COLORS.activeLabel,
        inactiveLabelColor: CANVAS_FIGURE_LABEL_COLORS.inactiveLabel,
        titleColor: CANVAS_FIGURE_LABEL_COLORS.title,
    });

    return {
        spec: normalized,
        CTMCClass,
        renderer,
        transitionMatrix,
        generatorMatrix,
        summary: buildSubstitutionModelSummary(normalized),
    };
}

export function createCustomSubstitutionModelManifest({
    getNumTips,
    hostVisualRandom,
    getShowCustomCtmc,
    getTrackAllCustomBranches,
    getCustomCtmcRate,
    getCustomRuntime = null,
    getCustomCTMCClass = null,
    getCustomCTMCStateCount = null,
    getCustomRenderer = null,
}) {
    const nextHostVisualRandom = typeof hostVisualRandom === 'function' ? hostVisualRandom : (() => 0);
    const resolveRuntime = () => (typeof getCustomRuntime === 'function' ? getCustomRuntime() : null);
    const resolveCTMCClass = () => {
        const runtime = resolveRuntime();
        return runtime?.CTMCClass || (typeof getCustomCTMCClass === 'function' ? getCustomCTMCClass() : null);
    };
    const resolveStateCount = () => {
        const runtime = resolveRuntime();
        return runtime?.spec?.stateCount || (typeof getCustomCTMCStateCount === 'function' ? getCustomCTMCStateCount() : 0);
    };
    const resolveRenderer = () => {
        const runtime = resolveRuntime();
        return runtime?.renderer || (typeof getCustomRenderer === 'function' ? getCustomRenderer() : null);
    };

    return {
        key: 'custom',
        stateKey: 'customCTMCs',
        createAnimationProcess({ getEntries, setEntries }) {
            return createDiscreteProcessAdapter({
                key: 'custom',
                getEntries,
                setEntries,
                updatePhase: 'preFixation',
                shouldInit: () => Boolean(resolveCTMCClass() && getShowCustomCtmc?.()),
                shouldUpdate: () => getShowCustomCtmc?.(),
                getTrackAll: () => getTrackAllCustomBranches?.() || false,
                buildEntry: ({ sequence, index, initContext }) => {
                    const CustomCTMC = resolveCTMCClass();
                    if (!CustomCTMC) return null;
                    const nTips = getNumTips();
                    const stateCount = Math.max(2, resolveStateCount() || 2);
                    const style = nTips === 1
                        ? createSingleTipHostStyle()
                        : nTips === 3
                        ? createThreeTipInitialHostStyle(sequence)
                        : (() => {
                            const color = generateRandomVirusColor(initContext.usedColors, nextHostVisualRandom);
                            initContext.usedColors.push(color);
                            return createHostStyle({ sequenceKey: sequence.sequenceId, color, lineage: 'custom-random' });
                        })();
                    return {
                        sequenceId: sequence.sequenceId,
                        ctmc: new CustomCTMC(index % stateCount),
                        ...style,
                    };
                },
                buildSplitEntry: ({ parentEntry, newSequence, child, childIndex }) => {
                    const CustomCTMC = resolveCTMCClass();
                    if (!CustomCTMC) return null;
                    const nTips = getNumTips();
                    const style = nTips === 3
                        ? createThreeTipSplitHostStyle(child)
                        : (() => {
                            const color = childIndex === 0
                                ? parentEntry.color
                                : generateRandomVirusColor([parentEntry.color], nextHostVisualRandom);
                            return createHostStyle({
                                sequenceKey: newSequence.sequenceId,
                                color,
                                lineage: childIndex === 0 ? 'custom-inherited' : 'custom-split',
                            });
                        })();
                    return {
                        sequenceId: newSequence.sequenceId,
                        ctmc: new CustomCTMC(0),
                        ...style,
                    };
                },
                getRate: () => getCustomCtmcRate?.() || resolveRuntime()?.spec?.baseRate || DEFAULT_BASE_RATE,
            });
        },
        createRenderRuntime() {
            return createFigureModelRuntime({
                id: 'custom',
                getEntries: snapshot => snapshot.customCTMCs,
                getRenderer: resolveRenderer,
                snapshotKey: 'customCTMCs',
                isPanelVisible: state => state.showCustomCtmc && state.showCustomCtmcPanel,
                isTreeVisible: state => state.showCustomCtmc,
                getTrackAllBranches: state => state.trackAllCustomBranches,
            });
        },
    };
}
