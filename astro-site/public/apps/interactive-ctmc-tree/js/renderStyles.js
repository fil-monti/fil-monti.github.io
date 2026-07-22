import { getMarkerSideForKey } from './identityUtils.js';
import {
    CANVAS_LINEAGE_COLORS,
    CANVAS_NEUTRALS,
    CANVAS_THREE_TIP_LINEAGE_COLORS,
} from './canvasPalette.js';

export const DEFAULT_GEO_STAR_COLOR = CANVAS_NEUTRALS.ink;

export const RANDOM_VIRUS_COLOR_POOL = CANVAS_LINEAGE_COLORS;

const THREE_TIP_HOST_STYLES = {
    rootInternal: {
        lineage: 'root-internal',
        color: CANVAS_THREE_TIP_LINEAGE_COLORS.primary,
        trackSlot: 'center',
        markerSide: 'left',
    },
    rootTip3: {
        lineage: 'root-tip3',
        color: CANVAS_THREE_TIP_LINEAGE_COLORS.outer,
        trackSlot: 'left',
        markerSide: 'right',
    },
    internalTip1: {
        lineage: 'internal-tip1',
        color: CANVAS_THREE_TIP_LINEAGE_COLORS.primary,
        trackSlot: 'center',
        markerSide: 'left',
    },
    internalTip2: {
        lineage: 'internal-tip2',
        color: CANVAS_THREE_TIP_LINEAGE_COLORS.sibling,
        trackSlot: 'right',
        markerSide: 'right',
    },
};

function cloneStyle(style) {
    return { ...style };
}

export function getTrackOffset(trackSlot, trackedOffsets = {}) {
    return trackedOffsets[trackSlot] || trackedOffsets.center || { x: 0, y: 0 };
}

export function getMarkerDirection(markerSide) {
    if (markerSide === 'right') return 1;
    if (markerSide === 'left') return -1;
    return 0;
}

export function createThreeTipInitialHostStyle(sequence) {
    const style = sequence.branchIndex === 1 && sequence.parentNodeId === 'root'
        ? THREE_TIP_HOST_STYLES.rootTip3
        : THREE_TIP_HOST_STYLES.rootInternal;
    return cloneStyle(style);
}

export function createThreeTipSplitHostStyle(child) {
    const isTip1 = child.id === 'tip1' || child.label === 'Tip 1';
    return cloneStyle(isTip1 ? THREE_TIP_HOST_STYLES.internalTip1 : THREE_TIP_HOST_STYLES.internalTip2);
}

export function createHostStyle({ sequenceKey, color, lineage = 'random', trackSlot = 'center' }) {
    return {
        color,
        lineage,
        trackSlot,
        markerSide: getMarkerSideForKey(sequenceKey),
    };
}
