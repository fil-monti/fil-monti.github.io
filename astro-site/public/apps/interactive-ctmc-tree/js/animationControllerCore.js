import { getTreeBounds } from './treeGeometry.js';
import {
    createBranchSegmentRegistry,
    createSequence,
} from './sequenceSimulation.js';
import {
    createAnimationHistoryState,
    clearAnimationHistory,
    handleTimeTravel as applyTimeTravelToState,
    recordHistorySnapshot,
} from './animationHistory.js';
import { createAnimationControllerProcessRegistry } from './animationControllerProcessRegistry.js';
import { createAnimationSequenceHelpers } from './animationControllerSequenceHelpers.js';

export function createAnimationController({
    getTree,
    findNodeById,
    getNumTips,
    getSeed,
    setSeed,
    initialSequence,
    colors,
    nucleotides,
    geoStates,
    hostStateColors,
    projectEquirect,
    getGeoViewport,
    GeoCTMCStar,
    HostTransmissionCTMC,
    getSpeed,
    getMutationRate,
    getDiffusionRate,
    getTransmissionRate,
    getStickyPaths,
    getTrackAllBranches,
    getTrackAllHostBranches,
    getTrackAllCustomBranches,
    getShowPhylogeography,
    getShowHostTransmission,
    getShowCustomCtmc,
    getCustomCtmcRate,
    getCustomCTMCClass,
    getCustomCTMCStateCount,
    processDefinitions = null,
    getTimeTravelMode,
    random,
    mutationRandom = random,
    hostVisualRandom = random,
    renderCurrentState,
    onPlaybackStateChange,
    simulationStepSec = 1 / 60,
}) {
    const ctmcTransitionSpeed = 0.1;
    const animationHistory = createAnimationHistoryState();
    const branchSegments = createBranchSegmentRegistry();

    let sequences = [];
    let animationFrame = null;
    let historyFrameCounter = 0;
    let nextSequenceId = 0;
    let isPlaying = false;
    let ctmcCurrentNucleotide = null;
    let ctmcPreviousNucleotide = null;
    let ctmcTransitionProgress = 1;
    const nextMutationRandom = typeof mutationRandom === 'function' ? mutationRandom : (() => 0);
    const nextHostVisualRandom = typeof hostVisualRandom === 'function' ? hostVisualRandom : (() => 0);

    const {
        processRegistry,
        getProcessEntriesByStateKey,
        resetEntries,
        getModelEntriesSnapshot,
        getAliasedEntriesSnapshot,
    } = createAnimationControllerProcessRegistry({
        processDefinitions,
        getNumTips,
        hostVisualRandom: nextHostVisualRandom,
        HostTransmissionCTMC,
        hostStateColors,
        getTransmissionRate,
        getShowHostTransmission,
        getTrackAllHostBranches,
        getCustomCTMCClass,
        getCustomCTMCStateCount,
        getCustomCtmcRate,
        getTrackAllCustomBranches,
        getShowCustomCtmc,
        GeoCTMCStar,
        geoStates,
        getTrackAllBranches,
        getShowPhylogeography,
        getStickyPaths,
        getDiffusionRate,
        getGeoViewport,
        projectEquirect,
    });

    function setPlaybackState(nextValue) {
        if (isPlaying === nextValue) return;
        isPlaying = nextValue;
        if (typeof onPlaybackStateChange === 'function') onPlaybackStateChange(isPlaying);
    }

    function getState() {
        const modelEntriesByKey = getModelEntriesSnapshot();
        const aliasedEntries = getAliasedEntriesSnapshot();
        return {
            sequences,
            modelEntriesByKey,
            geoStars: aliasedEntries.geoStars || [],
            hostCTMCs: aliasedEntries.hostCTMCs || [],
            customCTMCs: aliasedEntries.customCTMCs || [],
            ...aliasedEntries,
            branchSegments: branchSegments.maps,
            animationHistory,
            ctmcCurrentNucleotide,
            ctmcPreviousNucleotide,
            ctmcTransitionProgress,
        };
    }

    function buildSequence(x, y, targetX, targetY, sequence, parentNodeId = null, started = false, tracked = false, targetNodeId = null) {
        return createSequence({
            tree: getTree(),
            findNodeById,
            sequenceId: nextSequenceId++,
            x,
            y,
            targetX,
            targetY,
            sequence,
            parentNodeId,
            started,
            tracked,
            targetNodeId,
        });
    }

    function stopPlayback() {
        setPlaybackState(false);
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
    }

    function clearHistory() {
        clearAnimationHistory(animationHistory);
        historyFrameCounter = 0;
    }

    function updateProcessesForPhase(seq, dLenNorm, dt, phase) {
        processRegistry.forEach(process => {
            const updatePhase = process.updatePhase || 'inFlight';
            if (updatePhase !== phase) return;
            process.updateSequence?.({
                sequence: seq,
                dLenNorm,
                dt,
                speed: getSpeed(),
            });
        });
    }

    function setStickyPaths(stickyPaths) {
        processRegistry.forEach(process => process.setStickyPaths?.(stickyPaths));
    }

    const sequenceHelpers = createAnimationSequenceHelpers({
        getTree,
        findNodeById,
        buildSequence,
        getSequences: () => sequences,
        animationHistory,
        processRegistry,
        branchSegments,
        colors,
        nucleotides,
        getMutationRate,
        getSpeed,
        mutationRandom: nextMutationRandom,
        getTimeTravelMode,
        getGeoStars: () => getProcessEntriesByStateKey('geoStars'),
        getHostCTMCs: () => getProcessEntriesByStateKey('hostCTMCs'),
        updateProcessesForPhase,
    });

    function initAnimation() {
        setSeed(getSeed());

        sequences = [];
        resetEntries();
        nextSequenceId = 0;
        historyFrameCounter = 0;
        branchSegments.clear();

        const tree = getTree();
        tree.children.forEach(child => {
            const goesToInternal = child.id === 'internal';
            const seq = buildSequence(tree.x, tree.y, child.x, child.y, initialSequence, 'root', false, goesToInternal, child.id);
            seq.branchIndex = goesToInternal ? 0 : 1;
            seq.trackedGeo = goesToInternal;
            sequences.push(seq);
        });

        ctmcCurrentNucleotide = initialSequence[0];
        ctmcPreviousNucleotide = null;
        ctmcTransitionProgress = 1;

        processRegistry.forEach(process => process.init?.({ sequences }));

        renderCurrentState();
    }

    function recordSnapshotIfNeeded() {
        historyFrameCounter++;
        if (historyFrameCounter % 3 !== 0) return;
        recordHistorySnapshot({
            animationHistory,
            timeTravelMode: getTimeTravelMode(),
            sequences,
            geoStars: getProcessEntriesByStateKey('geoStars'),
            hostCTMCs: getProcessEntriesByStateKey('hostCTMCs'),
            tree: getTree(),
        });
    }

    function animate() {
        if (!isPlaying) return;

        const dt = simulationStepSec;

        recordSnapshotIfNeeded();
        processRegistry.forEach(process => process.sync?.({ sequences }));
        ({
            ctmcCurrentNucleotide,
            ctmcPreviousNucleotide,
            ctmcTransitionProgress,
        } = sequenceHelpers.updateTrackedNucleotideState({
            ctmcCurrentNucleotide,
            ctmcPreviousNucleotide,
            ctmcTransitionProgress,
            ctmcTransitionSpeed,
        }));

        const newSequences = [];
        const tree = getTree();
        const bounds = getTreeBounds(tree);
        const treeHeightPx = Math.max(1e-6, bounds.maxY - tree.y);

        sequences.forEach(seq => {
            if (seq.fixated) {
                seq.mutatedIndices = [];
                newSequences.push(seq);
                return;
            }

            let dLen = 0;
            if (seq.started) {
                const progressIncrement = (5 * getSpeed()) / seq.distance;
                seq.progress += progressIncrement;
                dLen = progressIncrement * seq.distance;
            }
            const dLenNorm = dLen / treeHeightPx;

            updateProcessesForPhase(seq, dLenNorm, dt, 'preFixation');

            if (seq.progress <= 1) {
                sequenceHelpers.updateSequenceInFlight(seq, dLenNorm, dt);
                newSequences.push(seq);
                return;
            }

            branchSegments.finalize(seq);
            const targetNode = sequenceHelpers.findResolvedTargetNode(tree, seq);

            if (targetNode?.children.length > 0) {
                sequenceHelpers.splitSequenceAtInternalNode(seq, targetNode, newSequences);
                return;
            }
            if (targetNode?.children.length === 0) {
                sequenceHelpers.fixateTipSequence(seq, targetNode, newSequences, {
                    onFixate: () => {
                        ctmcTransitionProgress = 1;
                    },
                });
            }
        });

        sequences = newSequences;
        const hasPendingGeoFade = processRegistry.reduce((hasPending, process) => (
            process.postAnimate
                ? process.postAnimate({ dt: dt * getSpeed(), sequences }) || hasPending
                : hasPending
        ), false);
        renderCurrentState();

        const hasActiveSequences = sequences.some(seq => !seq.fixated);
        if (hasActiveSequences || hasPendingGeoFade) {
            animationFrame = requestAnimationFrame(animate);
            return;
        }
        animationFrame = null;
        setPlaybackState(false);
    }

    function startPlayback() {
        if (isPlaying) return;
        if (!sequences.length) initAnimation();
        sequences.forEach(seq => {
            seq.started = true;
        });
        setPlaybackState(true);
        animate();
    }

    function handleTimeTravel(sliderValue) {
        applyTimeTravelToState({
            sliderValue,
            animationHistory,
            sequences,
            geoStars: getProcessEntriesByStateKey('geoStars'),
            hostCTMCs: getProcessEntriesByStateKey('hostCTMCs'),
            tree: getTree(),
            geoStates,
            projectGeoState: stateIndex => projectEquirect(geoStates[stateIndex].lon, geoStates[stateIndex].lat, ...getGeoViewport()),
            setTrackedNucleotide: nucleotide => {
                ctmcCurrentNucleotide = nucleotide;
            },
            renderCurrentState,
        });
    }

    return {
        getState,
        isPlaying: () => isPlaying,
        initAnimation,
        startPlayback,
        stopPlayback,
        clearHistory,
        setStickyPaths,
        handleTimeTravel,
        hasTimeTravelHistory: () => animationHistory.initialized && animationHistory.sequences.size > 0,
    };
}
