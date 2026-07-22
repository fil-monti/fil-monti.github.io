export function createAnimationHistoryState() {
    return {
        sequences: new Map(),
        initialized: false,
        maxProgress: 0,
    };
}

export function clearAnimationHistory(history) {
    history.sequences.clear();
    history.initialized = false;
    history.maxProgress = 0;
}

export function calculateTreeDepth(tree) {
    let maxDepth = 0;

    function traverse(node, depth) {
        if (!node.children.length) {
            maxDepth = Math.max(maxDepth, depth);
            return;
        }
        node.children.forEach(child => {
            traverse(child, depth + Math.hypot(child.x - node.x, child.y - node.y));
        });
    }

    traverse(tree, 0);
    return maxDepth;
}

export function recordHistorySnapshot({
    animationHistory,
    timeTravelMode,
    sequences,
    geoStars,
    hostCTMCs,
    tree,
}) {
    if (timeTravelMode) return;

    const maxDistance = calculateTreeDepth(tree);
    sequences.forEach(sequence => {
        if (!animationHistory.sequences.has(sequence.sequenceId)) {
            animationHistory.sequences.set(sequence.sequenceId, []);
        }
        const history = animationHistory.sequences.get(sequence.sequenceId);
        const geoObject = geoStars.find(starState => starState.sequenceId === sequence.sequenceId);
        const hostObject = hostCTMCs.find(hostState => hostState.sequenceId === sequence.sequenceId);
        const geoState = geoObject ? geoObject.star.i : 0;
        const hostState = hostObject ? hostObject.ctmc.i : 0;
        const progress = Math.min(1.0, Math.hypot(sequence.x - tree.x, sequence.y - tree.y) / maxDistance);
        if (!history.length || Math.abs(history[history.length - 1].progress - progress) > 0.01 || sequence.fixated) {
            history.push({
                progress,
                sequence: [...sequence.sequence],
                x: sequence.x,
                y: sequence.y,
                geoState,
                hostState,
                fixated: sequence.fixated,
            });
            animationHistory.maxProgress = Math.max(animationHistory.maxProgress, progress);
        }
    });
    animationHistory.initialized = true;
}

export function getHistoryAtTime(animationHistory, sequenceId, timePos) {
    const history = animationHistory.sequences.get(sequenceId);
    if (!history?.length) return null;
    return history.reduce(
        (best, snapshot) => Math.abs(snapshot.progress - timePos) < Math.abs(best.progress - timePos) ? snapshot : best,
        history[0],
    );
}

export function handleTimeTravel({
    sliderValue,
    animationHistory,
    sequences,
    geoStars,
    hostCTMCs,
    tree,
    geoStates,
    projectGeoState,
    setTrackedNucleotide,
    renderCurrentState,
}) {
    if (!animationHistory.initialized || !animationHistory.sequences.size) return;

    const timePos = (sliderValue / 100) * animationHistory.maxProgress;
    let internalNodeProgress = 0.5;
    sequences.forEach(sequence => {
        if (sequence.parentSequenceId !== null) {
            const history = animationHistory.sequences.get(sequence.sequenceId);
            if (history?.length) internalNodeProgress = Math.max(internalNodeProgress, history[0].progress);
        }
    });

    sequences.forEach(sequence => {
        let snapshot = getHistoryAtTime(animationHistory, sequence.sequenceId, timePos);
        const tip2 = tree.children[0]?.children[1];
        const leadsToTip2 = tip2 && (
            sequence.id === 'tip2' ||
            sequence.label === 'Tip 2' ||
            (Math.abs(sequence.targetX - tip2.x) < 1 && Math.abs(sequence.targetY - tip2.y) < 1)
        );

        if (leadsToTip2 && timePos < internalNodeProgress * 0.95) {
            sequence.hideInTimeTravel = true;
            return;
        }
        sequence.hideInTimeTravel = false;

        if (!snapshot && sequence.parentSequenceId !== null && !leadsToTip2) {
            snapshot = getHistoryAtTime(animationHistory, sequence.parentSequenceId, timePos);
        }
        if (!snapshot) return;

        sequence.x = snapshot.x;
        sequence.y = snapshot.y;
        sequence.sequence = [...snapshot.sequence];
        sequence.fixated = snapshot.fixated;

        const geoObject = geoStars.find(starState => starState.sequenceId === sequence.sequenceId);
        if (geoObject) {
            const star = geoObject.star;
            star.i = snapshot.geoState;
            const [x, y] = projectGeoState(snapshot.geoState, geoStates[star.i]);
            star.headX = x;
            star.headY = y;
        }

        const hostObject = hostCTMCs.find(hostState => hostState.sequenceId === sequence.sequenceId);
        if (hostObject) hostObject.ctmc.i = snapshot.hostState;
    });

    const trackedSequence = sequences.find(sequence => sequence.tracked && !sequence.hideInTimeTravel);
    if (trackedSequence) setTrackedNucleotide(trackedSequence.sequence[0]);
    renderCurrentState();
}
