function computeCircularArc(A, B, radiusFactor = 1.3, concaveUp = true) {
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 1e-6) return { type: 'line', A, B };

    const radius = Math.max(1.01, radiusFactor) * (distance / 2);
    const midX = (A.x + B.x) / 2;
    const midY = (A.y + B.y) / 2;
    const unitX = -dy / distance;
    const unitY = dx / distance;
    const height = Math.sqrt(Math.max(0, radius * radius - (distance / 2) ** 2));
    const centerOption1 = { x: midX + height * unitX, y: midY + height * unitY };
    const centerOption2 = { x: midX - height * unitX, y: midY - height * unitY };
    const center = concaveUp
        ? (centerOption1.y < centerOption2.y ? centerOption1 : centerOption2)
        : (centerOption1.y > centerOption2.y ? centerOption1 : centerOption2);

    const a0 = Math.atan2(A.y - center.y, A.x - center.x);
    const a1 = Math.atan2(B.y - center.y, B.x - center.x);
    let da = a1 - a0;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;

    return { type: 'arc', A, B, C: center, R: radius, a0, da };
}

export function createGeoRouteBuilder({ geoStates, projectGeoState }) {
    const routeCache = new Map();

    function buildRouteKey(i, j, radiusFactor, offsetX, offsetY, mapWidth, mapHeight) {
        return [i, j, radiusFactor, offsetX, offsetY, mapWidth, mapHeight].join(':');
    }

    function getRoute(i, j, radiusFactor, offsetX, offsetY, mapWidth, mapHeight) {
        const cacheKey = buildRouteKey(i, j, radiusFactor, offsetX, offsetY, mapWidth, mapHeight);
        if (routeCache.has(cacheKey)) return routeCache.get(cacheKey);

        const fromState = geoStates[i];
        const toState = geoStates[j];
        const [fromX, fromY] = projectGeoState(fromState, offsetX, offsetY, mapWidth, mapHeight);
        const [toX, toY] = projectGeoState(toState, offsetX, offsetY, mapWidth, mapHeight);
        const averageLatitude = (fromState.lat + toState.lat) / 2;
        const route = computeCircularArc(
            { x: fromX, y: fromY },
            { x: toX, y: toY },
            radiusFactor,
            averageLatitude < 0,
        );

        routeCache.set(cacheKey, route);
        return route;
    }

    function clearCache() {
        routeCache.clear();
    }

    return {
        getRoute,
        clearCache,
    };
}
