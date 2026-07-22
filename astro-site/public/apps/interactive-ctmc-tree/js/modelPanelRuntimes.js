import {
    drawCTMCPanel,
    drawCTMCLegend,
    createHostTransmissionRenderer,
    drawGeoLocationLabel,
    drawGeoPanel,
    drawLocationBadge,
} from './panelRenderers.js';
import {
    cloneFigureEntryForRender,
    cloneGeoEntryForRender,
} from './appSnapshots.js';

function resolveEntries(snapshot, getEntries) {
    const entries = typeof getEntries === 'function' ? getEntries(snapshot) : [];
    return Array.isArray(entries) ? entries : [];
}

function findSequenceById(sequences, sequenceId) {
    return sequences.find(sequence => sequence.sequenceId === sequenceId) || null;
}

function shouldRenderGeoSequence(sequence, trackAllBranches) {
    return Boolean(sequence) && !sequence.hideInTimeTravel && (trackAllBranches || sequence.trackedGeo);
}

export function createFigureModelRuntime({
    id,
    getEntries,
    getRenderer,
    snapshotKey = null,
    snapshotEntry = cloneFigureEntryForRender,
    isPanelVisible = () => true,
    isTreeVisible = isPanelVisible,
    getTrackAllBranches = () => false,
    treeMarkerPhase = null,
}) {
    function drawPanel({
        ctx,
        snapshot,
        sequences,
        appState,
        canvasWidth,
        panelView,
    }) {
        if (!isPanelVisible(appState)) return false;

        const renderer = getRenderer?.();
        const entries = resolveEntries(snapshot, getEntries);
        if (!renderer || !entries.length || typeof renderer.drawPanel !== 'function') return false;

        renderer.drawPanel({
            ctx,
            ctmcEntries: entries,
            sequences,
            trackAllBranches: !!getTrackAllBranches(appState),
            canvasWidth,
            panelView,
        });
        return true;
    }

    function drawTreeLayer(expectedPhase, {
        ctx,
        snapshot,
        sequences,
        appState,
        nTips,
    }) {
        if (treeMarkerPhase !== expectedPhase || !isTreeVisible(appState)) return false;

        const renderer = getRenderer?.();
        const entries = resolveEntries(snapshot, getEntries);
        if (!renderer || !entries.length || typeof renderer.drawTreeMarkers !== 'function') return false;

        renderer.drawTreeMarkers({
            ctx,
            sequences,
            ctmcEntries: entries,
            trackAllBranches: !!getTrackAllBranches(appState),
            nTips,
        });
        return true;
    }

    return {
        id,
        exportSnapshot(rawState, snapshot) {
            if (!snapshotKey) return;
            snapshot[snapshotKey] = resolveEntries(rawState, getEntries).map(entry => snapshotEntry(entry));
        },
        drawPanel,
        drawTreeBackdrop(args) {
            return drawTreeLayer('backdrop', args);
        },
        drawTreeOverlay(args) {
            return drawTreeLayer('overlay', args);
        },
    };
}

export function createPhyloModelRuntime({
    colors,
    drawCTMCPanelFn = drawCTMCPanel,
    drawCTMCLegendFn = drawCTMCLegend,
    isPanelVisible = appState => appState.showPhylogenetics && appState.showPhyloPanel,
}) {
    return {
        id: 'phylo',
        drawPanel({
            ctx,
            snapshot,
            appState,
            panelView,
        }) {
            if (!isPanelVisible(appState)) return false;

            drawCTMCPanelFn({
                ctx,
                panelView,
                colors,
                currentNucleotide: snapshot.ctmcCurrentNucleotide,
                previousNucleotide: snapshot.ctmcPreviousNucleotide,
                transitionProgress: snapshot.ctmcTransitionProgress,
            });
            drawCTMCLegendFn({ ctx, panelView, colors });
            return true;
        },
        drawTreeBackdrop: () => false,
        drawTreeOverlay: () => false,
    };
}

export function createGeoModelRuntime({
    geoMap,
    getEntries = snapshot => snapshot.geoStars,
    snapshotKey = 'geoStars',
    isPanelVisible = appState => appState.showPhylogeography && appState.showGeoPanel,
    isTreeVisible = appState => appState.showPhylogeography,
    getTrackAllBranches = appState => appState.trackAllBranches,
    drawGeoPanelFn = drawGeoPanel,
    drawLocationBadgeFn = drawLocationBadge,
    drawGeoLocationLabelFn = drawGeoLocationLabel,
    drawVirus = null,
}) {
    function drawPanel({
        ctx,
        snapshot,
        sequences,
        appState,
        canvasWidth,
        panelView,
    }) {
        if (!isPanelVisible(appState)) return false;

        const geoStars = resolveEntries(snapshot, getEntries);
        drawGeoPanelFn({
            ctx,
            geoMap,
            geoStars,
            sequences,
            trackAllBranches: !!getTrackAllBranches(appState),
            canvasWidth,
            panelView,
            drawVirus,
        });
        return true;
    }

    function drawTreeBackdrop({
        ctx,
        snapshot,
        sequences,
        appState,
        nTips,
    }) {
        if (!isTreeVisible(appState)) return false;

        const geoStars = resolveEntries(snapshot, getEntries);
        if (!geoStars.length) return false;

        const trackAllBranches = !!getTrackAllBranches(appState);
        let drewAnything = false;

        geoStars.forEach(({ sequenceId, star }) => {
            const sequence = findSequenceById(sequences, sequenceId);
            if (!shouldRenderGeoSequence(sequence, trackAllBranches)) return;

            if (appState.drawLocations) {
                drawLocationBadgeFn({
                    ctx,
                    geoMap,
                    seqX: sequence.x,
                    seqY: sequence.y,
                    locationName: star.currentStateName(),
                    nTips,
                });
            } else {
                drawGeoLocationLabelFn({
                    ctx,
                    seq: sequence,
                    stateName: star.currentStateName(),
                    nTips,
                });
            }
            drewAnything = true;
        });

        return drewAnything;
    }

    return {
        id: 'geo',
        exportSnapshot(rawState, snapshot) {
            snapshot[snapshotKey] = resolveEntries(rawState, getEntries).map(entry => cloneGeoEntryForRender(entry));
        },
        drawPanel,
        drawTreeBackdrop,
        drawTreeOverlay: () => false,
    };
}

export function createHostModelRuntime({
    hostStates,
    drawVirus,
    hostIconByName,
}) {
    const renderer = createHostTransmissionRenderer({
        hostStates,
        drawVirus,
        hostIconByName,
    });

    return createFigureModelRuntime({
        id: 'host',
        getEntries: snapshot => snapshot.hostCTMCs,
        getRenderer: () => renderer,
        snapshotKey: 'hostCTMCs',
        isPanelVisible: appState => appState.showHostTransmission && appState.showHostPanel,
        isTreeVisible: appState => appState.showHostTransmission,
        getTrackAllBranches: appState => appState.trackAllHostBranches,
        treeMarkerPhase: 'overlay',
    });
}
