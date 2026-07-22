import { getSequenceScaleFactor } from './treeRenderer.js';
import { HOST_STATES, PANEL_LAYOUT, TREE_STATE_LAYOUT } from './config.js';
import { getTrackOffset } from './renderStyles.js';
import { createFigureCTMCRenderer } from './ctmcFigureRenderer.js';
import { CANVAS_NEUTRALS } from './canvasPalette.js';

export function getGeoViewport({ canvasWidth, panelView }) {
    const geoLayout = PANEL_LAYOUT.geo;
    const baseX = canvasWidth - geoLayout.baseOffsetRight;
    const baseY = geoLayout.baseY;
    const { x, y, z } = panelView.geo;
    return [baseX + x, baseY + y, geoLayout.width * z, geoLayout.height * z];
}

export function drawCTMCPanel({
    ctx,
    panelView,
    colors,
    currentNucleotide = null,
    previousNucleotide = null,
    transitionProgress = 1,
}) {
    const phyloLayout = PANEL_LAYOUT.phylo;
    const ctmcLayout = phyloLayout.ctmc;
    const baseX = phyloLayout.anchor.x;
    const baseY = phyloLayout.anchor.y;
    const { x: dx, y: dy, z } = panelView.phylo;
    ctx.save();
    ctx.translate(baseX + dx, baseY + dy);
    ctx.scale(z, z);
    ctx.translate(-baseX, -baseY);

    const offsetX = baseX;
    const offsetY = baseY;
    const size = ctmcLayout.size;
    const vertices = [
        { x: offsetX, y: offsetY, nucleotide: 'A' },
        { x: offsetX + size, y: offsetY, nucleotide: 'T' },
        { x: offsetX + size, y: offsetY + size, nucleotide: 'G' },
        { x: offsetX, y: offsetY + size, nucleotide: 'C' },
    ];

    function drawArrowHead(fromX, fromY, toX, toY, color = CANVAS_NEUTRALS.arrow) {
        const headLength = ctmcLayout.arrowHeadLength;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const dx = toX - fromX;
        const dy = toY - fromY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const ratio = (length - 16) / length;
        const ex = fromX + dx * ratio;
        const ey = fromY + dy * ratio;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLength * Math.cos(angle - Math.PI / 6), ey - headLength * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(ex - headLength * Math.cos(angle + Math.PI / 6), ey - headLength * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
    }

    ctx.strokeStyle = CANVAS_NEUTRALS.arrow;
    ctx.lineWidth = 2;
    for (let index = 0; index < vertices.length; index++) {
        const next = (index + 1) % vertices.length;
        ctx.beginPath();
        ctx.moveTo(vertices[index].x, vertices[index].y);
        ctx.lineTo(vertices[next].x, vertices[next].y);
        ctx.stroke();
        drawArrowHead(vertices[index].x, vertices[index].y, vertices[next].x, vertices[next].y);
        drawArrowHead(vertices[next].x, vertices[next].y, vertices[index].x, vertices[index].y);
    }

    [[0, 2], [1, 3]].forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(vertices[a].x, vertices[a].y);
        ctx.lineTo(vertices[b].x, vertices[b].y);
        ctx.stroke();
        drawArrowHead(vertices[a].x, vertices[a].y, vertices[b].x, vertices[b].y);
        drawArrowHead(vertices[b].x, vertices[b].y, vertices[a].x, vertices[a].y);
    });

    vertices.forEach(vertex => {
        ctx.fillStyle = colors[vertex.nucleotide];
        ctx.beginPath();
        ctx.arc(vertex.x, vertex.y, ctmcLayout.nodeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px "JetBrains Mono"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(vertex.nucleotide, vertex.x, vertex.y);
    });

    if (currentNucleotide) {
        const current = vertices.find(vertex => vertex.nucleotide === currentNucleotide);
        const previous = previousNucleotide ? vertices.find(vertex => vertex.nucleotide === previousNucleotide) : null;
        if (previous && current && transitionProgress < 1) {
            const x = previous.x + (current.x - previous.x) * transitionProgress;
            const y = previous.y + (current.y - previous.y) * transitionProgress;
            const headLength = ctmcLayout.arrowHeadLength;
            const angle = Math.atan2(y - previous.y, x - previous.x);
            ctx.strokeStyle = CANVAS_NEUTRALS.ink;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(previous.x, previous.y);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.fillStyle = CANVAS_NEUTRALS.ink;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - headLength * Math.cos(angle - Math.PI / 6), y - headLength * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(x - headLength * Math.cos(angle + Math.PI / 6), y - headLength * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x, y, ctmcLayout.transitionDotRadius, 0, Math.PI * 2);
            ctx.fill();
        } else if (current) {
            ctx.strokeStyle = CANVAS_NEUTRALS.ink;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(current.x, current.y, ctmcLayout.nodeRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    ctx.fillStyle = CANVAS_NEUTRALS.muted;
    ctx.font = 'bold 14px "DM Sans"';
    ctx.textAlign = 'center';
    ctx.fillText('Genetic mutations', offsetX + size / 2, offsetY + ctmcLayout.titleOffsetY);
    ctx.fillStyle = CANVAS_NEUTRALS.subtle;
    ctx.font = '11px "DM Sans"';
    ctx.fillText('Tracking: 1st nucleotide (Root → Tip 1)', offsetX + size / 2, offsetY + size + ctmcLayout.trackingLabelOffsetY);
    ctx.restore();
}

export function drawCTMCLegend({ ctx, panelView, colors }) {
    const phyloLayout = PANEL_LAYOUT.phylo;
    const legendLayout = phyloLayout.legend;
    const baseX = phyloLayout.anchor.x;
    const baseY = phyloLayout.anchor.y;
    const { x: dx, y: dy, z } = panelView.phylo;
    ctx.save();
    ctx.translate(baseX + dx, baseY + dy);
    ctx.scale(z, z);
    ctx.translate(-baseX, -baseY);

    const ox = legendLayout.originX;
    const oy = legendLayout.originY;
    const box = legendLayout.boxSize;
    const hSpacing = legendLayout.horizontalSpacing;
    const vSpacing = legendLayout.verticalSpacing;
    const entries = [
        [ox, oy, 'A', 'Adenine'],
        [ox + hSpacing, oy, 'T', 'Thymine'],
        [ox, oy + vSpacing, 'C', 'Cytosine'],
        [ox + hSpacing, oy + vSpacing, 'G', 'Guanine'],
    ];

    entries.forEach(([x, y, letter, label]) => {
        ctx.fillStyle = colors[letter];
        ctx.fillRect(x, y, box, box);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px "JetBrains Mono"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(letter, x + box / 2, y + box / 2);
        ctx.fillStyle = CANVAS_NEUTRALS.muted;
        ctx.font = '11px "DM Sans"';
        ctx.textAlign = 'left';
        ctx.fillText(label, x + box + 6, y + box / 2);
    });

    ctx.restore();
}

export function drawLocationBadge({
    ctx,
    geoMap,
    seqX,
    seqY,
    locationName,
    nTips,
}) {
    const scaleFactor = getSequenceScaleFactor(nTips);
    const badgeLayout = TREE_STATE_LAYOUT.geoBadge;
    const badgeWidth = Math.max(badgeLayout.minWidth, locationName.length * badgeLayout.widthPerCharacter) * scaleFactor;
    const sequenceHeight = badgeLayout.sequenceHeight * scaleFactor;
    const badgeHeight = (sequenceHeight + badgeLayout.extraHeightTop + badgeLayout.extraHeightBottom) * scaleFactor;
    const fontSize = Math.max(badgeLayout.minFontSize, badgeLayout.fontSize * scaleFactor);
    const labelCenterX = seqX;
    const x0 = seqX - badgeWidth / 2;
    const y0 = seqY - sequenceHeight + badgeLayout.verticalOffset * scaleFactor;

    const silhouette = geoMap.buildSilhouetteForContinent(locationName, Math.round(badgeWidth), Math.round(badgeHeight));
    if (silhouette) {
        ctx.save();
        ctx.globalAlpha = 1.0;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        const shiftX = geoMap.getBadgeShift(locationName) * scaleFactor;
        ctx.drawImage(silhouette.canvas, x0 + shiftX, y0, badgeWidth, badgeHeight);
        ctx.restore();
    }

    /*
    ctx.save();
    ctx.fillStyle = CANVAS_NEUTRALS.badgeOverlay;
    const radius = badgeLayout.cornerRadius * scaleFactor;
    ctx.beginPath();
    ctx.moveTo(x0 + radius, y0);
    ctx.arcTo(x0 + badgeWidth, y0, x0 + badgeWidth, y0 + badgeHeight, radius);
    ctx.arcTo(x0 + badgeWidth, y0 + badgeHeight, x0, y0 + badgeHeight, radius);
    ctx.arcTo(x0, y0 + badgeHeight, x0, y0, radius);
    ctx.arcTo(x0, y0, x0 + badgeWidth, y0, radius);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    */

    ctx.fillStyle = CANVAS_NEUTRALS.ink;
    ctx.font = `bold ${fontSize}px "DM Sans"`;
    ctx.textAlign = 'center';
    ctx.fillText(
        locationName,
        labelCenterX,
        y0 + badgeHeight - badgeLayout.labelBottomOffset * scaleFactor - badgeLayout.labelLift * scaleFactor,
    );
}

export function drawGeoLocationLabel({ ctx, seq, stateName, nTips }) {
    const scaleFactor = getSequenceScaleFactor(nTips);
    const labelLayout = TREE_STATE_LAYOUT.geoLabel;
    const fontSize = Math.max(labelLayout.minFontSize, labelLayout.fontSize * scaleFactor);
    ctx.fillStyle = CANVAS_NEUTRALS.muted;
    ctx.font = `${fontSize}px "DM Sans"`;
    ctx.textAlign = 'center';
    ctx.fillText(stateName, seq.x, seq.y + labelLayout.offsetY * scaleFactor);
}

export function drawGeoPanel({
    ctx,
    geoMap,
    geoStars,
    sequences,
    trackAllBranches,
    canvasWidth,
    panelView,
    drawVirus = null,
}) {
    const geoLayout = PANEL_LAYOUT.geo;
    const [offsetX, offsetY, mapWidth, mapHeight] = getGeoViewport({ canvasWidth, panelView });
    geoMap.drawPanelBackground(ctx);

    ctx.save();
    ctx.beginPath();
    ctx.rect(offsetX, offsetY, mapWidth, mapHeight);
    ctx.clip();
    geoStars.forEach(({ sequenceId, star, color, trackSlot }) => {
        const seq = sequences.find(sequence => sequence.sequenceId === sequenceId);
        if (!seq || seq.hideInTimeTravel) return;
        if (!(trackAllBranches || seq.trackedGeo)) return;

        const offset = trackAllBranches ? getTrackOffset(trackSlot, geoLayout.trackedOffsets) : geoLayout.trackedOffsets.center;
        star.draw(ctx, color, offset, {
            drawHeadMarker: typeof drawVirus === 'function'
                ? ({ ctx: markerCtx, x, y, color: markerColor }) => {
                    drawVirus(markerCtx, x, y, 0.28 * panelView.geo.z, markerColor);
                }
                : null,
        });
    });
    ctx.restore();

    ctx.fillStyle = CANVAS_NEUTRALS.muted;
    ctx.font = 'bold 14px "DM Sans"';
    ctx.textAlign = 'center';
    ctx.fillText('Spatial Diffusion', offsetX + mapWidth / 2, offsetY + geoLayout.titleOffsetY);
}

export function drawHostPanel({
    ctx,
    hostCTMCs,
    sequences,
    trackAllHostBranches,
    hostStates,
    canvasWidth,
    panelView,
    drawVirus,
    hostIconByName,
}) {
    createHostTransmissionRenderer({
        hostStates,
        drawVirus,
        hostIconByName,
    }).drawPanel({
        ctx,
        ctmcEntries: hostCTMCs,
        sequences,
        trackAllBranches: trackAllHostBranches,
        canvasWidth,
        panelView,
    });
}

export function drawHostStateMarkers({
    ctx,
    sequences,
    hostCTMCs,
    trackAllHostBranches,
    nTips,
    drawVirus,
    hostIconByName,
}) {
    createHostTransmissionRenderer({
        drawVirus,
        hostIconByName,
    }).drawTreeMarkers({
        ctx,
        sequences,
        ctmcEntries: hostCTMCs,
        trackAllBranches: trackAllHostBranches,
        nTips,
    });
}

export function createHostTransmissionRenderer({
    hostStates,
    drawVirus,
    hostIconByName,
}) {
    const hostLayout = PANEL_LAYOUT.host;
    const markerLayout = TREE_STATE_LAYOUT.hostMarker;
    const hostNames = Array.isArray(hostStates) && hostStates.length
        ? hostStates.map(hostState => hostState.name)
        : HOST_STATES.map(hostState => hostState.name);

    const states = hostNames.map(name => ({
        name,
        drawFigure: hostIconByName?.[name],
        panelScaleMultiplier: name === 'Pig' ? hostLayout.pigScaleMultiplier : 1,
        treeScaleMultiplier: name === 'Pig'
            ? markerLayout.pigHostScale / markerLayout.defaultHostScale
            : 1,
        panelYOffset: hostLayout.iconYOffset[name] || 0,
    }));

    return createFigureCTMCRenderer({
        title: 'Host Transmission',
        states,
        drawToken: drawVirus,
        panelViewKey: 'host',
        panelLayout: hostLayout,
        treeLayout: {
            defaultFigureScale: markerLayout.defaultHostScale,
            jitterRadius: markerLayout.jitterRadius,
            tokenHorizontalOffset: markerLayout.virusHorizontalOffset,
            verticalOffset: markerLayout.verticalOffset,
            panelTravelTokenScale: markerLayout.panelTravelVirusScale,
            panelIdleTokenScale: markerLayout.panelIdleVirusScale,
            treeTokenScale: markerLayout.treeVirusScale,
        },
    });
}
