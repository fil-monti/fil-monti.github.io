import {
    createAnimationProcessDefinitionsFromModelManifests,
    createDefaultModelManifests,
} from './modelManifests.js';

export function createDefaultAnimationProcessDefinitions(options = {}) {
    return createAnimationProcessDefinitionsFromModelManifests(
        createDefaultModelManifests(options),
    );
}
