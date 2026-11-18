// Minimal engine: fixed-timestep loop, input, scene switching, helpers.
// Classic script (no ES modules) so index.html also runs straight from file://.
(function () {
  const STEP = 1 / 60;

  const Input = {
    down: new Set(),
    pressed: new Set(),
    pointer: { x: 0, y: 0, active: false },
    tap: null, // {x, y}: a press released without dragging; set for exactly one update step
    _taps: [], // queued so fast taps between steps are never dropped
    // One-finger drag this step: {dx, dy, sx, sy} (delta + where the drag started), else null.
    drag: null, _drag: null,
    // Pinch / mouse wheel this step: {f, x, y} (scale factor around a point), else null.
    zoom: null, _zoom: null,
    isDown(...keys) { return keys.some(k => this.down.has(k)); },
    wasPressed(...keys) { return keys.some(k => this.pressed.has(k)); },
    _beginStep() {
      this.tap = this._taps.shift() || null;
      this.drag = this._drag; this._drag = null;
      this.zoom = this._zoom; this._zoom = null;
    },
    _endFrame() { this.pressed.clear(); this.tap = null; this.drag = null; this.zoom = null; },
  };
  const DRAG_SLOP = 10; // logical px a press may move and still count as a tap

  function bindInput(canvas) {
    addEventListener('keydown', e => {
      if (!Input.down.has(e.code)) Input.pressed.add(e.code);
      Input.down.add(e.code);
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    addEventListener('keyup', e => Input.down.delete(e.code));
    addEventListener('blur', () => Input.down.clear());
    // Pointer coords in logical game units (independent of the HiDPI backing size).
    const pos = e => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (Engine.width / r.width), y: (e.clientY - r.top) * (Engine.height / r.height) };
    };
    const pts = new Map(); // pointerId -> {x, y, sx, sy, moved}
    let multi = false;     // a second finger touched during this gesture: never a tap
    const addZoom = (f, x, y) => {
      const z = Input._zoom || (Input._zoom = { f: 1, x, y });
      z.f *= f; z.x = x; z.y = y;
    };
    canvas.addEventListener('pointerdown', e => {
      const p = pos(e);
      Input.pointer.x = p.x; Input.pointer.y = p.y; Input.pointer.active = true;
      pts.set(e.pointerId, { x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false });
      if (pts.size > 1) multi = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    });
    canvas.addEventListener('pointermove', e => {
      const p = pos(e);
      Input.pointer.x = p.x; Input.pointer.y = p.y;
      const q = pts.get(e.pointerId);
      if (!q) return;
      if (pts.size === 2) {
        const o = [...pts.entries()].find(([id]) => id !== e.pointerId)[1];
        const before = Math.hypot(q.x - o.x, q.y - o.y), after = Math.hypot(p.x - o.x, p.y - o.y);
        if (before > 1 && after > 1) addZoom(after / before, (p.x + o.x) / 2, (p.y + o.y) / 2);
      } else if (pts.size === 1) {
        if (!q.moved && Math.hypot(p.x - q.sx, p.y - q.sy) > DRAG_SLOP) q.moved = true;
        if (q.moved) {
          const d = Input._drag || (Input._drag = { dx: 0, dy: 0, sx: q.sx, sy: q.sy });
          d.dx += p.x - q.x; d.dy += p.y - q.y;
        }
      }
      q.x = p.x; q.y = p.y;
    });
    const up = e => {
      const q = pts.get(e.pointerId);
      if (!q) return;
      pts.delete(e.pointerId);
      if (e.type === 'pointerup' && !q.moved && !multi) Input._taps.push({ x: q.sx, y: q.sy });
      if (!pts.size) { multi = false; Input.pointer.active = false; }
    };
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const p = pos(e);
      addZoom(Math.exp(-e.deltaY * 0.0015), p.x, p.y);
    }, { passive: false });
  }

  const Engine = {
    canvas: null, ctx: null, scene: null, paused: false, time: 0,
    // Logical size comes from the <canvas width/height> attributes; games draw in these units.
    W: 0, H: 0, k: 1,
    get width() { return this.W; },
    get height() { return this.H; },

    start(canvas, firstScene) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.W = canvas.width; this.H = canvas.height;
      this._fitBacking();
      addEventListener('resize', () => this._fitBacking());
      if (window.ResizeObserver) new ResizeObserver(() => this._fitBacking()).observe(canvas);
      bindInput(canvas);
      this.setScene(firstScene);
      let last = performance.now(), acc = 0;
      const frame = now => {
        acc += Math.min((now - last) / 1000, 0.25);
        last = now;
        if (Input.wasPressed('KeyP')) this.paused = !this.paused;
        while (acc >= STEP) {
          Input._beginStep();
          if (!this.paused) { this.scene.update?.(STEP); this.time += STEP; }
          Input._endFrame();
          acc -= STEP;
        }
        this.render();
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    },

    render() {
      this.ctx.setTransform(this.k, 0, 0, this.k, 0, 0);
      this.scene.draw?.(this.ctx);
      if (this.paused) this._drawPaused();
    },

    // Match the backing store to the displayed size x devicePixelRatio so text stays sharp on phones.
    _fitBacking() {
      const cssW = this.canvas.getBoundingClientRect().width || this.W;
      const k = Math.min(3, Math.max(1, (cssW * (window.devicePixelRatio || 1)) / this.W));
      if (Math.abs(k - this.k) < 0.01 && this.canvas.width === Math.round(this.W * k)) return;
      this.k = k;
      this.canvas.width = Math.round(this.W * k);
      this.canvas.height = Math.round(this.H * k);
    },

    setScene(scene) {
      this.scene?.exit?.();
      this.scene = scene;
      scene.enter?.();
    },

    _drawPaused() {
      const c = this.ctx;
      c.fillStyle = 'rgba(0,0,0,.5)';
      c.fillRect(0, 0, this.width, this.height);
      c.fillStyle = '#fff';
      c.font = 'bold 36px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillText('PAUSED', this.width / 2, this.height / 2);
    },
  };

  const util = {
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    rand: (a, b) => a + Math.random() * (b - a),
    overlap: (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y,
  };

  window.Engine = Engine;
  window.Input = Input;
  window.util = util;
})();
