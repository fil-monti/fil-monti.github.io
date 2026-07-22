import { getSequenceScaleFactor } from './treeRenderer.js';
import { getStableJitter } from './identityUtils.js';
import { getMarkerDirection, getTrackOffset } from './renderStyles.js';
import { CANVAS_FIGURE_LABEL_COLORS } from './canvasPalette.js';

function withAlpha(color, alpha) {
    if (typeof color !== 'string') return `rgba(0,0,0,${alpha})`;
    if (color.startsWith('rgba')) return color.replace(/[\d.]+\)$/, `${alpha})`);
    if (color.startsWith('rgb(')) return color.replace('rgb(', 'rgba(').replace(')', `,${alpha})`);
    if (color.startsWith('#') && color.length >= 7) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }
    return color;
}

function clampIndex(index, count) {
    const nextIndex = Number.isFinite(index) ? (index | 0) : 0;
    return Math.max(0, Math.min(count - 1, nextIndex));
}

function resolveCurrentIndex(ctmc, count) {
    if (typeof ctmc?.getCurrentStateIndex === 'function') return clampIndex(ctmc.getCurrentStateIndex(), count);
    if (typeof ctmc?.getCurrentHostIndex === 'function') return clampIndex(ctmc.getCurrentHostIndex(), count);
    return clampIndex(ctmc?.i, count);
}

function resolveTargetIndex(ctmc, count) {
    if (typeof ctmc?.getTargetStateIndex === 'function') return clampIndex(ctmc.getTargetStateIndex(), count);
    if (typeof ctmc?.getTargetHostIndex === 'function') return clampIndex(ctmc.getTargetHostIndex(), count);
    return resolveCurrentIndex(ctmc, count);
}

function resolveTransitioning(ctmc) {
    if (typeof ctmc?.isTransitioning === 'function') return !!ctmc.isTransitioning();
    if (typeof ctmc?.isTransmitting === 'function') return !!ctmc.isTransmitting();
    return !!ctmc?.flight;
}

function resolveTransitionProgress(ctmc) {
    if (typeof ctmc?.getTransitionProgress === 'function') return ctmc.getTransitionProgress();
    if (typeof ctmc?.getTransmissionProgress === 'function') return ctmc.getTransmissionProgress();
    return 1;
}

function resolveStateName(ctmc, stateDefinitions) {
    if (typeof ctmc?.currentStateName === 'function') return ctmc.currentStateName();
    if (typeof ctmc?.currentHostName === 'function') return ctmc.currentHostName();
    return stateDefinitions[resolveCurrentIndex(ctmc, stateDefinitions.length)]?.name ?? 'Unknown';
}

function resolveSequenceVisible(sequence, trackAllBranches) {
    return Boolean(sequence) && !sequence.hideInTimeTravel && (trackAllBranches || sequence.tracked);
}

function getRingDensityScale(count) {
    if (count <= 3) return 1.08;
    if (count <= 5) return 1;
    return Math.max(0.72, 1 - (count - 5) * 0.06);
}

function getRingRadiusScale(count) {
    if (count <= 3) return 0.9;
    if (count <= 6) return 1;
    return Math.min(1.14, 1 + (count - 6) * 0.035);
}

function getCurvedTransitionControlPoint(from, to, center, ringRadius) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy) || 1;
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const perpX = -dy / distance;
    const perpY = dx / distance;
    const outwardDot = (midX - center.x) * perpX + (midY - center.y) * perpY;
    const bendSign = outwardDot >= 0 ? 1 : -1;
    const bendDistance = Math.min(ringRadius * 0.68, Math.max(18, distance * 0.32));
    return {
        x: midX + perpX * bendSign * bendDistance,
        y: midY + perpY * bendSign * bendDistance,
    };
}

function getQuadraticPoint(from, control, to, t) {
    const u = 1 - t;
    return {
        x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
        y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
    };
}

export function createFigureCTMCRenderer({
    title,
    states,
    drawToken,
    panelViewKey,
    panelLayout,
    treeLayout,
    activeHaloColor = CANVAS_FIGURE_LABEL_COLORS.activeHalo,
    activeLabelColor = CANVAS_FIGURE_LABEL_COLORS.activeLabel,
    inactiveLabelColor = CANVAS_FIGURE_LABEL_COLORS.inactiveLabel,
    titleColor = CANVAS_FIGURE_LABEL_COLORS.title,
    panelIdleTokenYOffset = -5,
    isSequenceVisible = resolveSequenceVisible,
    getEntryTrackSlot = entry => entry.trackSlot,
    getEntryMarkerSide = entry => entry.markerSide,
}) {
    const stateDefinitions = (Array.isArray(states) ? states : []).map((state, index) => ({
        ...state,
        name: state?.name ?? state?.label ?? `State ${index + 1}`,
    }));

    if (stateDefinitions.length < 2 || stateDefinitions.length > 10) {
        throw new RangeError('Figure CTMC renderers currently support between 2 and 10 figures.');
    }

    function getPanelFrame({ canvasWidth, panelView }) {
        const view = panelView?.[panelViewKey] || { x: 0, y: 0, z: 1 };
        const panelX = canvasWidth - panelLayout.baseOffsetRight + view.x;
        const panelY = panelLayout.baseY + view.y;
        const panelW = panelLayout.width * view.z;
        const panelH = panelLayout.height * view.z;
        return { panelX, panelY, panelW, panelH, z: view.z };
    }

    function getPanelPositions({ canvasWidth, panelView }) {
        const { panelX, panelY, panelW, panelH, z } = getPanelFrame({ canvasWidth, panelView });
        const radius = panelLayout.ringRadius * getRingRadiusScale(stateDefinitions.length) * z;
        const centerX = panelX + panelW / 2;
        const centerY = panelY + panelH / 2;
        return stateDefinitions.map((state, index) => {
            const angle = (index / stateDefinitions.length) * Math.PI * 2 - Math.PI / 2;
            return {
                ...state,
                index,
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
            };
        });
    }

    function drawPanel({
        ctx,
        ctmcEntries,
        sequences,
        trackAllBranches,
        canvasWidth,
        panelView,
    }) {
        if (!ctmcEntries?.length) return;

        const { panelX, panelY, panelW, z } = getPanelFrame({ canvasWidth, panelView });
        const positions = getPanelPositions({ canvasWidth, panelView });
        const panelCenter = {
            x: panelX + panelW / 2,
            y: panelY + (panelLayout.height * z) / 2,
        };
        const densityScale = getRingDensityScale(stateDefinitions.length);

        ctx.fillStyle = titleColor;
        ctx.font = 'bold 14px "DM Sans"';
        ctx.textAlign = 'center';
        ctx.fillText(title, panelX + panelW / 2, panelY + panelLayout.titleOffsetY);

        const activeIndices = new Set();
        if (!trackAllBranches) {
            ctmcEntries.forEach(({ ctmc }) => {
                activeIndices.add(resolveCurrentIndex(ctmc, stateDefinitions.length));
                if (resolveTransitioning(ctmc)) activeIndices.add(resolveTargetIndex(ctmc, stateDefinitions.length));
            });
        }

        positions.forEach(position => {
            const isActive = activeIndices.has(position.index);
            const iconY = position.y + (position.panelYOffset || 0) * z;
            let scale = (isActive ? panelLayout.activeScale : panelLayout.inactiveScale) * z * densityScale;
            scale *= position.panelScaleMultiplier ?? 1;

            /*
            if (isActive && !trackAllBranches) {
                ctx.fillStyle = activeHaloColor;
                ctx.beginPath();
                ctx.arc(position.x, iconY, panelLayout.activeHaloRadius * z, 0, Math.PI * 2);
                ctx.fill();
            }
            */

            position.drawFigure?.(ctx, position.x, iconY, scale);
            ctx.fillStyle = isActive && !trackAllBranches ? activeLabelColor : inactiveLabelColor;
            ctx.font = isActive && !trackAllBranches ? `bold ${11 * z}px "DM Sans"` : `${10 * z}px "DM Sans"`;
            ctx.textAlign = 'center';
            ctx.fillText(position.name, position.x, position.y + panelLayout.labelOffsetY * z);
        });

        ctmcEntries.forEach(entry => {
            const seq = sequences.find(sequence => sequence.sequenceId === entry.sequenceId);
            if (!isSequenceVisible(seq, trackAllBranches)) return;

            const offset = trackAllBranches
                ? getTrackOffset(getEntryTrackSlot(entry), panelLayout.trackedOffsets)
                : panelLayout.trackedOffsets.center;
            const currentPosition = positions[resolveCurrentIndex(entry.ctmc, positions.length)];
            if (!currentPosition) return;

            if (resolveTransitioning(entry.ctmc)) {
                const targetPosition = positions[resolveTargetIndex(entry.ctmc, positions.length)];
                if (!targetPosition) return;

                const progress = resolveTransitionProgress(entry.ctmc);
                const fromPoint = {
                    x: currentPosition.x + offset.x,
                    y: currentPosition.y + offset.y,
                };
                const toPoint = {
                    x: targetPosition.x + offset.x,
                    y: targetPosition.y + offset.y,
                };
                const controlPoint = getCurvedTransitionControlPoint(
                    fromPoint,
                    toPoint,
                    panelCenter,
                    panelLayout.ringRadius * z,
                );
                const tokenPoint = getQuadraticPoint(fromPoint, controlPoint, toPoint, progress);

                ctx.strokeStyle = withAlpha(entry.color, 0.3);
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(fromPoint.x, fromPoint.y);
                ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, toPoint.x, toPoint.y);
                ctx.stroke();
                ctx.setLineDash([]);
                drawToken?.(ctx, tokenPoint.x, tokenPoint.y, treeLayout.panelTravelTokenScale, entry.color);
                return;
            }

            drawToken?.(
                ctx,
                currentPosition.x + offset.x,
                currentPosition.y + panelIdleTokenYOffset + offset.y,
                treeLayout.panelIdleTokenScale,
                entry.color,
            );
        });
    }

    function drawTreeMarkers({
        ctx,
        sequences,
        ctmcEntries,
        trackAllBranches,
        nTips,
    }) {
        const scaleFactor = getSequenceScaleFactor(nTips);

        sequences.forEach(sequence => {
            if (!isSequenceVisible(sequence, trackAllBranches)) return;
            const entry = ctmcEntries.find(candidate => candidate.sequenceId === sequence.sequenceId);
            if (!entry) return;

            const stateName = resolveStateName(entry.ctmc, stateDefinitions);
            const stateDefinition = stateDefinitions.find(state => state.name === stateName)
                || stateDefinitions[resolveCurrentIndex(entry.ctmc, stateDefinitions.length)];
            if (!stateDefinition) return;

            const jitter = trackAllBranches
                ? getStableJitter(sequence.sequenceId, treeLayout.jitterRadius * scaleFactor)
                : { x: 0, y: 0 };
            const direction = getMarkerDirection(getEntryMarkerSide(entry));
            const markerY = sequence.y
                + treeLayout.verticalOffset * scaleFactor
                + jitter.y
                + (stateDefinition.treeYOffset || 0) * scaleFactor;
            const iconScale = treeLayout.defaultFigureScale
                * (stateDefinition.treeScaleMultiplier ?? 1)
                * scaleFactor;

            drawToken?.(
                ctx,
                sequence.x + jitter.x + direction * treeLayout.tokenHorizontalOffset * scaleFactor,
                markerY,
                treeLayout.treeTokenScale * scaleFactor,
                entry.color,
            );
            stateDefinition.drawFigure?.(ctx, sequence.x + jitter.x, markerY, iconScale);
        });
    }

    return {
        title,
        states: stateDefinitions,
        getPanelFrame,
        getPanelPositions,
        drawPanel,
        drawTreeMarkers,
    };
}
