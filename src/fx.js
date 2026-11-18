// Visual effects: particles (burst, confetti, sparkle, floating text) and screen shake.
// Scenes call Fx.update(dt) in update and Fx.draw(ctx) last in draw.
(function () {
  const CONFETTI = ['#e76f93', '#f2c14e', '#5b6cc4', '#2f9e94', '#e0874a', '#b45fb0'];
  const r = (a, b) => a + Math.random() * (b - a);

  const Fx = {
    parts: [],
    shakeT: 0, shakeDur: 0.3, shakeAmp: 0,

    burst(x, y, color, n = 10, speed = 200) {
      for (let i = 0; i < n; i++) {
        const a = r(0, Math.PI * 2), v = r(speed * 0.3, speed);
        this.parts.push({ kind: 'dot', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 260,
          t: 0, life: r(0.35, 0.6), size: r(3, 6), color });
      }
    },

    confetti(x0, x1, y, n = 90) {
      for (let i = 0; i < n; i++) {
        this.parts.push({ kind: 'rect', x: r(x0, x1), y: y - r(0, 120), vx: r(-70, 70), vy: r(-40, 160), g: 200,
          t: 0, life: r(1.6, 2.6), size: r(6, 11), color: CONFETTI[i % CONFETTI.length], rot: r(0, 6), vr: r(-8, 8) });
      }
    },

    sparkle(x, y, w, h, n = 14) {
      for (let i = 0; i < n; i++) {
        this.parts.push({ kind: 'star', x: x + r(0, w), y: y + r(0, h), vx: r(-15, 15), vy: r(-40, -10), g: 0,
          t: 0, life: r(0.6, 1.1), size: r(5, 11), color: i % 3 ? '#fff6c8' : '#ffd1e3', rot: r(0, 1) });
      }
    },

    text(x, y, str, color, size = 22) {
      this.parts.push({ kind: 'text', x, y, vx: 0, vy: -50, g: 0, t: 0, life: 0.9, size, color, str });
    },

    shake(amp = 6, dur = 0.3) { this.shakeAmp = amp; this.shakeT = this.shakeDur = dur; },

    clear() { this.parts = []; this.shakeT = 0; },

    update(dt) {
      for (const p of this.parts) {
        p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.vr) p.rot += p.vr * dt;
      }
      this.parts = this.parts.filter(p => p.t < p.life);
      if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);
    },

    // Translate the whole scene by the current shake offset (wrap in save/restore).
    applyShake(c) {
      if (this.shakeT <= 0) return;
      const k = (this.shakeT / this.shakeDur) * this.shakeAmp;
      c.translate(r(-k, k), r(-k, k));
    },

    draw(c) {
      for (const p of this.parts) {
        const a = 1 - p.t / p.life;
        c.save();
        c.globalAlpha = Math.min(1, a * 1.6);
        c.fillStyle = p.color;
        c.translate(p.x, p.y);
        if (p.kind === 'dot') {
          c.beginPath(); c.arc(0, 0, p.size * (0.4 + a * 0.6), 0, Math.PI * 2); c.fill();
        } else if (p.kind === 'rect') {
          c.rotate(p.rot); c.scale(1, Math.cos(p.t * 9 + p.rot));
          c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.kind === 'star') {
          const s = p.size * Math.sin(Math.PI * (p.t / p.life));
          c.rotate(p.rot);
          c.beginPath();
          for (let i = 0; i < 8; i++) {
            const rad = i % 2 ? s * 0.28 : s;
            c.lineTo(Math.cos(i * Math.PI / 4) * rad, Math.sin(i * Math.PI / 4) * rad);
          }
          c.closePath(); c.fill();
        } else if (p.kind === 'text') {
          c.font = `bold ${p.size}px "Malgun Gothic",system-ui,sans-serif`;
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(p.str, 0, 0);
        }
        c.restore();
      }
    },
  };

  window.Fx = Fx;
})();
