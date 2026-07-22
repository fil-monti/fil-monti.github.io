import { CANVAS_NEUTRALS } from './canvasPalette.js';

export function drawFallbackOcean(ctx, x, y, width, height, {
    fill = CANVAS_NEUTRALS.ocean,
} = {}) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height / 2, width * 0.49, height * 0.49, 0, 0, Math.PI * 2);
    ctx.fill();
}

export function svgMarkupToImage(markup) {
    return new Promise((resolve, reject) => {
        const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = error => {
            URL.revokeObjectURL(url);
            reject(error);
        };
        image.src = url;
    });
}

export function cloneSvgNode(node) {
    return node.cloneNode(true);
}

export function buildGeoSvgMarkup(sourceSvg, bodyBuilder) {
    const svg = cloneSvgNode(sourceSvg);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    bodyBuilder(svg);
    return new XMLSerializer().serializeToString(svg);
}

export function applyGeoStatePalette(pathNode, config) {
    const className = [...pathNode.classList].find(cls => cls.startsWith('c-'));
    if (!className) return pathNode;

    const fill = typeof config?.resolveGeoClassFill === 'function'
        ? config.resolveGeoClassFill(className, { colored: true })
        : (config?.geoClassFill?.[className] || CANVAS_NEUTRALS.subtle);
    const strokeWidth = className === 'c-antarctica' ? '0.5' : '0.8';
    const existingStyle = pathNode.getAttribute('style');
    const paletteStyle = `fill:${fill};stroke:${config.geoClassStroke};stroke-width:${strokeWidth};stroke-linejoin:round;stroke-linecap:round;`;
    pathNode.setAttribute('style', existingStyle ? `${existingStyle};${paletteStyle}` : paletteStyle);
    return pathNode;
}

export function applyUniformLandPalette(pathNode, config) {
    const className = [...pathNode.classList].find(cls => cls.startsWith('c-'));
    if (!className) return pathNode;

    const strokeWidth = className === 'c-antarctica' ? '0.5' : '0.8';
    const existingStyle = pathNode.getAttribute('style');
    const fill = typeof config?.resolveGeoClassFill === 'function'
        ? config.resolveGeoClassFill(className, { colored: false })
        : config?.uncoloredLandFill;
    const landStyle = `fill:${fill};stroke:${config.geoClassStroke};stroke-width:${strokeWidth};stroke-linejoin:round;stroke-linecap:round;`;
    pathNode.setAttribute('style', existingStyle ? `${existingStyle};${landStyle}` : landStyle);
    return pathNode;
}

export function applyOceanPalette(node) {
    const existingStyle = node.getAttribute('style');
    const oceanStyle = `fill:${CANVAS_NEUTRALS.ocean};stroke:none;`;
    node.setAttribute('style', existingStyle ? `${existingStyle};${oceanStyle}` : oceanStyle);
    return node;
}

export function applyOceanBorderPalette(node) {
    const existingStyle = node.getAttribute('style');
    const borderStyle = `fill:none;stroke:${CANVAS_NEUTRALS.oceanBorder};stroke-width:1;`;
    node.setAttribute('style', existingStyle ? `${existingStyle};${borderStyle}` : borderStyle);
    return node;
}
