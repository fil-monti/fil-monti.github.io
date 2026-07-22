export function projectEquirect(lon, lat, offsetX, offsetY, width, height) {
    const x = offsetX + ((lon + 180) / 360) * width;
    const y = offsetY + ((90 - lat) / 180) * height;
    return [x, y];
}
