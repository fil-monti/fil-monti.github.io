function clampIndex(index, count) {
    const nextIndex = Number.isFinite(index) ? (index | 0) : 0;
    return Math.max(0, Math.min(count - 1, nextIndex));
}

function clampNonNegative(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

export function createDiscreteStateCTMCClass({
    states,
    transitionMatrix,
    generatorMatrix,
    sampleCategorical,
    sampleExp,
    defaultRate = 0.8,
    transitionStartRatio = 0.75,
    transitionEndRatio = 0.25,
}) {
    const stateList = Array.isArray(states) ? states : [];
    const stateCount = stateList.length;

    if (stateCount < 2) {
        throw new RangeError('A discrete-state CTMC needs at least 2 states.');
    }

    const usesGeneratorMatrix = Array.isArray(generatorMatrix);
    const normalizedTransitionRows = usesGeneratorMatrix
        ? null
        : stateList.map((_, rowIndex) => {
            const row = transitionMatrix?.[rowIndex] || [];
            const weights = Array.from({ length: stateCount }, (_, columnIndex) => (
                rowIndex === columnIndex ? 0 : clampNonNegative(row[columnIndex])
            ));
            const total = weights.reduce((sum, value) => sum + value, 0);
            if (total <= 0) {
                const fallback = 1 / (stateCount - 1);
                return weights.map((value, columnIndex) => (rowIndex === columnIndex ? 0 : fallback));
            }
            return weights.map(value => value / total);
        });
    const generatorJumpRows = usesGeneratorMatrix
        ? stateList.map((_, rowIndex) => {
            const row = generatorMatrix?.[rowIndex] || [];
            const weights = Array.from({ length: stateCount }, (_, columnIndex) => (
                rowIndex === columnIndex ? 0 : clampNonNegative(row[columnIndex])
            ));
            const total = weights.reduce((sum, value) => sum + value, 0);
            return {
                total,
                probabilities: total > 0 ? weights.map(value => value / total) : weights,
            };
        })
        : null;
    const generatorLeavingRates = usesGeneratorMatrix
        ? stateList.map((_, rowIndex) => {
            const row = generatorMatrix?.[rowIndex] || [];
            const diag = Number(row[rowIndex]);
            if (Number.isFinite(diag) && diag < 0) {
                return -diag;
            }
            return Array.from({ length: stateCount }, (_, columnIndex) => (
                rowIndex === columnIndex ? 0 : clampNonNegative(row[columnIndex])
            )).reduce((sum, value) => sum + value, 0);
        })
        : null;

    function getLeavingRate(stateIndex, rateScale) {
        if (usesGeneratorMatrix) {
            return (generatorLeavingRates[clampIndex(stateIndex, stateCount)] || 0) * rateScale;
        }
        return rateScale;
    }

    function sampleNextState(currentIndex) {
        const index = clampIndex(currentIndex, stateCount);
        const row = usesGeneratorMatrix
            ? generatorJumpRows[index]
            : { total: 1, probabilities: normalizedTransitionRows[index] };

        if (!row || row.total <= 0) {
            return index;
        }

        let nextState = sampleCategorical(row.probabilities);
        let tries = 0;
        while (nextState === index && tries++ < 20) nextState = sampleCategorical(row.probabilities);
        return clampIndex(nextState, stateCount);
    }

    return class DiscreteStateCTMC {
        constructor(initialStateIndex = 0) {
            this.i = clampIndex(initialStateIndex, stateCount);
            this.nextState = this.i;
            this.time = 0;
            this.t1 = 0;
            this.t2 = 0;
            this.t3 = 0;
            this.flight = null;
            this.lambda = Math.max(1e-9, isFinite(defaultRate) ? +defaultRate : 0.8);
            this._lastRate = null;
            this._rescheduleFromCurrent();
        }

        _decorateFlight(flight) {
            return flight;
        }

        _onTransitionStarted(_flight) {}

        _onTransitionCommitted(_details) {}

        setRate(rateValue) {
            const rate = +rateValue;
            const newLambda = Math.max(1e-9, isFinite(rate) ? rate : this.lambda);
            if (this._lastRate !== null && Math.abs(newLambda - this._lastRate) < 1e-12) return;
            this.lambda = newLambda;
            this._lastRate = newLambda;
            this._rescheduleFromCurrent();
        }

        easeInOut(u) {
            return u * u * (3 - 2 * u);
        }

        update(dt) {
            if (!isFinite(dt) || dt <= 0) return;
            this.time += dt;
            if (!Number.isFinite(this.t2)) return;

            for (let guard = 0; guard < 100; guard += 1) {
                const d12 = this.t2 - this.t1;
                const d23 = this.t3 - this.t2;
                const startFly = this.t1 + transitionStartRatio * d12;
                const endFly = this.t2 + transitionEndRatio * d23;

                if (!this.flight && this.time >= startFly) {
                    const baseFlight = { from: this.i, to: this.nextState, start: startFly, end: endFly };
                    this.flight = this._decorateFlight(baseFlight) || baseFlight;
                    this._onTransitionStarted(this.flight);
                }

                if (this.time >= this.t2) {
                    const previousStateIndex = clampIndex(this.i, stateCount);
                    const committedFlight = this.flight ? { ...this.flight } : null;
                    this.i = clampIndex(this.nextState, stateCount);
                    this.t1 = this.t2;
                    this.t2 = this.t3;
                    this.nextState = sampleNextState(this.i);
                    const nextLeavingRate = getLeavingRate(this.nextState, this.lambda);
                    this.t3 = nextLeavingRate > 0 ? this.t2 + sampleExp(nextLeavingRate) : Infinity;
                    this.flight = null;
                    this._onTransitionCommitted({
                        previousStateIndex,
                        currentStateIndex: this.i,
                        committedFlight,
                    });
                    continue;
                }
                break;
            }
        }

        currentState() {
            return stateList[this.getCurrentStateIndex()] ?? null;
        }

        currentStateName() {
            const current = this.currentState();
            return current?.name ?? current?.label ?? `State ${this.getCurrentStateIndex() + 1}`;
        }

        getStateCount() {
            return stateCount;
        }

        getCurrentStateIndex() {
            return clampIndex(this.i, stateCount);
        }

        getTargetStateIndex() {
            return this.flight ? clampIndex(this.flight.to, stateCount) : this.getCurrentStateIndex();
        }

        isTransitioning() {
            return !!this.flight;
        }

        getTransitionProgress() {
            if (!this.flight) return 1;
            const duration = this.flight.end - this.flight.start;
            const linearProgress = duration > 0 ? (this.time - this.flight.start) / duration : 1;
            return this.easeInOut(Math.max(0, Math.min(1, linearProgress)));
        }

        completeActiveTransition() {
            if (!this.flight) return false;
            const committed = clampIndex(this.flight.to, stateCount);
            this.time = Math.max(this.time, this.flight.end);
            this.i = committed;
            this.nextState = committed;
            this.t1 = this.time;
            this.t2 = this.time;
            this.t3 = this.time;
            this.flight = null;
            return true;
        }

        _rescheduleFromCurrent() {
            const currentIndex = this.getCurrentStateIndex();
            const currentLeavingRate = getLeavingRate(currentIndex, this.lambda);
            this.t1 = this.time;
            if (!(currentLeavingRate > 0)) {
                this.t2 = Infinity;
                this.t3 = Infinity;
                this.nextState = currentIndex;
                this.flight = null;
                return;
            }
            this.t2 = this.t1 + sampleExp(currentLeavingRate);
            this.nextState = sampleNextState(currentIndex);
            const nextLeavingRate = getLeavingRate(this.nextState, this.lambda);
            this.t3 = nextLeavingRate > 0 ? this.t2 + sampleExp(nextLeavingRate) : Infinity;
            this.flight = null;
        }
    };
}
