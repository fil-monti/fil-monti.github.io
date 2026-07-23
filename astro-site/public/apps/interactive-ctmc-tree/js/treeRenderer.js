import { CANVAS_NEUTRALS } from './canvasPalette.js';

export function getTreeScaleFactor(nTips) {
    return nTips <= 3 ? 1 : Math.max(0.4, 1 - (nTips - 3) * 0.08);
}

export function getSequenceScaleFactor(nTips) {
    return nTips <= 3 ? 1 : Math.max(0.5, 1 - (nTips - 3) * 0.06);
}

function resolveTreeCanvasPalette(ctx) {
    const fallback = {
        branch: CANVAS_NEUTRALS.branch,
        node: CANVAS_NEUTRALS.ink,
        label: CANVAS_NEUTRALS.muted,
    };
    const canvas = ctx?.canvas;
    if (!canvas || typeof getComputedStyle !== 'function') {
        return fallback;
    }

    const styles = getComputedStyle(canvas);
    return {
        branch: styles.getPropertyValue('--canvas-tree-branch').trim() || fallback.branch,
        node: styles.getPropertyValue('--canvas-tree-node').trim() || fallback.node,
        label: styles.getPropertyValue('--canvas-tree-label').trim() || fallback.label,
    };
}

export function drawTreeScene({
    ctx,
    tree,
    getNumTips,
    createTreeLayout,
    branchTrackMode,
    branchSegments,
}) {
    const nTips = getNumTips();
    const nextTree = createTreeLayout(nTips);
    const scaleFactor = getTreeScaleFactor(nTips);
    const treePalette = resolveTreeCanvasPalette(ctx);
    const branchWidth = 3 * scaleFactor;
    const internalRadius = 8 * scaleFactor;
    const tipRadius = 10 * scaleFactor;
    const fontSize = Math.max(10, 14 * scaleFactor);
    const labelOffset = 40 * scaleFactor;

    function drawNode(node) {
        node.children.forEach(child => {
            ctx.strokeStyle = treePalette.branch;
            ctx.lineWidth = branchWidth;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(child.x, child.y);
            ctx.stroke();

            if (branchTrackMode !== 'none') {
                const edgeKey = `${node.id}->${child.id}`;
                const segments = branchSegments[branchTrackMode]?.get(edgeKey);
                if (segments) {
                    const overlayWidth = Math.max(2, branchWidth * 1.8);
                    segments.forEach(segment => {
                        const p0 = Math.max(0, Math.min(1, segment.p0));
                        const p1 = Math.max(0, Math.min(1, segment.p1));
                        if (p1 <= p0) return;
                        ctx.strokeStyle = segment.color;
                        ctx.lineWidth = overlayWidth;
                        ctx.beginPath();
                        ctx.moveTo(node.x + (child.x - node.x) * p0, node.y + (child.y - node.y) * p0);
                        ctx.lineTo(node.x + (child.x - node.x) * p1, node.y + (child.y - node.y) * p1);
                        ctx.stroke();
                    });
                }
            }

            drawNode(child);
        });

        ctx.fillStyle = treePalette.node;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.children.length > 0 ? internalRadius : tipRadius, 0, Math.PI * 2);
        ctx.fill();

        if (node.label) {
            ctx.fillStyle = treePalette.label;
            ctx.font = `${fontSize}px "DM Sans"`;
            ctx.textAlign = 'center';
            ctx.fillText(node.label, node.x, node.y + labelOffset);
        }
    }

    if (nTips !== 1) {
        ctx.fillStyle = treePalette.label;
        ctx.font = `${fontSize}px "DM Sans"`;
        ctx.textAlign = 'center';
        ctx.fillText('Root', nextTree.x, nextTree.y - 20 * scaleFactor);
    }
    drawNode(nextTree);
    return nextTree;
}

export function drawSequenceBoxes({ ctx, seq, nTips, colors, showHighlight = false }) {
    const scaleFactor = getSequenceScaleFactor(nTips);
    const boxSize = 15 * scaleFactor;
    const spacing = 2 * scaleFactor;
    const fontSize = Math.max(8, 10 * scaleFactor);
    const totalWidth = (boxSize + spacing) * seq.sequence.length - spacing;
    const startX = seq.x - totalWidth / 2;

    seq.sequence.forEach((nucleotide, index) => {
        const x = startX + index * (boxSize + spacing);
        const y = seq.y - 5 * scaleFactor;
        ctx.shadowColor = CANVAS_NEUTRALS.nodeShadow;
        ctx.shadowBlur = 4 * scaleFactor;
        ctx.shadowOffsetY = 2 * scaleFactor;
        ctx.fillStyle = colors[nucleotide];
        ctx.fillRect(x, y, boxSize, boxSize);
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = 'white';
        ctx.font = `bold ${fontSize}px "JetBrains Mono"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(nucleotide, x + boxSize / 2, y + boxSize / 2);

        if (seq.mutatedIndices?.includes(index)) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3 * scaleFactor;
            ctx.strokeRect(x - 2 * scaleFactor, y - 2 * scaleFactor, boxSize + 4 * scaleFactor, boxSize + 4 * scaleFactor);
        }

        if (showHighlight && index === 0) {
            ctx.strokeStyle = CANVAS_NEUTRALS.ink;
            ctx.lineWidth = 2 * scaleFactor;
            ctx.strokeRect(x - 3 * scaleFactor, y - 3 * scaleFactor, boxSize + 6 * scaleFactor, boxSize + 6 * scaleFactor);
        }
    });
}
