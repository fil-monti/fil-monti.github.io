export function stableHash(value) {
    return Math.abs(
        String(value).split('').reduce((accumulator, character) => {
            return ((accumulator << 5) - accumulator) + character.charCodeAt(0);
        }, 0),
    );
}

export function getMarkerSideForKey(key) {
    return stableHash(key) % 2 === 0 ? 'left' : 'right';
}

export function getStableJitter(identifier, maxOffset = 8) {
    const hash = stableHash(identifier);
    const angle = (hash % 360) * Math.PI / 180;
    const distance = ((hash % 100) / 100) * maxOffset;
    return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
    };
}
