// Restoration Smithy: a female blacksmith who repairs old, worn-out weapons and trinkets.
// (COL.curse / job.curse keep their old names: they now mean the rust colour / damage note.)
// Scenes: Counter (take a commission) -> Purify (arrow puzzle shaped like the item) -> Collection.
(function () {
  const FONT = '"Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif';
  // Fallback palette (forge at night). Codex UI art replaces panels/buttons/backgrounds.
  const COL = {
    page: '#1d1714', card: '#2a221d', card2: '#352b25', edge: '#4d3e33',
    ink: '#f3e6d3', muted: '#a8978a', dim: '#6d6058',
    ember: '#ff8a3d', gold: '#f2c14e', red: '#ff5a4f', curse: '#c98452',
    metal: '#4a423c', dot: '#6a5d53', line: '#fffaf0',
  };
  const PRAISE = ['수리 완료!', '새것 같아요!', '완벽한 수리!', '말끔해졌어요!'];
  const MAX_HEARTS = 3;
  const HEART_BONUS = 10;

  const SAY = {
    // The player is the blacksmith; these are the waiting client's reactions.
    start: ['잘 부탁드려요, 대장장이님.', '손볼 곳이 많죠…? 천천히 해 주세요.', '여기서 기다리고 있을게요.'],
    bump: ['앗, 괜찮으세요?', '어… 거긴 아직 안 되나 봐요.', '서두르지 않으셔도 돼요.'],
    combo: ['와, 손이 정말 빠르시네요!', '벌써 이만큼이나요?', '녹이 벗겨지는 게 보여요!'],
    hint: '그쪽부터 보시는 건 어때요?',
    clear: '세상에, 새것 같아요! 고마워요!',
    fail: '무리하지 마세요. 잠깐 쉬었다 하셔도 돼요.',
  };
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // ---- save ----
  const KEY = 'cursed-smith.v1';
  const Save = {
    data: { level: 1, gold: 0, purified: {} },
    load() {
      try {
        const d = JSON.parse(localStorage.getItem(KEY));
        if (d) this.data = { ...this.data, ...d, purified: { ...d.purified } };
      } catch (e) { /* storage unavailable: keep defaults */ }
    },
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {} },
  };

  Assets.load([
    ...Items.CLIENTS.map(k => 'clients/' + k.id),
    'ui/bg_workshop', 'ui/bg_board', 'ui/panel', 'ui/button', 'ui/button_primary', 'ui/bubble',
    'ui/icon_heart', 'ui/icon_gold', 'ui/icon_hint', 'ui/icon_undo', 'ui/icon_restart', 'ui/icon_book',
    ...Items.ITEMS.map(i => 'items/' + i.id),          // repaired
    ...Items.ITEMS.map(i => 'items/' + i.id + '_old'), // worn, before repair
  ]);

  // ---- ui helpers ----
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const easeOutBack = k => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);

  function rr(c, x, y, w, h, r) {
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h);
  }
  function text(c, s, x, y, size, color, align = 'left', weight = 'bold') {
    c.font = `${weight} ${size}px ${FONT}`;
    c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle';
    c.fillText(s, x, y);
  }
  // Character-wise wrap (works for Korean). Returns the number of lines drawn.
  function wrap(c, s, x, y, maxW, lh, size, color, maxLines = 4, weight = 'normal', align = 'left') {
    c.font = `${weight} ${size}px ${FONT}`;
    const lines = [];
    let cur = '';
    for (const ch of s) {
      if (cur && c.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch === ' ' ? '' : ch; }
      else cur += ch;
    }
    if (cur) lines.push(cur);
    const shown = lines.slice(0, maxLines);
    shown.forEach((l, i) => text(c, l, x, y + i * lh, size, color, align, weight));
    return shown.length;
  }
  // Minimal style: flat surfaces, no textured frames.
  function panel(c, x, y, w, h, fill = '#221b17') {
    rr(c, x, y, w, h, 22); c.fillStyle = fill; c.fill();
  }
  function inRect(b) {
    const t = Input.tap;
    return !!t && t.x >= b.x && t.x <= b.x + b.w && t.y >= b.y && t.y <= b.y + b.h;
  }
  // Button press: plays the click sound. Use `quiet` when the action has its own sound.
  function hit(b, quiet) {
    if (b.disabled || !inRect(b)) return false;
    if (!quiet) Sfx.click();
    return true;
  }
  function button(c, b) {
    const skin = b.primary ? 'ui/button_primary' : 'ui/button';
    c.save();
    if (b.disabled) c.globalAlpha = 0.45;
    rr(c, b.x, b.y, b.w, b.h, b.h / 2); // flat pill
    c.fillStyle = b.primary ? COL.ember : 'rgba(255,255,255,.08)'; c.fill();
    const fg = b.primary ? '#24180f' : COL.ink;
    const iconSize = b.h * 0.5;
    if (b.icon && Assets.img(b.icon)) {
      c.font = `bold ${b.size || 15}px ${FONT}`;
      const tw = c.measureText(b.label).width, total = iconSize + 8 + tw;
      const ix = b.x + (b.w - total) / 2;
      Assets.contain(c, b.icon, ix, b.y + (b.h - iconSize) / 2, iconSize, iconSize);
      text(c, b.label, ix + iconSize + 8, b.y + b.h / 2 + 1, b.size || 15, fg, 'left');
    } else {
      text(c, b.label, b.x + b.w / 2, b.y + b.h / 2 + 1, b.size || 15, fg, 'center');
    }
    c.restore();
  }
  function icon(c, name, x, y, s, fallback, color) {
    if (!Assets.contain(c, name, x - s / 2, y - s / 2, s, s)) text(c, fallback, x, y + 1, s * 0.9, color, 'center');
  }
  function goldPill(c, x, y) {
    rr(c, x, y, 150, 40, 20); c.fillStyle = 'rgba(255,255,255,.06)'; c.fill();
    icon(c, 'ui/icon_gold', x + 22, y + 20, 24, '●', COL.gold);
    text(c, `${Save.data.gold} G`, x + 138, y + 21, 17, COL.gold, 'right');
  }
  function background(c) {
    c.fillStyle = '#17120f'; c.fillRect(0, 0, Engine.width, Engine.height);
  }
  // Client portrait (Codex art: clients/<id>.png). Placeholder until it exists.
  // The player is the blacksmith, so the only character on screen is the client.
  function portrait(c, client, x, y, w, h) {
    if (Assets.contain(c, 'clients/' + client.id, x, y, w, h, 'bottom')) return;
    c.save();
    c.fillStyle = COL.edge;
    const cx = x + w / 2, s = Math.min(w, h) / 200;
    c.beginPath(); c.arc(cx, y + h - 150 * s, 38 * s, 0, Math.PI * 2); c.fill();
    rr(c, cx - 70 * s, y + h - 100 * s, 140 * s, 100 * s, 40 * s); c.fill();
    const ty = y + 22 * Math.max(1, s);
    text(c, client.name, cx, ty, Math.max(13, 16 * s), COL.muted, 'center');
    text(c, 'Codex 일러스트 자리', cx, ty + 20 * Math.max(1, s), Math.max(11, 12 * s), COL.dim, 'center', 'normal');
    c.restore();
  }
  function bubble(c, x, y, w, h, msg, size = 15) {
    // solid parchment first: the Codex frame's center is see-through
    rr(c, x + (Assets.img('ui/bubble') ? 5 : 0), y + (Assets.img('ui/bubble') ? 5 : 0),
      w - (Assets.img('ui/bubble') ? 10 : 0), h - (Assets.img('ui/bubble') ? 10 : 0), 14);
    c.fillStyle = '#f6ead8'; c.fill();
    Assets.nine(c, 'ui/bubble', x, y, w, h, 20);
    wrap(c, msg, x + 14, y + 20, w - 28, 21, size, '#2a1f18', Math.floor((h - 12) / 21));
  }
  function rays(c, x, y, r, t) {
    c.save(); c.translate(x, y); c.rotate(t * 0.8);
    c.fillStyle = 'rgba(242,193,78,.25)';
    for (let i = 0; i < 12; i++) {
      c.rotate(Math.PI / 6);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(r, -r * 0.13); c.lineTo(r, r * 0.13); c.closePath(); c.fill();
    }
    c.restore();
  }
  // Grid-space point at distance u along a piece's path (tail = 0, head = n-1, then straight on;
  // u < 0 extends backwards past the tail, used for the stub of one-cell arrows).
  function pathPoint(p, u) {
    const n = p.cells.length;
    if (u < 0) {
      const c0 = p.cells[0];
      const [dx, dy] = n > 1 ? [p.cells[1].x - c0.x, p.cells[1].y - c0.y] : Puzzle.DIRS[p.dir];
      return [c0.x + dx * u, c0.y + dy * u];
    }
    if (u <= n - 1) {
      const i = Math.max(0, Math.floor(u)), f = u - i;
      const a = p.cells[i], b = p.cells[Math.min(i + 1, n - 1)];
      return [a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f];
    }
    const [dx, dy] = Puzzle.DIRS[p.dir], h = p.cells[n - 1], e = u - (n - 1);
    return [h.x + dx * e, h.y + dy * e];
  }
  // Where to draw an item image so its visible part (not the transparent margin) fills the
  // given rect, keeping aspect ratio. Returns the rect for the whole image.
  const _artBox = {};
  function artRect(name, gx, gy, gw, gh) {
    const im = Assets.img(name), iw = im.naturalWidth, ih = im.naturalHeight;
    let b = _artBox[name];
    if (!b) {
      b = { x: 0, y: 0, w: 1, h: 1 };
      try {
        const n = 96, cv = document.createElement('canvas');
        cv.width = cv.height = n;
        const x = cv.getContext('2d');
        x.drawImage(im, 0, 0, n, n);
        const d = x.getImageData(0, 0, n, n).data;
        let x0 = n, y0 = n, x1 = -1, y1 = -1;
        for (let py = 0; py < n; py++) for (let px = 0; px < n; px++) {
          if (d[(py * n + px) * 4 + 3] < 40) continue;
          if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
        }
        if (x1 >= x0) b = { x: x0 / n, y: y0 / n, w: (x1 - x0 + 1) / n, h: (y1 - y0 + 1) / n };
      } catch (e) { /* canvas read blocked: use the full image */ }
      _artBox[name] = b;
    }
    const s = Math.min(gw / (b.w * iw), gh / (b.h * ih)), w = iw * s, h = ih * s;
    return { x: gx + (gw - b.w * w) / 2 - b.x * w, y: gy + (gh - b.h * h) / 2 - b.y * h, w, h };
  }

  function globalKeys() { if (Input.wasPressed('KeyM')) Sfx.toggle(); }

  // =====================================================================
  // Counter: the blacksmith takes the next commission.
  // =====================================================================
  const CounterScene = {
    enter() {
      Fx.clear();
      this.job = Items.commission(Save.data.level);
      this.line = pick(this.job.client.greet);
      this.t = 0;
    },
    buttons() {
      return {
        start: { x: 110, y: 800, w: 320, h: 60, label: '수리 시작', primary: true, size: 20 },
        book: { x: 110, y: 878, w: 154, h: 46, label: '수리 도감', icon: 'ui/icon_book' },
        sound: { x: 276, y: 878, w: 154, h: 46, label: Sfx.muted ? '♪ 소리 끔' : '♪ 소리 켬' },
      };
    },
    update(dt) {
      globalKeys(); Fx.update(dt); this.t += dt;
      const b = this.buttons();
      if (hit(b.start)) return Engine.setScene(PuzzleScene);
      if (hit(b.book)) return Engine.setScene(CollectionScene);
      if (hit(b.sound, true)) Sfx.toggle();
    },
    draw(c) {
      background(c);
      text(c, '나의 수리 대장간', 20, 36, 15, COL.muted, 'left', 'normal');
      goldPill(c, 374, 16);

      // blacksmith + greeting: no frame, straight on the flat background
      portrait(c, this.job.client, 60, 70, 420, 400);
      const fade = c.createLinearGradient(0, 400, 0, 472);
      fade.addColorStop(0, 'rgba(23,18,15,0)'); fade.addColorStop(1, '#17120f');
      c.fillStyle = fade; c.fillRect(0, 400, 540, 72);
      text(c, this.line, 270, 492, 15, COL.ink, 'center', 'normal');

      // commission: one flat card
      const j = this.job;
      panel(c, 28, 524, 484, 250);
      text(c, `의뢰 #${j.level} · ${j.strength}`, 52, 552, 13, COL.curse, 'left');
      text(c, `의뢰인 · ${j.client.name}`, 488, 552, 13, COL.dim, 'right', 'normal');
      Items.drawIcon(c, j, 48, 574, 116, 116, 'old');
      wrap(c, j.name, 184, 596, 304, 28, 21, COL.ink, 1, 'bold');
      wrap(c, j.curse, 184, 630, 304, 22, 14, COL.muted, 3);
      text(c, `${j.reward} G`, 52, 738, 22, COL.gold, 'left');
      text(c, `작업 판 ${j.mask[0].length}×${j.mask.length}`, 488, 738, 13, COL.dim, 'right', 'normal');

      Object.values(this.buttons()).forEach(b => button(c, b));
      Fx.draw(c);
    },
  };

  // =====================================================================
  // Purify: arrow puzzle whose board is the item's shape.
  // =====================================================================
  const BOARD = { x: 0, y: 132, w: 540, h: 714 };

  // Round icon button with a small caption underneath.
  function roundBtn(c, b) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, r = b.w / 2;
    c.save();
    if (b.disabled) c.globalAlpha = 0.35;
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fillStyle = b.active ? COL.ember : 'rgba(255,255,255,.07)'; c.fill();
    const fg = b.active ? '#24180f' : COL.ink;
    if (b.glyph === 'back') {
      c.strokeStyle = fg; c.lineWidth = 3.5; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(cx + 5, cy - 11); c.lineTo(cx - 6, cy); c.lineTo(cx + 5, cy + 11); c.stroke();
    } else if (b.glyph === 'guide') { // dashed line ending in an arrowhead
      c.strokeStyle = fg; c.fillStyle = fg; c.lineWidth = 3.5; c.lineCap = 'round';
      c.setLineDash([5, 7]);
      c.beginPath(); c.moveTo(cx - 18, cy); c.lineTo(cx + 6, cy); c.stroke();
      c.setLineDash([]);
      c.beginPath(); c.moveTo(cx + 19, cy); c.lineTo(cx + 7, cy - 8); c.lineTo(cx + 7, cy + 8); c.closePath(); c.fill();
    } else if (!Assets.contain(c, b.icon, cx - r * 0.55, cy - r * 0.55, r * 1.1, r * 1.1)) {
      text(c, b.label[0], cx, cy + 1, 20, fg, 'center');
    }
    if (b.label) text(c, b.label, cx, b.y + b.h + 16, 12, COL.muted, 'center', 'normal');
    c.restore();
  }
  // The waiting client's face in a circle (cropped from her portrait). The ring colour shows
  // her reaction: red when the player slips, gold when the repair is done.
  function avatar(c, client, mood, cx, cy, r) {
    const im = Assets.img('clients/' + client.id);
    c.save();
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fillStyle = COL.card2; c.fill();
    if (im) {
      const iw = im.naturalWidth, ih = im.naturalHeight, sw = iw * 0.46;
      c.clip();
      c.drawImage(im, iw * 0.27, ih * 0.055, sw, sw, cx - r, cy - r, r * 2, r * 2);
    }
    c.restore();
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2);
    c.strokeStyle = mood === 'worried' ? COL.red : mood === 'happy' ? COL.gold : COL.edge; c.lineWidth = 2.5; c.stroke();
  }
  const VIEW = { w: BOARD.w - 40, h: BOARD.h - 70 }; // area the grid fits into at zoom 1
  const inBoard = (x, y) => x >= BOARD.x && x <= BOARD.x + BOARD.w && y >= BOARD.y && y <= BOARD.y + BOARD.h;

  const PuzzleScene = {
    enter() {
      Fx.clear();
      this.load(Save.data.level);
    },

    load(level) {
      this.level = level;
      this.job = Items.commission(level);
      const board = Puzzle.generate(level, this.job.mask);
      this.mask = this.job.mask;
      this.cols = board.cols; this.rows = board.rows;
      this.pieces = board.pieces;
      this.grid = Puzzle.buildGrid(board.cols, board.rows, board.pieces);
      this.total = board.pieces.length;
      this.history = []; this.anims = []; this.hint = null;
      this.hearts = MAX_HEARTS; this.state = 'play'; this.timer = 0;
      this.combo = 0; this.introT = 0; this.overlayT = 0; this.heartPop = null; this.praise = null;
      this.payout = 0;
      this.say(pick(SAY.start), 'focus', 2.5);
      // camera: zoom 1 = whole board fits; big boards start zoomed in so arrows are tappable
      // tight spacing: cells are ~24-34px so the knot reads as one dense maze
      this.fit = Math.min(VIEW.w / this.cols, VIEW.h / this.rows, 34);
      this.zoomMax = Math.max(1, 52 / this.fit);
      this.zoom = 1; // start with the whole puzzle in view; pinch / wheel to zoom in
      this.panX = 0; this.panY = 0;
      this.guide = false;
      this.applyCamera();
      // "fog" mask in grid space (white = repaired art shows through), F px per cell
      this.F = Math.max(8, Math.min(16, Math.floor(880 / Math.max(this.cols, this.rows))));
      this.fog = document.createElement('canvas');
      this.fog.width = this.cols * this.F; this.fog.height = this.rows * this.F;
      this.layer = document.createElement('canvas');
      this.layer.width = this.fog.width; this.layer.height = this.fog.height;
    },

    // Thin the fog along a piece's path: a soft-edged stroke through its dots.
    strokeFog(p, width, alpha) {
      const f = this.fog.getContext('2d'), F = this.F;
      f.save();
      f.lineCap = 'round'; f.lineJoin = 'round';
      f.strokeStyle = `rgba(255,255,255,${alpha})`; f.lineWidth = width * F;
      f.shadowColor = '#fff'; f.shadowBlur = F * 1.1;
      f.beginPath();
      p.cells.forEach((q, i) => { const x = (q.x + 0.5) * F, y = (q.y + 0.5) * F; i ? f.lineTo(x, y) : f.moveTo(x, y); });
      if (p.cells.length === 1) f.lineTo((p.cells[0].x + 0.5) * F + 0.01, (p.cells[0].y + 0.5) * F);
      f.stroke();
      f.restore();
    },
    rebuildFog() {
      this.fog.getContext('2d').clearRect(0, 0, this.fog.width, this.fog.height);
      const live = new Set(this.anims.filter(a => a.type === 'clear').map(a => a.id));
      for (const p of this.pieces) if (p.gone && !live.has(p.id)) for (let i = 0; i < 6; i++) this.strokeFog(p, 2.1, 0.5);
    },

    // The item behind the puzzle: worn art everywhere, repaired art where the fog has cleared.
    drawArt(c) {
      const j = this.job, fixed = Assets.img('items/' + j.id);
      if (!fixed) return;
      const worn = Assets.img('items/' + j.id + '_old') || fixed;
      const gw = this.cols * this.cs, gh = this.rows * this.cs;
      const r = artRect('items/' + j.id, this.bx, this.by, gw, gh);
      const done = this.state === 'clearing' ? clamp01((0.8 - this.timer - 0.15) / 0.6) : this.state === 'win' ? 1 : 0;
      c.save();
      // worn item, dimmed like it sits under dust
      // (low alpha over the dark page = dark and muted on every browser; the filter adds
      // extra desaturation where canvas filters are supported)
      c.globalAlpha = 0.3 * (1 - done);
      c.filter = worn === fixed ? 'sepia(0.7) saturate(0.4) brightness(0.6)' : 'saturate(0.45)';
      c.drawImage(worn, r.x, r.y, r.w, r.h);
      c.filter = 'none';
      // repaired item, only where the fog mask is open
      const l = this.layer.getContext('2d'), k = this.F / this.cs;
      l.globalCompositeOperation = 'source-over';
      l.clearRect(0, 0, this.layer.width, this.layer.height);
      l.drawImage(this.fog, 0, 0);
      l.globalCompositeOperation = 'source-in';
      l.drawImage(fixed, (r.x - this.bx) * k, (r.y - this.by) * k, r.w * k, r.h * k);
      // kept soft while arrows remain, so they stay the clearest thing on the board;
      // the full-strength item only appears once everything is removed
      c.globalAlpha = 0.5 * (1 - done);
      c.drawImage(this.layer, this.bx, this.by, gw, gh);
      // cleared: the whole repaired item comes through
      if (done > 0) { c.globalAlpha = done; c.drawImage(fixed, r.x, r.y, r.w, r.h); }
      c.restore();
    },

    // Derive cs/bx/by (used by all drawing + hit tests) from zoom and pan, clamped to the board.
    applyCamera() {
      this.zoom = Math.max(1, Math.min(this.zoomMax, this.zoom));
      const cs = this.cs = this.fit * this.zoom;
      const w = cs * this.cols, h = cs * this.rows;
      const mx = Math.max(0, (w - VIEW.w) / 2), my = Math.max(0, (h - VIEW.h) / 2);
      this.panX = Math.max(-mx, Math.min(mx, this.panX));
      this.panY = Math.max(-my, Math.min(my, this.panY));
      this.bx = BOARD.x + (BOARD.w - w) / 2 + this.panX;
      this.by = BOARD.y + (BOARD.h - 24 - h) / 2 + this.panY;
    },
    zoomAt(f, x, y) {
      const gx = (x - this.bx) / this.cs, gy = (y - this.by) / this.cs;
      this.zoom *= f;
      this.panX = this.panY = 0;
      this.applyCamera();
      this.panX = x - gx * this.cs - this.bx;
      this.panY = y - gy * this.cs - this.by;
      this.applyCamera();
    },
    centerOn(cell) {
      this.panX = (this.cols / 2 - cell.x - 0.5) * this.cs;
      this.panY = (this.rows / 2 - cell.y - 0.5) * this.cs;
      this.applyCamera();
    },
    get canZoom() { return this.zoomMax > 1.05; },

    // Blacksmith line + expression; mood returns to idle after `hold` seconds.
    say(msg, mood = 'idle', hold = 1.6) { this.line = msg; this.mood = mood; this.moodT = hold; },

    left() { return this.pieces.filter(p => !p.gone).length; },
    removable() { return Puzzle.removable(this.grid, this.pieces); },
    setCells(p, id) { for (const q of p.cells) this.grid[q.y][q.x] = id; },

    hudButtons() {
      return {
        back: { x: 14, y: 18, w: 52, h: 52, glyph: 'back' },
        undo: { x: 50, y: 858, w: 62, h: 62, label: '되돌리기', icon: 'ui/icon_undo', disabled: !this.history.length },
        hint: { x: 176, y: 858, w: 62, h: 62, label: '힌트', icon: 'ui/icon_hint' },
        guide: { x: 302, y: 858, w: 62, h: 62, label: '경로', glyph: 'guide', active: this.guide },
        restart: { x: 428, y: 858, w: 62, h: 62, label: '다시', icon: 'ui/icon_restart' },
      };
    },

    overlayButtons() {
      if (this.state === 'win') return {
        next: { x: 62, y: 866, w: 200, h: 56, label: '다음 의뢰', primary: true, size: 17 },
        book: { x: 278, y: 866, w: 200, h: 56, label: '수리 도감', size: 17 },
      };
      if (this.state === 'fail') return {
        retry: { x: 62, y: 560, w: 200, h: 52, label: '다시 하기', primary: true, size: 16 },
        counter: { x: 278, y: 560, w: 200, h: 52, label: '접수대로', size: 16 },
      };
      return {};
    },

    update(dt) {
      globalKeys();
      Fx.update(dt);
      this.introT += dt; this.overlayT += dt;
      if (this.moodT > 0 && (this.moodT -= dt) <= 0 && this.state === 'play') this.mood = 'idle';
      if (this.heartPop) { this.heartPop.t += dt; if (this.heartPop.t > 0.5) this.heartPop = null; }
      for (const a of this.anims) {
        a.t += dt;
        // the fog keeps thinning along a removed arrow's path for a moment after it leaves
        if (a.type === 'clear') this.strokeFog(this.pieces[a.id], 0.5 + 1.6 * (a.t / a.dur), 0.12);
      }
      this.anims = this.anims.filter(a => a.t < a.dur);

      if (this.state === 'clearing' || this.state === 'win') { // ease the camera back to the whole item
        this.zoom += (1 - this.zoom) * 0.18; this.panX *= 0.82; this.panY *= 0.82;
        this.applyCamera();
      }
      if (this.state === 'clearing') {
        this.timer -= dt;
        if (this.timer <= 0) this.win();
        return;
      }
      if (this.state === 'win' || this.state === 'fail') {
        if (this.overlayT < 0.3) return; // let the panel pop in before accepting taps
        const b = this.overlayButtons();
        if (b.next && hit(b.next)) Engine.setScene(CounterScene);
        else if (b.book && hit(b.book)) Engine.setScene(CollectionScene);
        else if (b.retry && hit(b.retry)) { Fx.clear(); this.load(this.level); }
        else if (b.counter && hit(b.counter)) Engine.setScene(CounterScene);
        return;
      }

      // camera: one-finger drag pans, pinch / mouse wheel zooms (only gestures on the board)
      const dr = Input.drag, zm = Input.zoom;
      if (dr && inBoard(dr.sx, dr.sy)) { this.panX += dr.dx; this.panY += dr.dy; this.applyCamera(); }
      if (zm && inBoard(zm.x, zm.y)) this.zoomAt(zm.f, zm.x, zm.y);

      const b = this.hudButtons();
      if (hit(b.back)) return Engine.setScene(CounterScene);
      if (hit(b.undo, true)) return this.undo();
      if (hit(b.guide)) { this.guide = !this.guide; return; }
      if (hit(b.hint, true)) {
        this.hint = this.removable()[0] || null;
        if (this.hint) this.centerOn(Puzzle.headOf(this.hint));
        Sfx.hint();
        this.say(SAY.hint, 'focus');
        return;
      }
      if (hit(b.restart)) { Fx.clear(); return this.load(this.level); }

      const t = Input.tap;
      if (!t || this.introT < 0.6 || !inBoard(t.x, t.y)) return;
      const found = this.pieceAt(t.x, t.y);
      if (!found) return;
      const p = found.p, id = p.id;
      if (this.anims.some(a => a.type === 'bump' && a.id === id)) return; // still bouncing back

      const [px, py] = this.cellCenter(found.x, found.y);
      const blk = Puzzle.blockerOf(this.grid, p);
      const h = Puzzle.headOf(p);
      if (!blk) {
        p.gone = true;
        this.setCells(p, null);
        this.history.push(id);
        this.anims.push({ type: 'slide', id, t: 0, dur: 0.32 + 0.03 * p.cells.length },
          { type: 'clear', id, t: 0, dur: 0.75 });
        this.hint = null;
        Sfx.slide(this.combo++);
        Fx.burst(...this.cellCenter(h.x, h.y), COL.curse, 5 + p.cells.length, 140);
        if (this.combo === 4 || this.combo === 8) this.say(pick(SAY.combo), 'focus');
        if (!this.left()) {
          this.state = 'clearing'; this.timer = 0.8;
          this.praise = pick(PRAISE);
          this.say(SAY.clear, 'happy', 99);
        }
      } else {
        // The arrow runs forward until it hits the blocker, bounces back, and stays red.
        const gap = Math.abs(blk.x - h.x) + Math.abs(blk.y - h.y) - 1;
        p.bad = true;
        this.hearts--;
        this.combo = 0;
        this.heartPop = { i: this.hearts, t: 0 };
        this.anims.push({ type: 'bump', id, dist: gap + 0.32, t: 0, dur: 0.28 + 0.05 * gap },
          { type: 'flash', id: blk.id, t: 0, dur: 0.7 });
        Sfx.block();
        Fx.shake(4, 0.22);
        Fx.text(px, py - this.cs * 0.4, '-1', COL.red);
        this.say(pick(SAY.bump), 'worried');
        if (this.hearts <= 0) { this.state = 'fail'; this.overlayT = 0; Sfx.fail(); this.say(SAY.fail, 'worried', 99); }
      }
    },

    undo() {
      if (!this.history.length) return;
      const id = this.history.pop(), p = this.pieces[id];
      p.gone = false;
      this.setCells(p, id);
      this.anims = this.anims.filter(a => !(a.type === 'slide' && a.id === id));
      this.anims = this.anims.filter(a => !(a.type === 'clear' && a.id === id));
      this.anims.push({ type: 'pop', id, t: 0, dur: 0.25 });
      this.rebuildFog(); // the fog closes back over that path
      this.hint = null;
      this.combo = 0;
      Sfx.undo();
    },

    win() {
      const d = Save.data, j = this.job;
      this.payout = j.reward + this.hearts * HEART_BONUS;
      d.gold += this.payout;
      d.purified[j.id] = (d.purified[j.id] || 0) + 1;
      d.level = this.level + 1;
      Save.save();
      this.state = 'win';
      this.overlayT = 0;
      Sfx.clear();
      Fx.confetti(20, 520, 0, 90);
    },

    cellCenter(x, y) { return [this.bx + x * this.cs + this.cs / 2, this.by + y * this.cs + this.cs / 2]; },

    // Nearest piece to a tap (forgiving: snaps to the closest occupied dot within 0.8 cells).
    pieceAt(tx, ty) {
      const fx = (tx - this.bx) / this.cs - 0.5, fy = (ty - this.by) / this.cs - 0.5;
      let best = null, bd = 0.8;
      for (let y = Math.round(fy) - 1; y <= Math.round(fy) + 1; y++)
        for (let x = Math.round(fx) - 1; x <= Math.round(fx) + 1; x++) {
          if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) continue;
          const id = this.grid[y][x];
          if (id == null) continue;
          const d = Math.hypot(x - fx, y - fy);
          if (d < bd) { bd = d; best = { p: this.pieces[id], x, y }; }
        }
      return best;
    },

    // Fade-in after the title, rippling from the top-left.
    pieceAlpha(p) {
      const h = Puzzle.headOf(p);
      let s = clamp01((this.introT - 0.55 - (h.x + h.y) * 0.025) / 0.25);
      const pop = this.anims.find(a => a.type === 'pop' && a.id === p.id);
      if (pop) s *= clamp01(pop.t / pop.dur);
      return s;
    },

    // Screen points of a piece's line, moved `off` cells along its own path.
    piecePoints(p, off = 0) {
      const cs = this.cs, n = p.cells.length;
      const P = u => { const [gx, gy] = pathPoint(p, u); return [this.bx + gx * cs + cs / 2, this.by + gy * cs + cs / 2]; };
      const a = off - (n === 1 ? 0.6 : 0), b = off + n - 1;
      const pts = [P(a)];
      for (let k = Math.floor(a) + 1; k < b; k++) pts.push(P(k));
      pts.push(P(b));
      return pts;
    },

    // Thin line through the dots, with a filled arrowhead at the head.
    drawPiece(c, p, { off = 0, alpha = 1 } = {}) {
      if (alpha <= 0.01) return;
      const cs = this.cs, pts = this.piecePoints(p, off);
      const color = p.bad ? COL.red : COL.line;
      c.save();
      c.globalAlpha = alpha;
      c.lineCap = 'round'; c.lineJoin = 'round';
      const lw = Math.max(3, cs * 0.14), hs = Math.max(10, cs * 0.5);
      const [hx, hy] = pts[pts.length - 1];
      const line = () => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); };
      const head = paint => {
        c.save();
        c.translate(hx, hy); c.rotate(Puzzle.ANGLE[p.dir]);
        c.beginPath(); c.moveTo(hs * 0.62, 0); c.lineTo(-hs * 0.3, -hs * 0.48); c.lineTo(-hs * 0.3, hs * 0.48); c.closePath();
        paint();
        c.restore();
      };
      // Two passes so body and head read as one shape: first the dark casing of both (keeps the
      // arrow readable on the artwork), then the light fill of both on top, with no seam between.
      c.strokeStyle = '#120d0a';
      line(); c.lineWidth = lw + 5; c.stroke();
      head(() => { c.lineWidth = 5; c.stroke(); });
      c.strokeStyle = color; c.fillStyle = color;
      line(); c.lineWidth = lw; c.stroke();
      head(() => c.fill());
      c.restore();
    },

    // Soft glow drawn under a piece (hint / blocked flash).
    drawOutline(c, p, color) {
      const pts = this.piecePoints(p);
      c.save();
      c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = color; c.lineWidth = Math.max(10, this.cs * 0.5);
      c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
      c.restore();
    },

    // Minimal puzzle screen: flat background, slim HUD, the board fills the screen, no tiles
    // behind the arrows (just the dot grid).
    draw(c) {
      c.fillStyle = '#17120f'; c.fillRect(0, 0, Engine.width, Engine.height);
      c.save();
      Fx.applyShake(c);
      const j = this.job;

      // HUD: title, hearts, remaining, thin purification bar, blacksmith avatar + her line
      text(c, `의뢰 #${j.level} · ${j.name}`, 270, 24, 14, COL.muted, 'center', 'normal');
      for (let i = 0; i < MAX_HEARTS; i++) {
        let s = 30;
        if (this.heartPop && this.heartPop.i === i) s *= 1 + 0.6 * Math.sin(Math.PI * clamp01(this.heartPop.t / 0.5));
        c.save(); c.globalAlpha = i < this.hearts ? 1 : 0.22;
        icon(c, 'ui/icon_heart', 270 + (i - 1) * 36, 56, s, '♥', COL.red);
        c.restore();
      }
      text(c, `남은 손상 ${this.left()}`, 270, 86, 12, COL.dim, 'center', 'normal');
      avatar(c, j.client, this.mood, 496, 46, 30);
      const prog = this.state === 'win' ? 1 : 1 - this.left() / this.total;
      c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(0, 102, 540, 3);
      const pg = c.createLinearGradient(0, 0, 540, 0);
      pg.addColorStop(0, COL.curse); pg.addColorStop(1, COL.gold);
      c.fillStyle = pg; c.fillRect(0, 102, 540 * prog, 3);
      if (this.moodT > 0 && this.line) {
        c.save(); c.globalAlpha = clamp01(this.moodT * 2);
        text(c, this.line, 270, 120, 13, COL.ink, 'center', 'normal');
        c.restore();
      }

      // board
      c.save(); // everything on the grid is clipped to the board (it can be panned/zoomed past it)
      c.beginPath(); c.rect(BOARD.x, BOARD.y, BOARD.w, BOARD.h); c.clip();
      this.drawArt(c);
      const cs = this.cs;
      c.fillStyle = COL.dot;
      const dots = this.state === 'play' || this.state === 'fail'; // none once the repair is done
      for (let y = 0; dots && y < this.rows; y++)
        for (let x = 0; x < this.cols; x++) {
          if (this.mask[y][x] !== '#' || this.grid[y][x] != null) continue; // dots only where a line has left
          const [px, py] = this.cellCenter(x, y);
          c.beginPath(); c.arc(px, py, Math.max(1.8, cs * 0.05), 0, Math.PI * 2); c.fill();
        }

      if (this.hint && !this.hint.gone) {
        const a = 0.35 + 0.5 * Math.abs(Math.sin(Engine.time * 5));
        this.drawOutline(c, this.hint, `rgba(242,193,78,${a * 0.6})`);
      }
      for (const a of this.anims) {
        if (a.type !== 'flash' || this.pieces[a.id].gone) continue;
        this.drawOutline(c, this.pieces[a.id], `rgba(255,90,79,${0.6 * (1 - a.t / a.dur)})`);
      }
      // exit-path guide: where each arrow's head is aiming, out to the edge of the grid
      if (this.guide) {
        c.save();
        c.strokeStyle = 'rgba(242,193,78,.45)'; c.lineWidth = Math.max(1.5, cs * 0.045);
        c.setLineDash([cs * 0.14, cs * 0.16]);
        c.beginPath();
        for (const p of this.pieces) {
          if (p.gone) continue;
          const h = Puzzle.headOf(p), [dx, dy] = Puzzle.DIRS[p.dir];
          const n = dx > 0 ? this.cols - h.x : dx < 0 ? h.x + 1 : dy > 0 ? this.rows - h.y : h.y + 1;
          const [x0, y0] = this.cellCenter(h.x, h.y);
          c.moveTo(x0 + dx * cs * 0.45, y0 + dy * cs * 0.45);
          c.lineTo(x0 + dx * cs * (n - 0.3), y0 + dy * cs * (n - 0.3));
        }
        c.stroke();
        c.restore();
      }
      for (const p of this.pieces) {
        if (p.gone) continue;
        // blocked: run forward to the blocker and bounce back along its own path
        const bump = this.anims.find(a => a.type === 'bump' && a.id === p.id);
        const off = bump ? bump.dist * (1 - Math.pow(2 * (bump.t / bump.dur) - 1, 2)) : 0;
        this.drawPiece(c, p, { off, alpha: this.pieceAlpha(p) });
      }
      const reach = Math.max(this.cols, this.rows) + 3;
      for (const a of this.anims) {
        if (a.type !== 'slide') continue;
        const p = this.pieces[a.id], k = a.t / a.dur;
        this.drawPiece(c, p, { off: k * k * (p.cells.length + reach), alpha: 1 - k * 0.5 });
      }
      c.restore();

      if (this.introT < 1.0) {
        const a = this.introT < 0.6 ? clamp01(this.introT / 0.15) : 1 - (this.introT - 0.6) / 0.4;
        c.save(); c.globalAlpha = clamp01(a);
        text(c, j.name, 270, BOARD.y + BOARD.h / 2 - 16, 30, COL.ink, 'center');
        text(c, `${j.strength} · 수리 시작`, 270, BOARD.y + BOARD.h / 2 + 22, 16, COL.curse, 'center', 'normal');
        c.restore();
      }
      // Cleared: no popup. The purified item appears right here on the board, where the knot was.
      if (this.state === 'clearing' || this.state === 'win') {
        const t = this.state === 'clearing' ? 0.8 - this.timer : 0.8 + this.overlayT; // seconds since the last arrow left
        const cx = 270;
        // (the item itself is already on the board: drawArt finishes the reveal in place)
        // soft dark bands so the texts stay readable over the artwork
        const top = c.createLinearGradient(0, BOARD.y, 0, BOARD.y + 130);
        top.addColorStop(0, 'rgba(23,18,15,.92)'); top.addColorStop(1, 'rgba(23,18,15,0)');
        c.fillStyle = top; c.fillRect(0, BOARD.y, 540, 130);
        if (this.state === 'win') {
          const bot = c.createLinearGradient(0, BOARD.y + BOARD.h - 190, 0, BOARD.y + BOARD.h);
          bot.addColorStop(0, 'rgba(23,18,15,0)'); bot.addColorStop(0.45, 'rgba(23,18,15,.9)'); bot.addColorStop(1, 'rgba(23,18,15,.95)');
          c.save(); c.globalAlpha = clamp01(this.overlayT / 0.4);
          c.fillStyle = bot; c.fillRect(0, BOARD.y + BOARD.h - 190, 540, 190);
          c.restore();
        }
        c.save();
        c.globalAlpha = clamp01(t * 3);
        c.translate(cx, BOARD.y + 70); const s = easeOutBack(clamp01(t * 2.2)); c.scale(s, s);
        text(c, this.praise || '수리 완료!', 0, 0, 38, COL.gold, 'center');
        c.restore();
        if (this.state === 'win') {
          c.save();
          c.globalAlpha = clamp01(this.overlayT / 0.4);
          text(c, j.name, cx, BOARD.y + BOARD.h - 118, 22, COL.ink, 'center');
          text(c, `+${this.payout} G`, cx, BOARD.y + BOARD.h - 82, 26, COL.gold, 'center');
          text(c, `보수 ${j.reward} + 집중력 보너스 ${this.hearts * HEART_BONUS}`, cx, BOARD.y + BOARD.h - 52, 13, COL.muted, 'center', 'normal');
          c.restore();
        }
      }
      const tip = this.level === 1 ? '손상(화살표)을 누르면 머리 방향으로 빠져나가요'
        : this.level === 2 ? '앞이 막힌 화살표는 부딪혀 돌아오고 집중력이 줄어요'
        : this.canZoom && this.introT < 9 ? '드래그로 이동 · 두 손가락(마우스 휠)으로 확대/축소' : null;
      if (tip && this.state === 'play' && this.introT > 1) {
        rr(c, 60, BOARD.y + BOARD.h - 34, 420, 28, 14); c.fillStyle = 'rgba(20,14,10,.8)'; c.fill();
        text(c, tip, 270, BOARD.y + BOARD.h - 20, 13, COL.gold, 'center', 'normal');
      }
      if (this.combo >= 3 && this.state === 'play')
        text(c, `${this.combo} 연속!`, 270, BOARD.y + 18, 14, COL.gold, 'center');

      if (this.state === 'win') {
        // same page: the tool buttons give way to "next commission / collection"
        c.save(); c.globalAlpha = clamp01((this.overlayT - 0.15) / 0.3);
        Object.values(this.overlayButtons()).forEach(b => button(c, b));
        c.restore();
      } else {
        Object.values(this.hudButtons()).forEach(b => roundBtn(c, b));
      }

      if (this.state === 'fail') this.drawOverlay(c);
      c.restore();
      Fx.draw(c);
    },

    drawOverlay(c) {
      c.fillStyle = `rgba(10,6,4,${0.6 * clamp01(this.overlayT / 0.2)})`;
      c.fillRect(0, 0, Engine.width, Engine.height);
      const s = easeOutBack(clamp01(this.overlayT / 0.3));
      c.save();
      c.translate(270, 480); c.scale(s, s); c.translate(-270, -480);
      if (this.state === 'win') {
        panel(c, 40, 270, 460, 390);
        text(c, this.praise || '수리 완료!', 270, 314, 32, COL.gold, 'center');
        rays(c, 270, 432, 92, Engine.time);
        const pop = easeOutBack(clamp01((this.overlayT - 0.2) / 0.35));
        const sz = 150 * pop;
        Items.drawIcon(c, this.job, 270 - sz / 2, 432 - sz / 2, sz, sz, 'fixed');
        text(c, this.job.name, 270, 528, 17, COL.ink, 'center');
        text(c, `+${this.payout} G`, 270, 562, 22, COL.gold, 'center');
        text(c, `(보수 ${this.job.reward} + 정신력 보너스 ${this.hearts * HEART_BONUS})`, 270, 584, 12, COL.muted, 'center', 'normal');
        Object.values(this.overlayButtons()).forEach(b => button(c, b));
      } else {
        panel(c, 40, 340, 460, 300);
        text(c, '집중력이 바닥났어요', 270, 392, 26, COL.ink, 'center');
        wrap(c, '순서가 틀리면 집중력이 줄어요. 막히지 않은 화살표부터 빼 보세요.', 270, 440, 380, 24, 15, COL.muted, 2, 'normal', 'center');
        Object.values(this.overlayButtons()).forEach(b => button(c, b));
      }
      c.restore();
    },
  };

  // =====================================================================
  // Collection: every item the smithy has purified.
  // =====================================================================
  const CollectionScene = {
    back: { x: 14, y: 12, w: 52, h: 52, glyph: 'back' },
    enter() { Fx.clear(); },
    cardRect(i) { return { x: 16 + (i % 2) * 258, y: 76 + Math.floor(i / 2) * 172, w: 250, h: 162 }; },
    update(dt) {
      globalKeys(); Fx.update(dt);
      if (hit(this.back)) Engine.setScene(CounterScene);
    },
    draw(c) {
      background(c);
      roundBtn(c, this.back);
      text(c, '수리 도감', 270, 38, 16, COL.muted, 'center', 'normal');
      const got = Items.ITEMS.filter(i => Save.data.purified[i.id]).length;
      text(c, `${got} / ${Items.ITEMS.length}`, 520, 38, 15, COL.gold, 'right');
      Items.ITEMS.forEach((it, i) => {
        const r = this.cardRect(i), n = Save.data.purified[it.id] || 0;
        panel(c, r.x, r.y, r.w, r.h);
        Items.drawIcon(c, it, r.x + 16, r.y + 20, 96, 122, n ? 'fixed' : 'unknown');
        if (n) {
          wrap(c, it.name, r.x + 128, r.y + 36, 110, 21, 15, COL.ink, 3, 'bold');
          text(c, `수리 ${n}회`, r.x + 128, r.y + 136, 13, COL.gold, 'left');
        } else {
          text(c, '???', r.x + 128, r.y + 40, 18, COL.dim, 'left');
          text(c, '미접수 의뢰', r.x + 128, r.y + 136, 13, COL.dim, 'left', 'normal');
        }
      });
      Fx.draw(c);
    },
  };

  Save.load();
  Engine.start(document.getElementById('game'), CounterScene);
})();
