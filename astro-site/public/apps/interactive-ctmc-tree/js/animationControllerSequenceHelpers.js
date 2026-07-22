import { mutateSequence } from './sequenceSimulation.js';
import { recordHistorySnapshot } from './animationHistory.js';

export function createAnimationSequenceHelpers({
    getTree,
    findNodeById,
    buildSequence,
    getSequences,
    animationHistory,
    processRegistry,
    branchSegments,
    colors,
    nucleotides,
    getMutationRate,
    getSpeed,
    mutationRandom,
    getTimeTravelMode,
    getGeoStars,
    getHostCTMCs,
    updateProcessesForPhase,
}) {
    function updateTrackedNucleotideState({
        ctmcCurrentNucleotide,
        ctmcPreviousNucleotide,
        ctmcTransitionProgress,
        ctmcTransitionSpeed,
    }) {
        const trackedSeq = getSequences().find(sequence => sequence.tracked);
        if (!trackedSeq) {
            return {
                ctmcCurrentNucleotide,
                ctmcPreviousNucleotide,
                ctmcTransitionProgress,
            };
        }

        const nucleotide = trackedSeq.sequence[0];
        if (nucleotide && nucleotide !== ctmcCurrentNucleotide) {
            if (ctmcCurrentNucleotide) {
                ctmcPreviousNucleotide = ctmcCurrentNucleotide;
                ctmcTransitionProgress = 0;
            }
            ctmcCurrentNucleotide = nucleotide;
        }
        if (ctmcTransitionProgress < 1) {
            ctmcTransitionProgress = Math.min(1, ctmcTransitionProgress + ctmcTransitionSpeed * getSpeed());
            if (ctmcTransitionProgress >= 1) ctmcPreviousNucleotide = null;
        }

        return {
            ctmcCurrentNucleotide,
            ctmcPreviousNucleotide,
            ctmcTransitionProgress,
        };
    }

    function updateSequenceInFlight(seq, dLenNorm, dt) {
        const tree = getTree();
        const parentNode = seq.parentNodeId ? findNodeById(tree, seq.parentNodeId) : tree;
        const targetNode = seq.targetNodeId ? findNodeById(tree, seq.targetNodeId) : null;
        const startX = parentNode ? parentNode.x : tree.x;
        const startY = parentNode ? parentNode.y : tree.y;

        if (targetNode) {
            seq.targetX = targetNode.x;
            seq.targetY = targetNode.y;
        }
        seq.x = startX + (seq.targetX - startX) * seq.progress;
        seq.y = startY + (seq.targetY - startY) * seq.progress;

        if (seq.started && seq.progress > 0) {
            const mutation = mutateSequence(seq.sequence, {
                mutationRate: getMutationRate(),
                speed: getSpeed(),
                nucleotides,
                random: mutationRandom,
            });
            seq.sequence = mutation.sequence;
            seq.mutatedIndices = mutation.mutatedIndices;
        }

        updateProcessesForPhase(seq, dLenNorm, dt, 'inFlight');

        const nucleotide = seq.sequence[0];
        branchSegments.upsert(seq, 'phylo', nucleotide, colors[nucleotide] || '#000', seq.progress);
        processRegistry.forEach(process => process.recordBranchSegment?.({
            sequence: seq,
            branchSegments,
        }));
    }

    function findResolvedTargetNode(tree, seq) {
        const targetNode = seq.targetNodeId ? findNodeById(tree, seq.targetNodeId) : null;
        if (targetNode) return targetNode;

        function findByXY(node) {
            if (Math.abs(node.x - seq.targetX) < 1 && Math.abs(node.y - seq.targetY) < 1) return node;
            for (const child of node.children) {
                const match = findByXY(child);
                if (match) return match;
            }
            return null;
        }

        return findByXY(tree);
    }

    function splitSequenceAtInternalNode(seq, targetNode, newSequences) {
        const parentHistory = animationHistory.sequences.get(seq.sequenceId) || [];

        targetNode.children.forEach(child => {
            const isTip1 = child.id === 'tip1' || child.label === 'Tip 1';
            const newSeq = buildSequence(
                targetNode.x,
                targetNode.y,
                child.x,
                child.y,
                seq.sequence,
                targetNode.id,
                true,
                seq.tracked && isTip1,
                child.id,
            );
            newSeq.branchIndex = seq.branchIndex;
            newSeq.trackedGeo = seq.trackedGeo && isTip1;
            newSeq.parentSequenceId = seq.sequenceId;

            if (parentHistory.length) {
                animationHistory.sequences.set(newSeq.sequenceId, [...parentHistory]);
            }
            newSequences.push(newSeq);
        });

        targetNode.children.forEach((child, childIndex) => {
            const childSequence = newSequences.find(candidate => (
                candidate.parentSequenceId === seq.sequenceId
                && candidate.targetNodeId === child.id
            ));
            if (!childSequence) return;
            processRegistry.forEach(process => process.createSplitEntryForSequence?.({
                parentSequenceId: seq.sequenceId,
                newSequence: childSequence,
                child,
                childIndex,
            }));
        });

        processRegistry.forEach(process => process.removeSequence?.(seq.sequenceId));
    }

    function fixateTipSequence(seq, targetNode, newSequences, { onFixate = null } = {}) {
        seq.fixated = true;
        seq.x = targetNode.x;
        seq.y = targetNode.y;
        onFixate?.();

        processRegistry.forEach(process => process.fixateSequence?.({
            sequence: seq,
            targetNode,
        }));

        recordHistorySnapshot({
            animationHistory,
            timeTravelMode: getTimeTravelMode(),
            sequences: getSequences(),
            geoStars: getGeoStars(),
            hostCTMCs: getHostCTMCs(),
            tree: getTree(),
        });

        newSequences.push(seq);
    }

    return {
        updateTrackedNucleotideState,
        updateSequenceInFlight,
        findResolvedTargetNode,
        splitSequenceAtInternalNode,
        fixateTipSequence,
    };
}
