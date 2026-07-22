import { drawSequenceBoxes, drawTreeScene } from './treeRenderer.js';
import { createRenderSnapshot } from './appSnapshots.js';

function resolveCanvasBackgroundColor(ctx) {
    const fallback = '#f8f6ef';
    const canvas = ctx?.canvas;
    if (!canvas || typeof getComputedStyle !== 'function') {
        return fallback;
    }

    const backgroundColor = getComputedStyle(canvas).backgroundColor;
    if (!backgroundColor || backgroundColor === 'transparent' || backgroundColor === 'rgba(0, 0, 0, 0)') {
        return null;
    }
    return backgroundColor;
}

export function renderVisualization({
    ctx,
    canvasWidth,
    canvasHeight,
    tree,
    getNumTips,
    createTreeLayout,
    syncCanvasResolution,
    appState,
    animationController,
    snapshot = null,
    panelView,
    colors,
    modelRuntimes = [],
    renderers = {},
}) {
    const drawing = {
        drawTreeScene,
        drawSequenceBoxes,
        ...renderers,
    };

    const renderSnapshot = snapshot || createRenderSnapshot({
        animationState: animationController?.getState?.() || {},
        modelRuntimes,
    });
    const {
        sequences,
        branchSegments,
    } = renderSnapshot;

    const nTips = getNumTips();
    syncCanvasResolution?.();
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    const backgroundColor = resolveCanvasBackgroundColor(ctx);
    if (backgroundColor) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    let nextTree = tree;
    if (!appState.observationsMode) {
        nextTree = drawing.drawTreeScene({
            ctx,
            tree,
            getNumTips,
            createTreeLayout,
            branchTrackMode: appState.branchTrackMode,
            branchSegments,
        });
    }

    const runtimeContext = {
        ctx,
        snapshot: renderSnapshot,
        sequences,
        appState,
        canvasWidth,
        panelView,
        nTips,
    };

    modelRuntimes.forEach(runtime => {
        runtime?.drawPanel?.(runtimeContext);
    });

    modelRuntimes.forEach(runtime => {
        runtime?.drawTreeBackdrop?.(runtimeContext);
    });

    if (appState.showPhylogenetics) {
        sequences.forEach(sequence => {
            if (sequence.hideInTimeTravel) return;
            drawing.drawSequenceBoxes({
                ctx,
                seq: sequence,
                nTips,
                colors,
                showHighlight: appState.highlightTrackedNucleotide && sequence.tracked,
            });
        });
    }

    modelRuntimes.forEach(runtime => {
        runtime?.drawTreeOverlay?.(runtimeContext);
    });

    return nextTree;
}
