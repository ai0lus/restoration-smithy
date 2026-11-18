// Original dress-up character + outfit items, drawn with canvas shapes.
// Character space: x centered on 0, y from ~0 (top of hair) to ~395 (feet).
// Every slot always has an item equipped (base outfit = tee + skirt), so the
// character is always fully dressed.
(function () {
  const SKIN = '#f9dccb', SKIN2 = '#efc3ad', INK = '#3a2d4a';

  const ITEMS = [
    { id: 'hair_bob', slot: 'hair', name: '단발 · 갈색', style: 'bob', color: '#6b4226', unlock: 0 },
    { id: 'top_tee', slot: 'top', name: '하늘색 티셔츠', style: 'tee', color: '#9ec5ff', unlock: 0 },
    { id: 'bottom_skirt', slot: 'bottom', name: '남색 스커트', style: 'skirt', color: '#3e4a7a', unlock: 0 },
    { id: 'shoes_red', slot: 'shoes', name: '빨간 운동화', style: 'sneakers', color: '#e05a6a', unlock: 0 },
    { id: 'acc_none', slot: 'acc', name: '없음', style: 'none', color: '#ffffff', unlock: 0 },
    { id: 'bg_lavender', slot: 'bg', name: '라벤더', style: 'plain', color: '#e7defa', unlock: 0 },
    { id: 'top_hoodie_pink', slot: 'top', name: '분홍 후드티', style: 'hoodie', color: '#f4a6c0', unlock: 1 },
    { id: 'bg_dots', slot: 'bg', name: '민트 도트', style: 'dots', color: '#cdeee3', unlock: 2 },
    { id: 'hair_long', slot: 'hair', name: '긴 생머리 · 흑발', style: 'long', color: '#2b2b36', unlock: 3 },
    { id: 'acc_ribbon', slot: 'acc', name: '빨간 리본', style: 'ribbon', color: '#e2495b', unlock: 4 },
    { id: 'bottom_jeans', slot: 'bottom', name: '청바지', style: 'pants', color: '#4d6fa8', unlock: 5 },
    { id: 'shoes_boots', slot: 'shoes', name: '갈색 부츠', style: 'boots', color: '#8a5a3b', unlock: 6 },
    { id: 'top_blouse', slot: 'top', name: '크림 블라우스', style: 'blouse', color: '#fff1d6', accent: '#e2495b', unlock: 7 },
    { id: 'hair_pony', slot: 'hair', name: '포니테일 · 금발', style: 'ponytail', color: '#e3b85c', unlock: 8 },
    { id: 'bg_stars', slot: 'bg', name: '별밤', style: 'stars', color: '#2e3360', unlock: 9 },
    { id: 'acc_glasses', slot: 'acc', name: '동그란 안경', style: 'glasses', color: '#3a2d4a', unlock: 10 },
    { id: 'bottom_shorts', slot: 'bottom', name: '베이지 반바지', style: 'shorts', color: '#cdb38a', unlock: 11 },
    { id: 'top_sweater', slot: 'top', name: '줄무늬 니트', style: 'sweater', color: '#f6efe4', accent: '#e07a5f', unlock: 12 },
    { id: 'hair_twin', slot: 'hair', name: '트윈테일 · 핑크', style: 'twintails', color: '#f093b8', accent: '#ffffff', unlock: 13 },
    { id: 'shoes_flats', slot: 'shoes', name: '검정 플랫슈즈', style: 'flats', color: '#2f2a36', unlock: 14 },
    { id: 'acc_beret', slot: 'acc', name: '베레모', style: 'beret', color: '#b5384a', unlock: 15 },
    { id: 'bg_stripes', slot: 'bg', name: '피치 스트라이프', style: 'stripes', color: '#ffd9c7', unlock: 16 },
    { id: 'top_jacket', slot: 'top', name: '초록 재킷', style: 'jacket', color: '#4f8a6b', unlock: 17 },
    { id: 'bottom_long', slot: 'bottom', name: '자두색 롱스커트', style: 'longskirt', color: '#7d4a7f', unlock: 18 },
    { id: 'hair_short', slot: 'hair', name: '숏컷 · 은발', style: 'short', color: '#c8cbd8', unlock: 19 },
    { id: 'acc_phones', slot: 'acc', name: '헤드폰', style: 'headphones', color: '#5b6cc4', unlock: 20 },
    { id: 'shoes_blue', slot: 'shoes', name: '파란 운동화', style: 'sneakers', color: '#4a8fe0', unlock: 21 },
    { id: 'top_hoodie_navy', slot: 'top', name: '남색 후드티', style: 'hoodie', color: '#3b4a78', unlock: 22 },
    { id: 'acc_cat', slot: 'acc', name: '고양이 귀 머리띠', style: 'catears', color: '#3a3a44', unlock: 23 },
    { id: 'bg_sunset', slot: 'bg', name: '노을', style: 'gradient', color: '#ffb38a', color2: '#c78bd8', unlock: 24 },
  ];
  const byId = Object.fromEntries(ITEMS.map(i => [i.id, i]));
  const defaults = { hair: 'hair_bob', top: 'top_tee', bottom: 'bottom_skirt', shoes: 'shoes_red', acc: 'acc_none', bg: 'bg_lavender' };

  // ---- shape helpers ----
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const m = v => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f);
    return `rgb(${m(n >> 16)},${m((n >> 8) & 255)},${m(n & 255)})`;
  }
  function ell(c, x, y, rx, ry, fill, rot = 0) {
    c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
  }
  function rrect(c, x, y, w, h, r, fill) {
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h);
    c.fillStyle = fill; c.fill();
  }
  function poly(c, pts, fill) {
    c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.closePath(); c.fillStyle = fill; c.fill();
  }
  function limb(c, x1, y1, x2, y2, w, color) {
    c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }
  const mirror = pts => pts.map((v, i) => (i % 2 ? v : -v));

  // ---- layers ----
  function hairBack(c, h) {
    const col = h.color;
    switch (h.style) {
      case 'bob': ell(c, 0, 92, 74, 70, col); rrect(c, -74, 92, 148, 62, 24, col); break;
      case 'long': ell(c, 0, 92, 74, 70, col); rrect(c, -76, 92, 152, 168, 34, col); break;
      case 'ponytail': ell(c, 0, 88, 70, 66, col); ell(c, 74, 132, 20, 58, col, -0.35); break;
      case 'twintails': ell(c, 0, 88, 70, 66, col); ell(c, -82, 152, 22, 64, col, 0.2); ell(c, 82, 152, 22, 64, col, -0.2); break;
      case 'short': ell(c, 0, 80, 66, 62, col); break;
    }
  }

  function hairFront(c, h) {
    const side = h.style === 'long' || h.style === 'bob' ? 134 : 112;
    c.beginPath();
    c.arc(0, 84, 66, Math.PI, Math.PI * 2);
    const pts = [64, side, 54, 92, 46, 72, 34, 78, 24, 62, 12, 76, 0, 62, -12, 76, -24, 62, -34, 78, -46, 72, -54, 92, -64, side];
    for (let i = 0; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.closePath(); c.fillStyle = h.color; c.fill();
    ell(c, -26, 44, 14, 5, 'rgba(255,255,255,.18)', -0.4);
    if (h.style === 'twintails') { ell(c, -64, 100, 7, 7, h.accent); ell(c, 64, 100, 7, 7, h.accent); }
  }

  function face(c, blink) {
    for (const s of [-1, 1]) {
      if (blink) {
        c.strokeStyle = INK; c.lineWidth = 3; c.lineCap = 'round';
        c.beginPath(); c.arc(22 * s, 96, 7, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
      } else {
        ell(c, 22 * s, 98, 7, 10, INK);
        ell(c, 22 * s + 2, 94, 2.6, 3.6, '#fff');
      }
      ell(c, 36 * s, 113, 9, 5, 'rgba(240,110,140,.35)');
    }
    c.strokeStyle = '#c0566e'; c.lineWidth = 2.5; c.lineCap = 'round';
    c.beginPath(); c.arc(0, 110, 6, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  }

  function torsoPath(c) {
    c.beginPath();
    c.moveTo(-22, 146); c.lineTo(22, 146); c.lineTo(44, 158);
    c.lineTo(37, 244); c.lineTo(-37, 244); c.lineTo(-44, 158); c.closePath();
  }

  function top(c, t) {
    const col = t.color, dk = shade(col, -0.18);
    const sleeves = (len, w, color) => {
      limb(c, -44, 160, -44 - 14 * len, 160 + 84 * len, w, color);
      limb(c, 44, 160, 44 + 14 * len, 160 + 84 * len, w, color);
    };
    const body = fill => { torsoPath(c); c.fillStyle = fill; c.fill(); };
    switch (t.style) {
      case 'tee':
        sleeves(0.4, 24, col); body(col);
        c.strokeStyle = dk; c.lineWidth = 3; c.beginPath(); c.arc(0, 146, 11, 0, Math.PI); c.stroke();
        break;
      case 'hoodie':
        sleeves(0.98, 21, col); body(col);
        ell(c, 0, 150, 28, 11, dk);
        limb(c, -7, 158, -8, 186, 3, '#fff'); limb(c, 7, 158, 8, 186, 3, '#fff');
        rrect(c, -24, 204, 48, 24, 10, dk);
        break;
      case 'blouse':
        sleeves(0.3, 30, col); body(col);
        c.strokeStyle = dk; c.lineWidth = 2; torsoPath(c); c.stroke();
        poly(c, [-12, 158, 0, 165, -12, 172], t.accent); poly(c, [12, 158, 0, 165, 12, 172], t.accent);
        ell(c, 0, 165, 4, 4, shade(t.accent, -0.2));
        [186, 204, 222].forEach(y => ell(c, 0, y, 2.5, 2.5, dk));
        break;
      case 'sweater':
        sleeves(0.98, 22, col); body(col);
        c.save(); torsoPath(c); c.clip(); c.fillStyle = t.accent;
        [176, 204, 232].forEach(y => c.fillRect(-50, y, 100, 10)); c.restore();
        c.strokeStyle = dk; c.lineWidth = 5; c.beginPath(); c.arc(0, 146, 12, 0, Math.PI); c.stroke();
        break;
      case 'jacket':
        sleeves(0.98, 22, col); body('#ffffff');
        poly(c, [-22, 146, -6, 146, -12, 244, -37, 244, -44, 158], col);
        poly(c, mirror([-22, 146, -6, 146, -12, 244, -37, 244, -44, 158]), col);
        poly(c, [-22, 146, -6, 146, -14, 186], dk); poly(c, mirror([-22, 146, -6, 146, -14, 186]), dk);
        ell(c, -17, 214, 3, 3, dk);
        break;
    }
  }

  function bottom(c, b) {
    const col = b.color, dk = shade(col, -0.2);
    c.strokeStyle = dk; c.lineWidth = 2;
    switch (b.style) {
      case 'skirt':
        poly(c, [-35, 230, 35, 230, 58, 312, -58, 312], col);
        for (const x of [-24, -8, 8, 24]) { c.beginPath(); c.moveTo(x * 1.2, 246); c.lineTo(x * 1.9, 310); c.stroke(); }
        break;
      case 'longskirt':
        poly(c, [-35, 230, 35, 230, 54, 350, -54, 350], col);
        c.beginPath(); c.moveTo(-53, 340); c.lineTo(53, 340); c.stroke();
        break;
      case 'shorts':
        poly(c, [-37, 230, 37, 230, 41, 294, 3, 294, 0, 268, -3, 294, -41, 294], col);
        break;
      case 'pants':
        poly(c, [-37, 230, 37, 230, 31, 368, 4, 368, 0, 262, -4, 368, -31, 368], col);
        c.beginPath(); c.moveTo(-18, 270); c.lineTo(-18, 366); c.moveTo(18, 270); c.lineTo(18, 366); c.stroke();
        break;
    }
  }

  function shoes(c, s) {
    const col = s.color;
    switch (s.style) {
      case 'sneakers':
        rrect(c, -32, 360, 27, 24, 10, col); rrect(c, 5, 360, 27, 24, 10, col);
        rrect(c, -33, 380, 29, 8, 4, '#fff'); rrect(c, 4, 380, 29, 8, 4, '#fff');
        break;
      case 'boots':
        rrect(c, -30, 316, 23, 70, 8, col); rrect(c, 7, 316, 23, 70, 8, col);
        rrect(c, -33, 372, 28, 16, 7, col); rrect(c, 5, 372, 28, 16, 7, col);
        rrect(c, -31, 314, 25, 10, 5, shade(col, 0.25)); rrect(c, 6, 314, 25, 10, 5, shade(col, 0.25));
        break;
      case 'flats':
        ell(c, -18, 378, 15, 9, col); ell(c, 18, 378, 15, 9, col);
        break;
    }
  }

  function accessory(c, a) {
    const col = a.color, dk = a.style === 'none' ? col : shade(col, -0.25);
    switch (a.style) {
      case 'ribbon':
        poly(c, [44, 34, 22, 18, 24, 50], col); poly(c, [44, 34, 66, 18, 64, 50], col); ell(c, 44, 34, 6, 6, dk);
        break;
      case 'glasses':
        c.strokeStyle = col; c.lineWidth = 3;
        for (const s of [-1, 1]) { c.beginPath(); c.arc(22 * s, 98, 14, 0, Math.PI * 2); c.stroke(); }
        c.beginPath(); c.moveTo(-8, 97); c.lineTo(8, 97); c.moveTo(-36, 95); c.lineTo(-56, 91); c.moveTo(36, 95); c.lineTo(56, 91); c.stroke();
        break;
      case 'beret':
        ell(c, -6, 28, 62, 20, col, -0.12); ell(c, -8, 10, 5, 5, dk);
        break;
      case 'headphones':
        c.strokeStyle = col; c.lineWidth = 9; c.lineCap = 'round';
        c.beginPath(); c.arc(0, 84, 72, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
        rrect(c, -80, 74, 18, 36, 8, col); rrect(c, 62, 74, 18, 36, 8, col);
        break;
      case 'catears':
        c.strokeStyle = col; c.lineWidth = 5;
        c.beginPath(); c.arc(0, 84, 66, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
        poly(c, [-54, 40, -40, -4, -18, 26], col); poly(c, mirror([-54, 40, -40, -4, -18, 26]), col);
        poly(c, [-46, 34, -39, 10, -26, 27], '#f4a6c0'); poly(c, mirror([-46, 34, -39, 10, -26, 27]), '#f4a6c0');
        break;
    }
  }

  function item(equip, slot) { return byId[equip[slot]] || byId[defaults[slot]]; }

  // opts.time drives idle breathing + blinking; opts.bounce (0..1) squashes for an equip pop.
  function drawCharacter(c, equip, cx, topY, s, opts = {}) {
    const H = item(equip, 'hair');
    const t = opts.time || 0;
    const blink = opts.time != null && t % 3.7 < 0.13;
    const bob = Math.sin(t * 2.2) * 2.2;
    const b = opts.bounce || 0;
    const sq = Math.sin(b * Math.PI * 3) * b * 0.07;
    c.save();
    c.translate(cx, topY + 392 * s);
    c.scale(s * (1 + sq), s * (1 - sq));
    c.translate(0, -392 + bob * 0.4);
    ell(c, 0, 392, 64, 10, 'rgba(40,20,50,.15)');
    hairBack(c, H);
    rrect(c, -27, 240, 19, 132, 9, SKIN); rrect(c, 8, 240, 19, 132, 9, SKIN);
    limb(c, -44, 160, -58, 244, 15, SKIN); limb(c, 44, 160, 58, 244, 15, SKIN);
    rrect(c, -9, 128, 18, 30, 6, SKIN2);
    shoes(c, item(equip, 'shoes'));
    bottom(c, item(equip, 'bottom'));
    top(c, item(equip, 'top'));
    ell(c, -58, 250, 9, 9, SKIN); ell(c, 58, 250, 9, 9, SKIN);
    ell(c, -57, 94, 8, 11, SKIN); ell(c, 57, 94, 8, 11, SKIN);
    ell(c, 0, 84, 58, 58, SKIN);
    face(c, blink);
    hairFront(c, H);
    accessory(c, item(equip, 'acc'));
    c.restore();
  }

  function drawBackground(c, id, x, y, w, h) {
    const b = byId[id] || byId[defaults.bg];
    c.save();
    c.beginPath(); c.rect(x, y, w, h); c.clip();
    if (b.style === 'gradient') {
      const g = c.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, b.color); g.addColorStop(1, b.color2); c.fillStyle = g;
    } else c.fillStyle = b.color;
    c.fillRect(x, y, w, h);
    if (b.style === 'dots') {
      c.fillStyle = 'rgba(255,255,255,.6)';
      for (let gy = 0, row = 0; gy < h + 36; gy += 36, row++)
        for (let gx = row % 2 ? 18 : 0; gx < w + 36; gx += 36) { c.beginPath(); c.arc(x + gx, y + gy, 6, 0, Math.PI * 2); c.fill(); }
    } else if (b.style === 'stars') {
      c.fillStyle = '#fff7d6';
      for (let i = 0; i < 44; i++) {
        c.beginPath(); c.arc(x + ((i * 97) % w), y + ((i * 61 + i * i * 7) % h), 1 + (i % 3), 0, Math.PI * 2); c.fill();
      }
      ell(c, x + w - 60, y + 60, 24, 24, '#fff3c4');
    } else if (b.style === 'stripes') {
      c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 16;
      for (let k = -h; k < w; k += 44) { c.beginPath(); c.moveTo(x + k, y + h); c.lineTo(x + k + h, y); c.stroke(); }
    }
    c.fillStyle = 'rgba(255,255,255,.25)';
    c.fillRect(x, y + h * 0.82, w, h * 0.18);
    c.restore();
  }

  window.Wardrobe = { ITEMS, byId, defaults, drawCharacter, drawBackground };
})();
