function shallowCloneFlight(flight) {
    return flight ? JSON.parse(JSON.stringify(flight)) : null;
}

export function cloneDiscreteRuntime(targetCtmc, sourceCtmc) {
    if (!targetCtmc || !sourceCtmc) return;
    targetCtmc.i = sourceCtmc.i;
    targetCtmc.nextState = sourceCtmc.nextState;
    targetCtmc.time = sourceCtmc.time;
    targetCtmc.t1 = sourceCtmc.t1;
    targetCtmc.t2 = sourceCtmc.t2;
    targetCtmc.t3 = sourceCtmc.t3;
    targetCtmc.flight = shallowCloneFlight(sourceCtmc.flight);
}

export function completeDiscreteRuntime(ctmc) {
    if (!ctmc) return false;
    if (typeof ctmc.completeActiveTransition === 'function') {
        return ctmc.completeActiveTransition();
    }
    if (typeof ctmc.completeActiveTransmission === 'function') {
        return ctmc.completeActiveTransmission();
    }
    if (ctmc.isTransitioning?.() || ctmc.isTransmitting?.()) {
        const targetIndex = ctmc.getTargetStateIndex?.() ?? ctmc.getTargetHostIndex?.();
        if (Number.isFinite(targetIndex)) ctmc.i = targetIndex | 0;
        if ('nextState' in ctmc) ctmc.nextState = ctmc.i;
        if ('flight' in ctmc) ctmc.flight = null;
        return true;
    }
    return false;
}

function findEntryBySequence(entries, sequenceId) {
    return entries.find(entry => entry.sequenceId === sequenceId) || null;
}

function removeEntryBySequence(entries, sequenceId) {
    return entries.filter(entry => entry.sequenceId !== sequenceId);
}

export function createDiscreteProcessAdapter({
    key,
    getEntries,
    setEntries,
    updatePhase = 'inFlight',
    shouldInit = () => true,
    shouldUpdate = () => true,
    getTrackAll = () => true,
    isTrackedSequence = sequence => sequence?.tracked,
    buildEntry,
    buildSplitEntry,
    getRate = () => 1,
    getRuntime = entry => entry?.ctmc,
    cloneRuntime = cloneDiscreteRuntime,
    completeRuntime = completeDiscreteRuntime,
    getBranchState = null,
    onFixate = null,
}) {
    function findEntry(sequenceId) {
        return findEntryBySequence(getEntries(), sequenceId);
    }

    function init({ sequences }) {
        if (!shouldInit()) {
            setEntries([]);
            return;
        }

        const nextEntries = [];
        const initContext = { usedColors: [] };
        sequences.forEach((sequence, index) => {
            const entry = buildEntry?.({ sequence, index, initContext });
            if (!entry) return;
            getRuntime(entry)?.setRate?.(getRate());
            nextEntries.push(entry);
        });
        setEntries(nextEntries);
    }

    function updateSequence({ sequence, dLenNorm }) {
        if (!shouldUpdate() || dLenNorm <= 0) return;
        const entry = findEntry(sequence.sequenceId);
        if (!entry || !(getTrackAll() || isTrackedSequence(sequence)) || sequence.fixated) return;
        const runtime = getRuntime(entry);
        runtime?.setRate?.(getRate());
        runtime?.update?.(dLenNorm);
    }

    function recordBranchSegment({ sequence, branchSegments }) {
        if (!getBranchState) return;
        const entry = findEntry(sequence.sequenceId);
        if (!entry) return;
        const state = getBranchState(entry);
        if (!state) return;
        branchSegments.upsert(sequence, key, state.stateKey, state.color, sequence.progress);
    }

    function createSplitEntryForSequence({ parentSequenceId, newSequence, child, childIndex }) {
        const parentEntry = findEntry(parentSequenceId);
        if (!parentEntry || !buildSplitEntry) return null;
        const entry = buildSplitEntry({ parentEntry, newSequence, child, childIndex });
        if (!entry) return null;
        cloneRuntime(getRuntime(entry), getRuntime(parentEntry));
        getRuntime(entry)?.setRate?.(getRate());
        setEntries([...getEntries(), entry]);
        return entry;
    }

    function removeSequence(sequenceId) {
        setEntries(removeEntryBySequence(getEntries(), sequenceId));
    }

    function fixateSequence({ sequence, targetNode }) {
        const entry = findEntry(sequence.sequenceId);
        if (!entry) return;
        completeRuntime(getRuntime(entry));
        onFixate?.({ entry, sequence, targetNode });
    }

    return {
        key,
        updatePhase,
        getEntries,
        init,
        updateSequence,
        recordBranchSegment,
        createSplitEntryForSequence,
        removeSequence,
        fixateSequence,
        findEntry,
    };
}

export function createGeoProcessAdapter({
    getEntries,
    setEntries,
    GeoCTMCStar,
    geoStates,
    geoStateColors,
    getTrackAllBranches,
    getShowPhylogeography,
    getStickyPaths,
    getDiffusionRate,
    getGeoViewport,
    projectEquirect,
    getHostEntries,
    defaultColor,
}) {
    function findEntry(sequenceId) {
        return findEntryBySequence(getEntries(), sequenceId);
    }

    function cloneGeoStarState(targetStar, sourceStar, {
        preserveTrail = true,
        preserveRouteSegments = true,
        preserveFlight = true,
        flightVisibleStartProgress = null,
    } = {}) {
        Object.assign(targetStar, {
            i: sourceStar.i,
            time: sourceStar.time,
            t1: sourceStar.t1,
            t2: sourceStar.t2,
            t3: sourceStar.t3,
            nextState: sourceStar.nextState,
            headX: sourceStar.headX,
            headY: sourceStar.headY,
            stickyPaths: sourceStar.stickyPaths,
            trailMaxAge: sourceStar.trailMaxAge,
            trailSampleHz: sourceStar.trailSampleHz,
            trailBootstrapDistance: sourceStar.trailBootstrapDistance,
            trailMinPixelStep: sourceStar.trailMinPixelStep,
            _trailAcc: preserveTrail ? sourceStar._trailAcc : 0,
        });

        if (preserveFlight && sourceStar.flight) {
            targetStar.flight = {
                ...sourceStar.flight,
                route: typeof sourceStar.cloneRoute === 'function'
                    ? sourceStar.cloneRoute(sourceStar.flight.route)
                    : sourceStar.flight.route,
            };
            if (flightVisibleStartProgress != null) {
                targetStar.flight.visibleStartProgress = flightVisibleStartProgress;
            }
        } else {
            targetStar.flight = null;
        }

        targetStar.trail = preserveTrail
            ? sourceStar.trail.map(point => ({ ...point }))
            : (Number.isFinite(sourceStar.headX) && Number.isFinite(sourceStar.headY)
                ? [{ x: sourceStar.headX, y: sourceStar.headY, age: 0 }]
                : []);

        targetStar.routeSegments = preserveRouteSegments
            ? (sourceStar.routeSegments || []).map(segment => ({
                route: typeof sourceStar.cloneRoute === 'function'
                    ? sourceStar.cloneRoute(segment.route)
                    : JSON.parse(JSON.stringify(segment.route)),
                age: segment.age,
            }))
            : [];
    }

    function createRootEntry(sequenceId) {
        const star = new GeoCTMCStar(0);
        star.setStickyPaths(getStickyPaths());
        const [offsetX, offsetY, mapWidth, mapHeight] = getGeoViewport();
        const [x, y] = projectEquirect(geoStates[0].lon, geoStates[0].lat, offsetX, offsetY, mapWidth, mapHeight);
        star.headX = x;
        star.headY = y;
        const hostEntry = findEntryBySequence(getHostEntries(), sequenceId);
        return {
            sequenceId,
            star,
            color: hostEntry ? hostEntry.color : defaultColor,
            trackSlot: hostEntry?.trackSlot || 'center',
        };
    }

    function init({ sequences }) {
        const nextEntries = [];
        sequences.forEach(sequence => {
            if (!(getTrackAllBranches() || sequence.trackedGeo)) return;
            nextEntries.push(createRootEntry(sequence.sequenceId));
        });
        setEntries(nextEntries);
    }

    function sync({ sequences }) {
        if (!getShowPhylogeography()) return;

        const nextEntries = [...getEntries()];
        sequences.forEach(sequence => {
            if (!(getTrackAllBranches() || sequence.trackedGeo)) return;
            if (findEntryBySequence(nextEntries, sequence.sequenceId)) return;

            const parentEntry = sequence.parentSequenceId != null
                ? findEntryBySequence(nextEntries, sequence.parentSequenceId)
                : null;

            if (!parentEntry) {
                nextEntries.push(createRootEntry(sequence.sequenceId));
                return;
            }

            const star = new GeoCTMCStar(0);
            star.setStickyPaths(getStickyPaths());
            cloneGeoStarState(star, parentEntry.star);

            const hostEntry = findEntryBySequence(getHostEntries(), sequence.sequenceId);
            nextEntries.push({
                sequenceId: sequence.sequenceId,
                star,
                color: hostEntry ? hostEntry.color : parentEntry.color,
                trackSlot: hostEntry?.trackSlot || parentEntry.trackSlot || 'center',
            });
        });

        setEntries(nextEntries.filter(entry => {
            const sequence = sequences.find(candidate => candidate.sequenceId === entry.sequenceId);
            return sequence && (getTrackAllBranches() || sequence.trackedGeo);
        }));
    }

    function updateSequence({ sequence, dLenNorm, dt, speed }) {
        if (!getShowPhylogeography() || !sequence.started || sequence.progress <= 0) return;
        const entry = findEntry(sequence.sequenceId);
        if (!entry?.star) return;
        const [offsetX, offsetY, mapWidth, mapHeight] = getGeoViewport();
        entry.star.setStickyPaths(getStickyPaths());
        entry.star.setRate(getDiffusionRate());
        entry.star.update(dLenNorm, offsetX, offsetY, mapWidth, mapHeight);
        entry.star.updateTrail(dt * speed);
    }

    function recordBranchSegment({ sequence, branchSegments }) {
        const entry = findEntry(sequence.sequenceId);
        if (!entry?.star) return;
        const stateIndex = entry.star.i;
        branchSegments.upsert(sequence, 'geo', stateIndex, geoStateColors[stateIndex] || '#000', sequence.progress);
    }

    function createSplitEntryForSequence({ parentSequenceId, newSequence, childIndex = 0 }) {
        if (!(getTrackAllBranches() || newSequence.trackedGeo)) return null;
        const parentEntry = findEntry(parentSequenceId);
        if (!parentEntry) return null;

        const star = new GeoCTMCStar(0);
        star.setStickyPaths(getStickyPaths());
        cloneGeoStarState(star, parentEntry.star, childIndex === 0
            ? {}
            : {
                preserveTrail: false,
                preserveRouteSegments: false,
                preserveFlight: !!parentEntry.star.flight,
                flightVisibleStartProgress: parentEntry.star.getTransitionProgress?.() ?? 1,
            });

        const hostEntry = findEntryBySequence(getHostEntries(), newSequence.sequenceId);
        const entry = {
            sequenceId: newSequence.sequenceId,
            star,
            color: hostEntry ? hostEntry.color : parentEntry.color,
            trackSlot: hostEntry?.trackSlot || parentEntry.trackSlot || 'center',
        };
        setEntries([...getEntries(), entry]);
        return entry;
    }

    function removeSequence(sequenceId) {
        setEntries(removeEntryBySequence(getEntries(), sequenceId));
    }

    function fixateSequence({ sequence }) {
        const entry = findEntry(sequence.sequenceId);
        if (!entry?.star) return;

        const star = entry.star;
        if (star.flight) {
            if (typeof star.recordRouteSegment === 'function') star.recordRouteSegment(star.flight.route);
            star.time = Math.max(star.time, star.flight.end ?? star.time);
            star.i = star.flight.to;
            star.flight = null;
        }

        const [offsetX, offsetY, mapWidth, mapHeight] = getGeoViewport();
        const [x, y] = projectEquirect(geoStates[star.i].lon, geoStates[star.i].lat, offsetX, offsetY, mapWidth, mapHeight);
        star.headX = x;
        star.headY = y;
        star.trail.push({ x, y, age: 0 });
    }

    function postAnimate({ dt, sequences }) {
        let hasPendingFade = false;
        getEntries().forEach(({ sequenceId, star }) => {
            const sequence = sequences.find(candidate => candidate.sequenceId === sequenceId);
            if (!sequence?.fixated) return;
            if (typeof star.fadeTrail === 'function') {
                hasPendingFade = star.fadeTrail(dt) || hasPendingFade;
                return;
            }
            if (typeof star.hasTransientTrail === 'function') {
                hasPendingFade = star.hasTransientTrail() || hasPendingFade;
            }
        });
        return hasPendingFade;
    }

    function setStickyPaths(stickyPaths) {
        getEntries().forEach(({ star }) => star.setStickyPaths?.(stickyPaths));
    }

    return {
        key: 'geo',
        updatePhase: 'inFlight',
        getEntries,
        init,
        sync,
        updateSequence,
        recordBranchSegment,
        createSplitEntryForSequence,
        removeSequence,
        fixateSequence,
        postAnimate,
        setStickyPaths,
        findEntry,
    };
}
