function cloneJsonLike(value) {
    if (Array.isArray(value)) return value.map(cloneJsonLike);
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [key, cloneJsonLike(entry)]),
        );
    }
    return value;
}

function clonePrototypeObject(source) {
    if (!source || typeof source !== 'object') return source;
    return Object.assign(Object.create(Object.getPrototypeOf(source) || Object.prototype), source);
}

function cloneSequenceBranchSegments(branchSegments = {}) {
    return {
        phylo: Array.isArray(branchSegments.phylo) ? branchSegments.phylo.map(segment => ({ ...segment })) : [],
        geo: Array.isArray(branchSegments.geo) ? branchSegments.geo.map(segment => ({ ...segment })) : [],
        host: Array.isArray(branchSegments.host) ? branchSegments.host.map(segment => ({ ...segment })) : [],
    };
}

export function cloneSequenceForRender(sequence = {}) {
    return {
        ...sequence,
        sequence: Array.isArray(sequence.sequence) ? [...sequence.sequence] : [],
        mutatedIndices: Array.isArray(sequence.mutatedIndices) ? [...sequence.mutatedIndices] : [],
        branchSegments: cloneSequenceBranchSegments(sequence.branchSegments),
    };
}

export function cloneBranchSegmentsForRender(branchSegments = {}) {
    return Object.fromEntries(
        ['phylo', 'geo', 'host'].map(key => {
            const sourceMap = branchSegments[key] instanceof Map ? branchSegments[key] : new Map();
            return [
                key,
                new Map(
                    Array.from(sourceMap.entries()).map(([edgeKey, segments]) => [
                        edgeKey,
                        Array.isArray(segments) ? segments.map(segment => cloneJsonLike(segment)) : [],
                    ]),
                ),
            ];
        }),
    );
}

export function cloneDiscreteRuntimeForRender(ctmc) {
    const cloned = clonePrototypeObject(ctmc);
    if (!cloned) return cloned;
    cloned.flight = cloneJsonLike(ctmc?.flight ?? null);
    return cloned;
}

export function cloneFigureEntryForRender(entry = {}) {
    return {
        ...entry,
        ctmc: cloneDiscreteRuntimeForRender(entry.ctmc),
    };
}

export function cloneGeoStarForRender(star) {
    const cloned = clonePrototypeObject(star);
    if (!cloned) return cloned;

    cloned.flight = cloneJsonLike(star?.flight ?? null);
    cloned.trail = Array.isArray(star?.trail) ? star.trail.map(point => ({ ...point })) : [];
    cloned.routeSegments = Array.isArray(star?.routeSegments)
        ? star.routeSegments.map(segment => ({
            ...segment,
            route: cloneJsonLike(segment.route),
        }))
        : [];
    cloned._viewport = star?._viewport ? { ...star._viewport } : null;
    return cloned;
}

export function cloneGeoEntryForRender(entry = {}) {
    return {
        ...entry,
        star: cloneGeoStarForRender(entry.star),
    };
}

export function createRenderSnapshot({
    animationState = {},
    modelRuntimes = [],
} = {}) {
    const snapshot = {
        sequences: Array.isArray(animationState.sequences)
            ? animationState.sequences.map(cloneSequenceForRender)
            : [],
        branchSegments: cloneBranchSegmentsForRender(animationState.branchSegments),
        ctmcCurrentNucleotide: animationState.ctmcCurrentNucleotide ?? null,
        ctmcPreviousNucleotide: animationState.ctmcPreviousNucleotide ?? null,
        ctmcTransitionProgress: animationState.ctmcTransitionProgress ?? 1,
        geoStars: [],
        hostCTMCs: [],
        customCTMCs: [],
    };

    modelRuntimes.forEach(runtime => {
        runtime?.exportSnapshot?.(animationState, snapshot);
    });

    if (!snapshot.geoStars.length && Array.isArray(animationState.geoStars)) {
        snapshot.geoStars = animationState.geoStars.map(cloneGeoEntryForRender);
    }

    if (!snapshot.hostCTMCs.length && Array.isArray(animationState.hostCTMCs)) {
        snapshot.hostCTMCs = animationState.hostCTMCs.map(cloneFigureEntryForRender);
    }

    if (!snapshot.customCTMCs.length && Array.isArray(animationState.customCTMCs)) {
        snapshot.customCTMCs = animationState.customCTMCs.map(cloneFigureEntryForRender);
    }

    return snapshot;
}
