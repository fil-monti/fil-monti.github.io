import { CANVAS_HOST_ILLUSTRATION_COLORS } from './canvasPalette.js';

function withCtx(ctx, fn) {
    ctx.save();
    fn();
    ctx.restore();
}

function circle(ctx, x, y, r, fill) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
}

function blob(ctx, cx, cy, rx, ry, rot, fill) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
}

function ear(ctx, x, y, w, h, tilt, fill) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(w * 0.75, h * 0.15, w * 0.5, h);
    ctx.quadraticCurveTo(w * 0.05, h * 0.75, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function roundRect(ctx, x, y, w, h, r, fill) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
    ctx.fill();
}

export function createHostRenderers(hostPalette) {
    function drawHuman(ctx, cx, cy, s = 1) {
        const c = hostPalette.human;
        circle(ctx, cx, cy - 48 * s, 10 * s, c);
        circle(ctx, cx - 3 * s, cy - 52 * s, 3.5 * s, CANVAS_HOST_ILLUSTRATION_COLORS.humanHighlight);
        withCtx(ctx, () => {
            ctx.fillStyle = c;
            ctx.beginPath();
            ctx.moveTo(cx - 18 * s, cy - 35 * s);
            ctx.quadraticCurveTo(cx, cy - 48 * s, cx + 18 * s, cy - 35 * s);
            ctx.lineTo(cx + 22 * s, cy + 5 * s);
            ctx.quadraticCurveTo(cx, cy + 18 * s, cx - 22 * s, cy + 5 * s);
            ctx.closePath();
            ctx.fill();
        });
        ctx.strokeStyle = c;
        ctx.lineWidth = 9 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 18 * s, cy - 22 * s);
        ctx.quadraticCurveTo(cx - 42 * s, cy - 6 * s, cx - 30 * s, cy + 18 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 18 * s, cy - 22 * s);
        ctx.quadraticCurveTo(cx + 42 * s, cy - 6 * s, cx + 30 * s, cy + 18 * s);
        ctx.stroke();
        withCtx(ctx, () => {
            ctx.fillStyle = c;
            ctx.beginPath();
            ctx.roundRect(cx - 18 * s, cy + 5 * s, 14 * s, 44 * s, 8 * s);
            ctx.fill();
            ctx.beginPath();
            ctx.roundRect(cx + 4 * s, cy + 5 * s, 14 * s, 44 * s, 8 * s);
            ctx.fill();
        });
        blob(ctx, cx - 11 * s, cy + 52 * s, 12 * s, 7 * s, 0, c);
        blob(ctx, cx + 11 * s, cy + 52 * s, 12 * s, 7 * s, 0, c);
    }

    function drawBat(ctx, cx, cy, s = 1) {
        const { fur, furLight, innerEar, eye, outline, sparkle } = CANVAS_HOST_ILLUSTRATION_COLORS.bat;
        ctx.fillStyle = fur;
        ctx.beginPath();
        ctx.moveTo(cx - 70 * s, cy + 8 * s);
        ctx.bezierCurveTo(cx - 60 * s, cy - 30 * s, cx - 28 * s, cy - 50 * s, cx - 6 * s, cy - 18 * s);
        ctx.quadraticCurveTo(cx - 18 * s, cy - 2 * s, cx - 32 * s, cy + 10 * s);
        ctx.quadraticCurveTo(cx - 18 * s, cy + 20 * s, cx - 4 * s, cy + 6 * s);
        ctx.quadraticCurveTo(cx, cy - 4 * s, cx + 4 * s, cy + 6 * s);
        ctx.quadraticCurveTo(cx + 18 * s, cy + 20 * s, cx + 32 * s, cy + 10 * s);
        ctx.quadraticCurveTo(cx + 18 * s, cy - 2 * s, cx + 6 * s, cy - 18 * s);
        ctx.bezierCurveTo(cx + 28 * s, cy - 50 * s, cx + 60 * s, cy - 30 * s, cx + 70 * s, cy + 8 * s);
        ctx.quadraticCurveTo(cx + 36 * s, cy + 26 * s, cx, cy + 20 * s);
        ctx.quadraticCurveTo(cx - 36 * s, cy + 26 * s, cx - 70 * s, cy + 8 * s);
        ctx.closePath();
        ctx.fill();
        blob(ctx, cx, cy + 10 * s, 14 * s, 20 * s, 0, furLight);
        circle(ctx, cx, cy - 6 * s, 10 * s, furLight);
        ear(ctx, cx - 6 * s, cy - 20 * s, 10 * s, 14 * s, -0.4, furLight);
        ear(ctx, cx + 6 * s, cy - 20 * s, 10 * s, 14 * s, 0.4, furLight);
        ear(ctx, cx - 6 * s, cy - 18 * s, 6 * s, 8 * s, -0.4, innerEar);
        ear(ctx, cx + 6 * s, cy - 18 * s, 6 * s, 8 * s, 0.4, innerEar);
        circle(ctx, cx - 3 * s, cy - 6 * s, 2.2 * s, eye);
        circle(ctx, cx + 3 * s, cy - 6 * s, 2.2 * s, eye);
        circle(ctx, cx - 3.8 * s, cy - 7 * s, 0.9 * s, sparkle);
        circle(ctx, cx + 2.2 * s, cy - 7 * s, 0.9 * s, sparkle);
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2 * s;
        ctx.stroke();
    }

    function drawMonkey(ctx, cx, cy, s = 1) {
        const { fur, tail, face, eye, sparkle } = CANVAS_HOST_ILLUSTRATION_COLORS.monkey;
        ctx.strokeStyle = fur;
        ctx.lineWidth = 6 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx + 22 * s, cy + 12 * s);
        ctx.bezierCurveTo(cx + 65 * s, cy - 10 * s, cx + 65 * s, cy + 70 * s, cx + 18 * s, cy + 55 * s);
        ctx.stroke();
        blob(ctx, cx, cy + 20 * s, 24 * s, 32 * s, 0, fur);
        circle(ctx, cx, cy - 10 * s, 26 * s, fur);
        circle(ctx, cx - 28 * s, cy - 12 * s, 12 * s, fur);
        circle(ctx, cx + 28 * s, cy - 12 * s, 12 * s, fur);
        circle(ctx, cx - 28 * s, cy - 12 * s, 7 * s, face);
        circle(ctx, cx + 28 * s, cy - 12 * s, 7 * s, face);
        blob(ctx, cx, cy - 6 * s, 20 * s, 18 * s, 0, face);
        circle(ctx, cx - 8 * s, cy - 10 * s, 4 * s, eye);
        circle(ctx, cx + 8 * s, cy - 10 * s, 4 * s, eye);
        circle(ctx, cx - 9 * s, cy - 11 * s, 1.5 * s, sparkle);
        circle(ctx, cx + 7 * s, cy - 11 * s, 1.5 * s, sparkle);
        ctx.strokeStyle = tail;
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.moveTo(cx - 4 * s, cy - 2 * s);
        ctx.lineTo(cx + 4 * s, cy - 2 * s);
        ctx.stroke();
        ctx.strokeStyle = fur;
        ctx.lineWidth = 8 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 18 * s, cy + 10 * s);
        ctx.quadraticCurveTo(cx - 38 * s, cy + 25 * s, cx - 24 * s, cy + 40 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 18 * s, cy + 10 * s);
        ctx.quadraticCurveTo(cx + 38 * s, cy + 25 * s, cx + 24 * s, cy + 40 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 12 * s, cy + 48 * s);
        ctx.lineTo(cx - 12 * s, cy + 65 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 12 * s, cy + 48 * s);
        ctx.lineTo(cx + 12 * s, cy + 65 * s);
        ctx.stroke();
    }

    function drawPig(ctx, cx, cy, s = 1) {
        const { pink, pinkLight, outline, eye, hoof, nostril, sparkle, bellyGlow } = CANVAS_HOST_ILLUSTRATION_COLORS.pig;
        ctx.strokeStyle = pink;
        ctx.lineWidth = 6 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx + 28 * s, cy + 28 * s);
        ctx.bezierCurveTo(cx + 46 * s, cy + 22 * s, cx + 46 * s, cy + 52 * s, cx + 28 * s, cy + 46 * s);
        ctx.bezierCurveTo(cx + 16 * s, cy + 42 * s, cx + 18 * s, cy + 30 * s, cx + 30 * s, cy + 34 * s);
        ctx.stroke();
        blob(ctx, cx, cy + 26 * s, 30 * s, 22 * s, 0, pink);
        blob(ctx, cx - 6 * s, cy + 30 * s, 18 * s, 12 * s, 0, bellyGlow);
        roundRect(ctx, cx - 18 * s, cy + 44 * s, 10 * s, 18 * s, 5 * s, pink);
        roundRect(ctx, cx + 6 * s, cy + 44 * s, 10 * s, 18 * s, 5 * s, pink);
        roundRect(ctx, cx - 18 * s, cy + 58 * s, 10 * s, 6 * s, 3 * s, hoof);
        roundRect(ctx, cx + 6 * s, cy + 58 * s, 10 * s, 6 * s, 3 * s, hoof);
        circle(ctx, cx - 10 * s, cy + 6 * s, 20 * s, pink);
        ear(ctx, cx - 22 * s, cy - 10 * s, 14 * s, 16 * s, -0.5, pink);
        ear(ctx, cx + 2 * s, cy - 10 * s, 14 * s, 16 * s, 0.5, pink);
        ear(ctx, cx - 21 * s, cy - 8 * s, 9 * s, 10 * s, -0.5, pinkLight);
        ear(ctx, cx + 1 * s, cy - 8 * s, 9 * s, 10 * s, 0.5, pinkLight);
        roundRect(ctx, cx - 30 * s, cy + 4 * s, 20 * s, 16 * s, 7 * s, pinkLight);
        circle(ctx, cx - 24 * s, cy + 12 * s, 2.6 * s, nostril);
        circle(ctx, cx - 16 * s, cy + 12 * s, 2.6 * s, nostril);
        circle(ctx, cx - 6 * s, cy + 2 * s, 2.8 * s, eye);
        circle(ctx, cx - 7 * s, cy + 1 * s, 1.1 * s, sparkle);
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2 * s;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.arc(cx - 10 * s, cy + 6 * s, 20 * s, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx, cy + 26 * s, 30 * s, 22 * s, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    function drawMosquito(ctx, cx, cy, s = 1) {
        const ink = hostPalette.mosquito;
        blob(ctx, cx, cy, 10 * s, 28 * s, 0, ink);
        blob(ctx, cx, cy - 28 * s, 8 * s, 8 * s, 0, ink);
        ctx.strokeStyle = ink;
        ctx.lineWidth = 3 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.ellipse(cx - 18 * s, cy - 20 * s, 26 * s, 14 * s, -0.25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx + 18 * s, cy - 20 * s, 26 * s, 14 * s, 0.25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 2.2 * s;
        for (const k of [-1, 0, 1]) {
            ctx.beginPath();
            ctx.moveTo(cx - 6 * s, cy - 2 * s + k * 6 * s);
            ctx.quadraticCurveTo(cx - 34 * s, cy + 8 * s + k * 6 * s, cx - 42 * s, cy + 24 * s + k * 6 * s);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + 6 * s, cy - 2 * s + k * 6 * s);
            ctx.quadraticCurveTo(cx + 34 * s, cy + 8 * s + k * 6 * s, cx + 42 * s, cy + 24 * s + k * 6 * s);
            ctx.stroke();
        }
        ctx.lineWidth = 2.8 * s;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 34 * s);
        ctx.lineTo(cx, cy - 60 * s);
        ctx.stroke();
        blob(ctx, cx - 3 * s, cy + 6 * s, 3 * s, 10 * s, 0, CANVAS_HOST_ILLUSTRATION_COLORS.mosquito.wingGlow);
    }

    function drawVirus(ctx, cx, cy, s = 1, color = null) {
        const c = color || hostPalette.virus;
        const radius = 14 * s;
        circle(ctx, cx, cy, radius, c);
        for (let i = 0; i < 12; i += 1) {
            const angle = i / 12 * Math.PI * 2;
            const x1 = cx + Math.cos(angle) * radius;
            const y1 = cy + Math.sin(angle) * radius;
            const x2 = cx + Math.cos(angle) * (radius + 10 * s);
            const y2 = cy + Math.sin(angle) * (radius + 10 * s);
            ctx.strokeStyle = c;
            ctx.lineWidth = 3 * s;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            circle(ctx, x2, y2, 3 * s, c);
        }
        circle(ctx, cx - 4 * s, cy - 4 * s, 4 * s, CANVAS_HOST_ILLUSTRATION_COLORS.virus.sheen);
    }

    return {
        HOST_ICON: {
            Human: drawHuman,
            Bat: drawBat,
            Monkey: drawMonkey,
            Pig: drawPig,
            Mosquito: drawMosquito,
        },
        drawVirus,
    };
}
