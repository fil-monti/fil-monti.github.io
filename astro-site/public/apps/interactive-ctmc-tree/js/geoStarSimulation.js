import { createDiscreteStateCTMCClass } from './ctmcModel.js';
import { hexToRgba } from './sequenceSimulation.js';

export function createGeoCTMCStarClass({
    geoStates,
    transitionMatrix,
    projectEquirect,
    getRoute,
    sampleCategorical,
    sampleExp,
}) {
    const BaseGeoCTMC = createDiscreteStateCTMCClass({
        states: geoStates,
        transitionMatrix,
        sampleCategorical,
        sampleExp,
        defaultRate: 0.8,
    });

    return class GeoCTMCStar extends BaseGeoCTMC {
        constructor(initialStateIndex = 0) {
            super(initialStateIndex);
            this.headX = 0;
            this.headY = 0;
            this.curveFactor = 1.3;
            this.trail = [];
            this.routeSegments = [];
            this.trailMaxAge = 9.0;
            this.trailFadeSpeed = 4 / 3;
            this.trailSampleHz = 12;
            this.trailBootstrapDistance = 0.75;
            this.trailMinPixelStep = 3.0;
            this._trailAcc = 0;
            this.stickyPaths = false;
            this._viewport = null;
        }

        setStickyPaths(sticky) {
            const wasSticky = this.stickyPaths;
            this.stickyPaths = sticky;
            if (sticky) {
                this.trail.forEach(point => point.age = 0);
                this.routeSegments.forEach(segment => segment.age = 0);
                return;
            }
            if (wasSticky) {
                const keepCount = Math.max(2, Math.ceil(this.trailSampleHz * 1.0));
                if (this.trail.length > keepCount) this.trail = this.trail.slice(-keepCount);
                const count = this.trail.length;
                this.trail.forEach((point, index) => {
                    point.age = (count <= 1 ? 0 : (1 - index / (count - 1))) * this.trailMaxAge;
                });
                const segmentCount = this.routeSegments.length;
                this.routeSegments.forEach((segment, index) => {
                    segment.age = (segmentCount <= 1 ? 0 : (1 - index / (segmentCount - 1))) * this.trailMaxAge;
                });
            }
        }

        easeInOut(u) { return u * u * (3 - 2 * u); }

        sampleRoutePoint(route, u) {
            if (route.type === 'line') {
                return {
                    x: route.A.x + (route.B.x - route.A.x) * u,
                    y: route.A.y + (route.B.y - route.A.y) * u,
                };
            }
            const angle = route.a0 + route.da * u;
            return {
                x: route.C.x + route.R * Math.cos(angle),
                y: route.C.y + route.R * Math.sin(angle),
            };
        }

        cloneRoute(route) {
            if (!route) return null;
            if (route.type === 'line') {
                return {
                    ...route,
                    A: { ...route.A },
                    B: { ...route.B },
                };
            }
            return {
                ...route,
                A: { ...route.A },
                B: { ...route.B },
                C: { ...route.C },
            };
        }

        recordRouteSegment(route) {
            const cloned = this.cloneRoute(route);
            if (!cloned) return;
            this.routeSegments.push({ route: cloned, age: 0 });
        }

        _advanceTrailAges(dt) {
            if (this.stickyPaths) return;
            const fadeDt = dt * this.trailFadeSpeed;
            this.trail.forEach(point => point.age += fadeDt);
            while (this.trail.length && this.trail[0].age > this.trailMaxAge) this.trail.shift();
            this.routeSegments.forEach(segment => segment.age += fadeDt);
            while (this.routeSegments.length && this.routeSegments[0].age > this.trailMaxAge) this.routeSegments.shift();
        }

        hasTransientTrail() {
            return !this.stickyPaths && (this.routeSegments.length > 0 || this.trail.length > 1 || !!this.flight);
        }

        fadeTrail(dt) {
            this._advanceTrailAges(dt);
            return this.hasTransientTrail();
        }

        _decorateFlight(flight) {
            if (!this._viewport) return flight;
            const { offsetX, offsetY, mapWidth, mapHeight } = this._viewport;
            return {
                ...flight,
                route: getRoute(
                    flight.from,
                    flight.to,
                    this.curveFactor,
                    offsetX,
                    offsetY,
                    mapWidth,
                    mapHeight,
                ),
            };
        }

        _onTransitionCommitted({ committedFlight }) {
            if (committedFlight?.route) this.recordRouteSegment(committedFlight.route);
        }

        update(dt, offsetX, offsetY, mapWidth, mapHeight) {
            this._viewport = { offsetX, offsetY, mapWidth, mapHeight };
            if (!isFinite(dt) || dt <= 0) {
                const currentState = this.currentState();
                const [x, y] = projectEquirect(currentState.lon, currentState.lat, offsetX, offsetY, mapWidth, mapHeight);
                this.headX = x;
                this.headY = y;
                return;
            }
            super.update(dt);

            if (this.flight?.route) {
                const point = this.sampleRoutePoint(this.flight.route, this.getTransitionProgress());
                this.headX = point.x;
                this.headY = point.y;
            } else {
                const currentState = this.currentState();
                const [x, y] = projectEquirect(currentState.lon, currentState.lat, offsetX, offsetY, mapWidth, mapHeight);
                this.headX = x;
                this.headY = y;
            }
        }

        updateTrail(dt) {
            if (this.trail.length === 0) this.trail.push({ x: this.headX, y: this.headY, age: 0 });

            this._advanceTrailAges(dt);

            const lastPoint = this.trail.length ? this.trail[this.trail.length - 1] : null;
            const movedDistance = lastPoint ? Math.hypot(this.headX - lastPoint.x, this.headY - lastPoint.y) : 0;
            const shouldBootstrapTrail = this.trail.length === 1 && movedDistance >= this.trailBootstrapDistance;
            const shouldSampleByDistance = this.flight && movedDistance >= this.trailMinPixelStep;
            const step = 1 / this.trailSampleHz;
            let sampledThisUpdate = false;

            if (shouldBootstrapTrail || shouldSampleByDistance) {
                this.trail.push({ x: this.headX, y: this.headY, age: 0 });
                this._trailAcc = 0;
                sampledThisUpdate = true;
            } else {
                this._trailAcc += dt;
                while (this._trailAcc >= step) {
                    this._trailAcc -= step;
                    this.trail.push({ x: this.headX, y: this.headY, age: 0 });
                    sampledThisUpdate = true;
                }
            }

            if (this.trail.length) {
                const last = this.trail[this.trail.length - 1];
                last.x = this.headX;
                last.y = this.headY;
                if (sampledThisUpdate) last.age = 0;
            }
        }

        draw(ctx, color = '#000', fixedOffset = { x: 0, y: 0 }, options = {}) {
            const {
                drawHeadMarker = null,
            } = options;
            const lerp = (a, b, t) => a + (b - a) * t;
            const drawRouteSegment = (route, startProgress = 0, endProgress = 1, taper = null) => {
                const start = Math.max(0, Math.min(1, startProgress));
                const end = Math.max(0, Math.min(1, endProgress));
                if (!route || end <= start) return;
                const span = route.type === 'line'
                    ? Math.hypot(route.B.x - route.A.x, route.B.y - route.A.y)
                    : Math.abs(route.da) * route.R;
                const steps = Math.max(6, Math.ceil(span / 10));
                if (!taper) {
                    ctx.beginPath();
                    for (let step = 0; step <= steps; step++) {
                        const u = start + (end - start) * (step / steps);
                        const point = this.sampleRoutePoint(route, u);
                        if (step === 0) ctx.moveTo(point.x + fixedOffset.x, point.y + fixedOffset.y);
                        else ctx.lineTo(point.x + fixedOffset.x, point.y + fixedOffset.y);
                    }
                    ctx.stroke();
                    return;
                }

                let previousPoint = this.sampleRoutePoint(route, start);
                for (let step = 1; step <= steps; step++) {
                    const localProgress = step / steps;
                    const u = start + (end - start) * localProgress;
                    const nextPoint = this.sampleRoutePoint(route, u);
                    const styleT = (step - 0.5) / steps;
                    const alpha = lerp(taper.alphaStart, taper.alphaEnd, styleT);
                    const width = lerp(taper.widthStart, taper.widthEnd, styleT);
                    if (alpha > 0 && width > 0) {
                        ctx.strokeStyle = hexToRgba(color, alpha);
                        ctx.lineWidth = width;
                        ctx.beginPath();
                        ctx.moveTo(previousPoint.x + fixedOffset.x, previousPoint.y + fixedOffset.y);
                        ctx.lineTo(nextPoint.x + fixedOffset.x, nextPoint.y + fixedOffset.y);
                        ctx.stroke();
                    }
                    previousPoint = nextPoint;
                }
            };

            if (this.routeSegments.length > 0 || this.flight?.route) {
                this.routeSegments.forEach(segment => {
                    const visibility = this.stickyPaths
                        ? 1
                        : Math.max(0, Math.min(1, 1 - segment.age / this.trailMaxAge));
                    if (visibility <= 0) return;
                    if (this.stickyPaths) {
                        ctx.strokeStyle = color.replace('1)', '0.6)');
                        ctx.lineWidth = 2;
                        drawRouteSegment(segment.route, 0, 1);
                        return;
                    }

                    const tailStart = Math.pow(1 - visibility, 2);
                    const tipWidth = 1.15 + 2.35 * visibility;
                    drawRouteSegment(segment.route, tailStart, 1, {
                        alphaStart: 0.03 * visibility,
                        alphaEnd: 0.14 + 0.46 * visibility,
                        widthStart: Math.max(0.35, tipWidth * 0.28),
                        widthEnd: tipWidth,
                    });
                });
            } else if (this.trail.length > 1) {
                if (this.trail.length === 2) {
                    const p0 = this.trail[0];
                    const p1 = this.trail[1];
                    const alpha = this.stickyPaths
                        ? 0.6
                        : Math.max(0, Math.min(1, 1 - p1.age / this.trailMaxAge)) * 0.55;
                    ctx.strokeStyle = this.stickyPaths ? color.replace('1)', '0.6)') : hexToRgba(color, alpha);
                    ctx.lineWidth = this.stickyPaths ? 2 : 1 + 2 * Math.max(0, Math.min(1, 1 - p1.age / this.trailMaxAge));
                    ctx.beginPath();
                    ctx.moveTo(p0.x + fixedOffset.x, p0.y + fixedOffset.y);
                    ctx.lineTo(p1.x + fixedOffset.x, p1.y + fixedOffset.y);
                    ctx.stroke();
                } else {
                    for (let segmentIndex = 0; segmentIndex < this.trail.length - 1; segmentIndex++) {
                        const controlIndex = Math.min(segmentIndex + 1, this.trail.length - 2);
                        const controlPoint = this.trail[controlIndex];
                        const endPoint = segmentIndex === this.trail.length - 2
                            ? this.trail[this.trail.length - 1]
                            : {
                                x: (this.trail[controlIndex].x + this.trail[controlIndex + 1].x) / 2,
                                y: (this.trail[controlIndex].y + this.trail[controlIndex + 1].y) / 2,
                            };
                        const startPoint = segmentIndex === 0
                            ? this.trail[0]
                            : {
                                x: (this.trail[segmentIndex].x + this.trail[segmentIndex + 1].x) / 2,
                                y: (this.trail[segmentIndex].y + this.trail[segmentIndex + 1].y) / 2,
                            };
                        const alphaSource = this.trail[Math.min(controlIndex + 1, this.trail.length - 1)];

                        if (this.stickyPaths) {
                            ctx.strokeStyle = color.replace('1)', '0.6)');
                            ctx.lineWidth = 2;
                        } else {
                            const alpha = Math.max(0, Math.min(1, 1 - alphaSource.age / this.trailMaxAge));
                            ctx.strokeStyle = hexToRgba(color, 0.55 * alpha);
                            ctx.lineWidth = 1 + 2 * alpha;
                        }

                        ctx.beginPath();
                        ctx.moveTo(startPoint.x + fixedOffset.x, startPoint.y + fixedOffset.y);
                        ctx.quadraticCurveTo(
                            controlPoint.x + fixedOffset.x,
                            controlPoint.y + fixedOffset.y,
                            endPoint.x + fixedOffset.x,
                            endPoint.y + fixedOffset.y,
                        );
                        ctx.stroke();
                    }
                }
            }

            if (this.flight?.route) {
                const duration = this.flight.end - this.flight.start;
                const progress = Math.max(0, Math.min(1, duration > 0 ? (this.time - this.flight.start) / duration : 1));
                const startProgress = Math.max(0, Math.min(1, this.flight.visibleStartProgress ?? 0));
                ctx.save();
                ctx.strokeStyle = this.stickyPaths ? color.replace('1)', '0.6)') : hexToRgba(color, 0.55);
                ctx.lineWidth = this.stickyPaths ? 2 : 3;
                drawRouteSegment(this.flight.route, startProgress, this.easeInOut(progress));
                ctx.restore();
            }

            const drawX = this.headX + fixedOffset.x;
            const drawY = this.headY + fixedOffset.y;
            if (typeof drawHeadMarker === 'function') {
                drawHeadMarker({
                    ctx,
                    x: drawX,
                    y: drawY,
                    color,
                });
                return;
            }

            ctx.fillStyle = color;
            ctx.strokeStyle = hexToRgba(color, 0.5);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(drawX, drawY, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        currentStateName() {
            return super.currentStateName();
        }
    };
}
