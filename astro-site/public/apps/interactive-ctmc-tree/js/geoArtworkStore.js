import { createGeoMapConfig } from './geoMapConfig.js';
import { CANVAS_NEUTRALS } from './canvasPalette.js';
import {
    applyGeoStatePalette,
    applyOceanBorderPalette,
    applyOceanPalette,
    applyUniformLandPalette,
    buildGeoSvgMarkup,
    cloneSvgNode,
    drawFallbackOcean,
    svgMarkupToImage,
} from './geoSvgUtils.js';

export function createGeoArtworkStore({
    geoStates,
    getViewport,
    getShowChoroplethMap,
    geoHtmlPath = './assets/geo.html',
}) {
    let choroplethCache = null;
    let plainMapCache = null;
    let geoArtwork = null;
    let geoArtworkLoad = null;
    let geoArtworkError = null;

    const silhouetteCache = new Map();
    const config = createGeoMapConfig(geoStates);

    function invalidateCaches() {
        choroplethCache = null;
        plainMapCache = null;
        geoArtworkError = null;
    }

    function selectRegionComponents(_className, components) {
        return components;
    }

    function reassignRussiaToAsia(sourceSvg) {
        const scratch = cloneSvgNode(sourceSvg);
        scratch.style.position = 'absolute';
        scratch.style.left = '-99999px';
        scratch.style.top = '-99999px';
        scratch.style.width = '1200px';
        scratch.style.height = '620px';
        scratch.style.pointerEvents = 'none';
        document.body.appendChild(scratch);

        try {
            const europePaths = Array.from(scratch.querySelectorAll('.country.c-europe'));
            let bestPath = null;
            let bestScore = -Infinity;

            for (const path of europePaths) {
                let box;
                try {
                    box = path.getBBox();
                } catch {
                    continue;
                }
                if (!box || box.width < 120 || box.height < 25) continue;

                const centerX = box.x + box.width / 2;
                const centerY = box.y + box.height / 2;
                const score =
                    box.width * 3 +
                    Math.max(0, centerX - 700) * 2 -
                    centerY * 0.8 +
                    Math.max(0, box.height - 35);

                if (score > bestScore) {
                    bestScore = score;
                    bestPath = path;
                }
            }

            if (!bestPath) return;

            const allEurope = Array.from(sourceSvg.querySelectorAll('.country.c-europe'));
            const index = europePaths.indexOf(bestPath);
            const sourcePath = index >= 0 ? allEurope[index] : null;
            if (!sourcePath) return;

            sourcePath.classList.remove('c-europe');
            sourcePath.classList.add('c-asia');
        } finally {
            scratch.remove();
        }
    }

    async function loadGeoArtwork() {
        if (geoArtwork) return geoArtwork;
        if (geoArtworkLoad) return geoArtworkLoad;

        geoArtworkLoad = (async () => {
            const response = await fetch(geoHtmlPath);
            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const sourceSvg = doc.querySelector('svg');
            if (!sourceSvg) throw new Error('No SVG found in geo.html');

            const sourceStyle = doc.querySelector('style');
            reassignRussiaToAsia(sourceSvg);

            const defs = sourceSvg.querySelector('defs');
            const sphere = sourceSvg.querySelector('.sphere');
            const border = sourceSvg.querySelector('.sphere-border');
            const countryPaths = Array.from(sourceSvg.querySelectorAll('.country'));

            const scratch = cloneSvgNode(sourceSvg);
            scratch.style.position = 'absolute';
            scratch.style.left = '-99999px';
            scratch.style.top = '-99999px';
            scratch.style.width = '1200px';
            scratch.style.height = '620px';
            scratch.style.pointerEvents = 'none';
            document.body.appendChild(scratch);

            const fullMarkup = buildGeoSvgMarkup(sourceSvg, svg => {
                if (sourceStyle) svg.appendChild(cloneSvgNode(sourceStyle));
                if (defs) svg.appendChild(cloneSvgNode(defs));
                if (sphere) svg.appendChild(applyOceanPalette(cloneSvgNode(sphere)));
                countryPaths.forEach(path => svg.appendChild(applyGeoStatePalette(cloneSvgNode(path), config)));
                if (border) svg.appendChild(applyOceanBorderPalette(cloneSvgNode(border)));
            });

            const plainMarkup = buildGeoSvgMarkup(sourceSvg, svg => {
                if (sourceStyle) svg.appendChild(cloneSvgNode(sourceStyle));
                if (defs) svg.appendChild(cloneSvgNode(defs));
                if (sphere) svg.appendChild(applyOceanPalette(cloneSvgNode(sphere)));
                countryPaths.forEach(path => svg.appendChild(applyUniformLandPalette(cloneSvgNode(path), config)));
                if (border) svg.appendChild(applyOceanBorderPalette(cloneSvgNode(border)));
            });

            const continentMarkup = new Map();
            const continentVectors = new Map();
            for (const className of config.getRegionGeoClasses()) {
                const classPaths = countryPaths.filter(path => path.classList.contains(className));
                if (!classPaths.length) continue;

                continentMarkup.set(className, buildGeoSvgMarkup(sourceSvg, svg => {
                    if (sourceStyle) svg.appendChild(cloneSvgNode(sourceStyle));
                    if (defs) svg.appendChild(cloneSvgNode(defs));
                    classPaths.forEach(path => svg.appendChild(applyGeoStatePalette(cloneSvgNode(path), config)));
                }));

                const scratchPaths = Array.from(scratch.querySelectorAll(`.country.${className}`));
                const components = [];
                scratchPaths.forEach(path => {
                    const d = path.getAttribute('d');
                    if (!d) return;
                    try {
                        const box = path.getBBox();
                        components.push({
                            d,
                            bbox: {
                                minX: box.x,
                                minY: box.y,
                                maxX: box.x + box.width,
                                maxY: box.y + box.height,
                            },
                        });
                    } catch {
                        // Ignore paths that do not expose a usable bounding box.
                    }
                });

                const kept = selectRegionComponents(className, components);
                if (!kept.length) continue;

                let minX = Infinity;
                let minY = Infinity;
                let maxX = -Infinity;
                let maxY = -Infinity;
                const pathData = [];

                kept.forEach(component => {
                    pathData.push(component.d);
                    minX = Math.min(minX, component.bbox.minX);
                    minY = Math.min(minY, component.bbox.minY);
                    maxX = Math.max(maxX, component.bbox.maxX);
                    maxY = Math.max(maxY, component.bbox.maxY);
                });

                continentVectors.set(className, {
                    paths: pathData,
                    bbox: { minX, minY, maxX, maxY },
                });
            }

            scratch.remove();

            geoArtwork = {
                fullImage: await svgMarkupToImage(fullMarkup),
                plainImage: await svgMarkupToImage(plainMarkup),
                continentMarkup,
                continentVectors,
                continentImages: new Map(),
            };
            geoArtworkError = null;
            return geoArtwork;
        })();

        try {
            return await geoArtworkLoad;
        } catch (error) {
            geoArtworkError = error;
            throw error;
        } finally {
            geoArtworkLoad = null;
        }
    }

    async function ensureContinentImage(className) {
        const artwork = await loadGeoArtwork();
        if (artwork.continentImages.has(className)) {
            return artwork.continentImages.get(className);
        }

        const markup = artwork.continentMarkup.get(className);
        if (!markup) return null;

        const image = await svgMarkupToImage(markup);
        artwork.continentImages.set(className, image);
        return image;
    }

    async function preloadAll() {
        await loadGeoArtwork();
        await Promise.all(config.getRegionGeoClasses().map(className => ensureContinentImage(className)));
        return geoArtwork;
    }

    function buildChoroplethCache(width, height) {
        if (!geoArtwork?.fullImage) return null;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(width));
        canvas.height = Math.max(1, Math.floor(height));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(geoArtwork.fullImage, 0, 0, canvas.width, canvas.height);
        return { canvas, w: canvas.width, h: canvas.height };
    }

    function buildPlainMapCache(width, height) {
        const image = geoArtwork?.plainImage || geoArtwork?.fullImage;
        if (!image) return null;

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(width));
        canvas.height = Math.max(1, Math.floor(height));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        return { canvas, w: canvas.width, h: canvas.height };
    }

    function prebuildPanelCaches() {
        const [, , mapWidth, mapHeight] = getViewport();
        plainMapCache = buildPlainMapCache(mapWidth, mapHeight);
        choroplethCache = buildChoroplethCache(mapWidth, mapHeight);
    }

    function drawChoroplethInRect(ctx, x, y, width, height) {
        if (!getShowChoroplethMap()) return false;

        const w = Math.max(1, Math.floor(width));
        const h = Math.max(1, Math.floor(height));
        if (!choroplethCache || choroplethCache.w !== w || choroplethCache.h !== h) {
            choroplethCache = buildChoroplethCache(w, h);
        }

        if (choroplethCache?.canvas) {
            ctx.drawImage(choroplethCache.canvas, x, y, width, height);
            return true;
        }

        if (geoArtwork?.fullImage) {
            ctx.drawImage(geoArtwork.fullImage, x, y, width, height);
            return true;
        }

        return false;
    }

    function drawPanelBackground(ctx) {
        const [offsetX, offsetY, mapWidth, mapHeight] = getViewport();

        if (getShowChoroplethMap()) {
            if (!geoArtwork && !geoArtworkLoad && !geoArtworkError) {
                loadGeoArtwork().catch(err => console.warn('loadGeoArtwork:', err));
            }
            const drewChoropleth = drawChoroplethInRect(ctx, offsetX, offsetY, mapWidth, mapHeight);
            if (!drewChoropleth) {
                drawFallbackOcean(ctx, offsetX, offsetY, mapWidth, mapHeight, {
                    fill: CANVAS_NEUTRALS.oceanChoroplethFallback,
                });
            }
        } else if (plainMapCache?.canvas) {
            ctx.drawImage(plainMapCache.canvas, offsetX, offsetY, mapWidth, mapHeight);
        } else if (geoArtwork?.plainImage || geoArtwork?.fullImage) {
            ctx.drawImage(geoArtwork.plainImage || geoArtwork.fullImage, offsetX, offsetY, mapWidth, mapHeight);
        } else {
            drawFallbackOcean(ctx, offsetX, offsetY, mapWidth, mapHeight);
        }

        return { offsetX, offsetY, mapWidth, mapHeight };
    }

    function buildSilhouetteForContinent(continentName, targetW = 120, targetH = 60) {
        const cacheKey = `${continentName}:${targetW}x${targetH}:${getShowChoroplethMap() ? 'colored' : 'plain'}`;
        if (silhouetteCache.has(cacheKey)) return silhouetteCache.get(cacheKey);

        const className = config.regionToGeoClass[continentName];
        const vector = className ? geoArtwork?.continentVectors?.get(className) : null;
        if (!vector) return null;

        const trim = config.regionVectorTrim[className];
        const minX = trim ? Math.max(vector.bbox.minX, trim.minX) : vector.bbox.minX;
        const minY = trim ? Math.max(vector.bbox.minY, trim.minY) : vector.bbox.minY;
        const maxX = trim ? Math.min(vector.bbox.maxX, trim.maxX) : vector.bbox.maxX;
        const maxY = trim ? Math.min(vector.bbox.maxY, trim.maxY) : vector.bbox.maxY;
        if (!(maxX > minX && maxY > minY)) return null;

        const cropW = Math.max(1, maxX - minX);
        const cropH = Math.max(1, maxY - minY);
        const renderScale = 3;
        const outW = Math.max(1, Math.round(targetW * renderScale));
        const outH = Math.max(1, Math.round(targetH * renderScale));
        const pad = 10 * renderScale * (config.regionBadgePaddingScale[className] || 1);
        const scale = Math.min(
            (outW - pad * 2) / cropW,
            (outH - pad * 2) / cropH,
        );
        const drawW = Math.max(1, cropW * scale);
        const drawH = Math.max(1, cropH * scale);
        const dx = (outW - drawW) / 2;
        const dy = (outH - drawH) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, outW, outH);
        ctx.save();
        ctx.beginPath();
        ctx.rect(dx, dy, drawW, drawH);
        ctx.clip();
        ctx.save();
        ctx.translate(dx - minX * scale, dy - minY * scale);
        ctx.scale(scale, scale);
        ctx.fillStyle = config.resolveGeoClassFill(className, {
            colored: getShowChoroplethMap(),
        });
        vector.paths.forEach(d => {
            const path = new Path2D(d);
            ctx.fill(path);
        });
        ctx.restore();
        ctx.restore();

        const silhouette = { canvas, w: outW, h: outH };
        silhouetteCache.set(cacheKey, silhouette);
        return silhouette;
    }

    return {
        preloadAll,
        invalidateCaches,
        prebuildPanelCaches,
        drawPanelBackground,
        buildSilhouetteForContinent,
        getBadgeShift: config.getBadgeShift,
    };
}
