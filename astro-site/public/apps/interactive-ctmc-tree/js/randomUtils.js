function normalizeSeed(value) {
    const numeric = Number.isFinite(Number(value)) ? Number(value) : 42;
    return (numeric >>> 0);
}

function deriveSeed(baseSeed, streamName) {
    let hash = normalizeSeed(baseSeed) ^ 0x811c9dc5;
    for (const ch of String(streamName)) {
        hash ^= ch.charCodeAt(0);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash >>> 0;
}

export function createSeededRandom(seed = 42) {
    let state = normalizeSeed(seed);

    function setSeed(nextSeed) {
        state = normalizeSeed(nextSeed);
    }

    function random() {
        const a = 1664525;
        const c = 1013904223;
        const m = 2 ** 32;
        state = (a * state + c) % m;
        return state / m;
    }

    function sampleCategorical(probabilities) {
        let remaining = random();
        for (let index = 0; index < probabilities.length; index++) {
            remaining -= probabilities[index];
            if (remaining <= 0) return index;
        }
        return probabilities.length - 1;
    }

    function sampleExp(rate) {
        return -Math.log(1 - random()) / rate;
    }

    return {
        setSeed,
        random,
        sampleCategorical,
        sampleExp,
    };
}

export function createSeededRandomStreams(
    seed = 42,
    streamNames = ['mutation', 'geography', 'hostTransmission', 'hostVisual'],
) {
    let baseSeed = normalizeSeed(seed);
    const names = [...streamNames];
    const streams = Object.fromEntries(
        names.map(name => [name, createSeededRandom(deriveSeed(baseSeed, name))]),
    );

    function setSeed(nextSeed) {
        baseSeed = normalizeSeed(nextSeed);
        names.forEach(name => {
            streams[name].setSeed(deriveSeed(baseSeed, name));
        });
    }

    return {
        streams,
        setSeed,
        getSeed: () => baseSeed,
    };
}
