import { createDefaultAnimationProcessDefinitions } from './animationProcessDefinitions.js';

export function createAnimationControllerProcessRegistry({
    processDefinitions = null,
    getNumTips,
    hostVisualRandom,
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
}) {
    const defaultProcessDefinitions = createDefaultAnimationProcessDefinitions({
        getNumTips,
        hostVisualRandom,
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

    const registeredProcessDefinitions = Array.isArray(processDefinitions) && processDefinitions.length
        ? processDefinitions
        : defaultProcessDefinitions;

    const processEntriesByKey = Object.fromEntries(
        registeredProcessDefinitions.map(definition => [definition.key, []]),
    );
    const processKeyByStateKey = new Map(
        registeredProcessDefinitions
            .filter(definition => definition?.stateKey)
            .map(definition => [definition.stateKey, definition.key]),
    );

    function getProcessEntriesByKey(key) {
        return processEntriesByKey[key] || [];
    }

    function setProcessEntriesByKey(key, entries) {
        processEntriesByKey[key] = entries;
    }

    function getProcessEntriesByStateKey(stateKey) {
        const key = processKeyByStateKey.get(stateKey);
        return key ? getProcessEntriesByKey(key) : [];
    }

    const processRegistry = registeredProcessDefinitions
        .map(definition => {
            const process = definition.createProcess?.({
                key: definition.key,
                stateKey: definition.stateKey,
                getEntries: () => getProcessEntriesByKey(definition.key),
                setEntries: entries => {
                    setProcessEntriesByKey(definition.key, entries);
                },
                getEntriesByKey: getProcessEntriesByKey,
                getEntriesByStateKey: getProcessEntriesByStateKey,
            });
            if (!process) return null;
            return {
                ...process,
                key: process.key || definition.key,
                stateKey: definition.stateKey,
            };
        })
        .filter(Boolean);

    function resetEntries() {
        Object.keys(processEntriesByKey).forEach(key => {
            processEntriesByKey[key] = [];
        });
    }

    function getModelEntriesSnapshot() {
        return Object.fromEntries(
            Object.keys(processEntriesByKey).map(key => [key, getProcessEntriesByKey(key)]),
        );
    }

    function getAliasedEntriesSnapshot() {
        return Object.fromEntries(
            registeredProcessDefinitions
                .filter(definition => definition?.stateKey)
                .map(definition => [definition.stateKey, getProcessEntriesByKey(definition.key)]),
        );
    }

    return {
        processRegistry,
        registeredProcessDefinitions,
        getProcessEntriesByStateKey,
        resetEntries,
        getModelEntriesSnapshot,
        getAliasedEntriesSnapshot,
    };
}
