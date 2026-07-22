import { RANDOM_VIRUS_COLOR_POOL } from './renderStyles.js';

export function hexToRgba(color, alpha) {
    if (color.startsWith('rgba')) return color.replace(/[\d.]+\)$/, `${alpha})`);
    if (color.startsWith('#')) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }
    return `rgba(0,0,0,${alpha})`;
}

export function mutateSequence(sequence, { mutationRate, speed, nucleotides, random }) {
    const nextSequence = [...sequence];
    const mutatedIndices = [];
    nextSequence.forEach((nucleotide, index) => {
        if (random() < mutationRate * speed / 60) {
            const alternatives = nucleotides.filter(candidate => candidate !== nucleotide);
            nextSequence[index] = alternatives[Math.floor(random() * alternatives.length)];
            mutatedIndices.push(index);
        }
    });
    return { sequence: nextSequence, mutatedIndices };
}

export function createSequence({
    tree,
    findNodeById,
    sequenceId,
    x,
    y,
    targetX,
    targetY,
    sequence,
    parentNodeId = null,
    started = false,
    tracked = false,
    targetNodeId = null,
}) {
    const parentNode = parentNodeId ? findNodeById(tree, parentNodeId) : null;
    const targetNode = targetNodeId ? findNodeById(tree, targetNodeId) : null;
    const startX = parentNode ? parentNode.x : x;
    const startY = parentNode ? parentNode.y : y;
    const endX = targetNode ? targetNode.x : targetX;
    const endY = targetNode ? targetNode.y : targetY;

    return {
        x: startX,
        y: startY,
        targetX: endX,
        targetY: endY,
        parentNodeId,
        targetNodeId,
        sequence: [...sequence],
        progress: 0,
        mutatedIndices: [],
        started,
        tracked,
        distance: Math.hypot(endX - startX, endY - startY) || 1,
        sequenceId,
        parentSequenceId: null,
        branchSegments: { phylo: [], geo: [], host: [] },
    };
}

export function generateRandomVirusColor(excludeColors = [], random = null) {
    const valid = RANDOM_VIRUS_COLOR_POOL.filter(color => !excludeColors.includes(color));
    const source = valid.length > 0 ? valid : RANDOM_VIRUS_COLOR_POOL;
    const nextRandom = typeof random === 'function' ? random : () => 0;
    return source[Math.floor(nextRandom() * source.length)];
}

export function createBranchSegmentRegistry() {
    const maps = {
        phylo: new Map(),
        geo: new Map(),
        host: new Map(),
    };

    function clear() {
        maps.phylo.clear();
        maps.geo.clear();
        maps.host.clear();
    }

    function edgeKeyFromSequence(sequence) {
        if (!sequence.parentNodeId || !sequence.targetNodeId) return null;
        return `${sequence.parentNodeId}->${sequence.targetNodeId}`;
    }

    function upsert(sequence, processKey, stateKey, color, progress01) {
        const edgeKey = edgeKeyFromSequence(sequence);
        if (!edgeKey) return;
        const progress = Math.max(0, Math.min(1, progress01));

        const localSegments = sequence.branchSegments?.[processKey];
        if (localSegments) {
            const lastSegment = localSegments.length ? localSegments[localSegments.length - 1] : null;
            if (lastSegment && lastSegment.edgeKey === edgeKey && lastSegment.stateKey === stateKey) {
                lastSegment.p1 = Math.max(lastSegment.p1, progress);
            } else {
                localSegments.push({ edgeKey, stateKey, color, p0: progress, p1: progress });
            }
        }

        const processMap = maps[processKey];
        if (!processMap) return;
        if (!processMap.has(edgeKey)) processMap.set(edgeKey, []);
        const overlaySegments = processMap.get(edgeKey);
        const lastOverlay = overlaySegments.length ? overlaySegments[overlaySegments.length - 1] : null;
        if (lastOverlay && lastOverlay.stateKey === stateKey) {
            lastOverlay.p1 = Math.max(lastOverlay.p1, progress);
        } else {
            overlaySegments.push({ stateKey, color, p0: progress, p1: progress });
        }
    }

    function finalize(sequence) {
        if (!sequence.branchSegments) return;
        ['phylo', 'geo', 'host'].forEach(processKey => {
            const segments = sequence.branchSegments[processKey];
            if (segments?.length) segments[segments.length - 1].p1 = 1;
        });
    }

    return { maps, clear, upsert, finalize };
}
