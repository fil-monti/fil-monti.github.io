import { CANVAS_GEO_SPECIAL_COLORS, CANVAS_GEO_STATE_COLORS } from './canvasPalette.js';

const GEO_CLASS_STROKE = '#8398ab';
const UNCOLORED_LAND_FILL = CANVAS_GEO_SPECIAL_COLORS.uncoloredLand;
const ANTARCTICA_GEO_CLASS = 'c-antarctica';
const UNKNOWN_GEO_CLASS = 'c-unknown';
const REGION_VECTOR_TRIM = Object.freeze({
    'c-asia': { minX: 620, minY: 72, maxX: 1045, maxY: 395 },
    'c-oceania': { minX: 900, minY: 315, maxX: 1115, maxY: 535 },
});
const REGION_BADGE_PADDING_SCALE = Object.freeze({
    'c-asia': 0.72,
});
const REGION_BADGE_SHIFT = Object.freeze({
    Australia: 18,
});
const REGION_TO_GEO_CLASS = Object.freeze({
    'North America': 'c-n-america',
    'South America': 'c-s-america',
    'Europe': 'c-europe',
    'Africa': 'c-africa',
    'Middle East': 'c-asia',
    'East Asia': 'c-asia',
    'Australia': 'c-oceania',
});

export function createGeoMapConfig(geoStates = []) {
    const geoClassFill = Object.freeze({
        'c-europe': geoStates.find(state => state.name === 'Europe')?.color || CANVAS_GEO_STATE_COLORS['Europe'],
        'c-asia': geoStates.find(state => state.name === 'East Asia')?.color || CANVAS_GEO_STATE_COLORS['East Asia'],
        'c-africa': geoStates.find(state => state.name === 'Africa')?.color || CANVAS_GEO_STATE_COLORS['Africa'],
        'c-n-america': geoStates.find(state => state.name === 'North America')?.color || CANVAS_GEO_STATE_COLORS['North America'],
        'c-s-america': geoStates.find(state => state.name === 'South America')?.color || CANVAS_GEO_STATE_COLORS['South America'],
        'c-oceania': geoStates.find(state => state.name === 'Australia')?.color || CANVAS_GEO_STATE_COLORS['Australia'],
        [ANTARCTICA_GEO_CLASS]: CANVAS_GEO_SPECIAL_COLORS.antarctica,
        [UNKNOWN_GEO_CLASS]: CANVAS_GEO_SPECIAL_COLORS.unknown,
    });
    const plainGeoClassFill = Object.freeze({
        'c-europe': UNCOLORED_LAND_FILL,
        'c-asia': UNCOLORED_LAND_FILL,
        'c-africa': UNCOLORED_LAND_FILL,
        'c-n-america': UNCOLORED_LAND_FILL,
        'c-s-america': UNCOLORED_LAND_FILL,
        'c-oceania': UNCOLORED_LAND_FILL,
        [ANTARCTICA_GEO_CLASS]: CANVAS_GEO_SPECIAL_COLORS.antarctica,
        [UNKNOWN_GEO_CLASS]: CANVAS_GEO_SPECIAL_COLORS.unknown,
    });

    function resolveGeoClassFill(className, { colored = true } = {}) {
        const palette = colored ? geoClassFill : plainGeoClassFill;
        return palette[className] || palette[UNKNOWN_GEO_CLASS] || CANVAS_GEO_SPECIAL_COLORS.unknown;
    }

    return {
        geoClassFill,
        plainGeoClassFill,
        geoClassStroke: GEO_CLASS_STROKE,
        uncoloredLandFill: UNCOLORED_LAND_FILL,
        antarcticaGeoFill: CANVAS_GEO_SPECIAL_COLORS.antarctica,
        unknownGeoFill: CANVAS_GEO_SPECIAL_COLORS.unknown,
        regionVectorTrim: REGION_VECTOR_TRIM,
        regionBadgePaddingScale: REGION_BADGE_PADDING_SCALE,
        regionToGeoClass: REGION_TO_GEO_CLASS,
        resolveGeoClassFill,
        getRegionGeoClasses() {
            return [...new Set(Object.values(REGION_TO_GEO_CLASS))];
        },
        getBadgeShift(locationName) {
            return REGION_BADGE_SHIFT[locationName] || 0;
        },
    };
}
