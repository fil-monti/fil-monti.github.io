import { createGeoArtworkStore } from './geoArtworkStore.js';

export function createGeoMapRenderer(options = {}) {
    return createGeoArtworkStore(options);
}
