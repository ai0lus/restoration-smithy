// Art loader. Characters, item pictures and UI skins are made in Codex (imagegen PNG or SVG)
// under assets/images/ (see CODEX_ASSETS.md). Each name tries <name>.png, then <name>.svg.
// Every lookup returns null until a file exists, and the game falls back to canvas drawing.
(function () {
  const imgs = {};
  const EXTS = ['png', 'svg'];

  function load(names) {
    for (const n of names) {
      let i = 0;
      const im = new Image();
      im.onload = () => { imgs[n] = im; };
      im.onerror = () => { if (++i < EXTS.length) im.src = `assets/images/${n}.${EXTS[i]}`; };
      im.src = `assets/images/${n}.${EXTS[0]}`;
    }
  }

  const img = n => imgs[n] || null;
  const size = im => [im.naturalWidth || im.width || 1, im.naturalHeight || im.height || 1];

  // Fit inside the box, keep aspect ratio. align: 'center' | 'bottom'
  function contain(c, n, x, y, w, h, align = 'center') {
    const im = img(n);
    if (!im) return false;
    const [iw, ih] = size(im);
    const s = Math.min(w / iw, h / ih);
    const dw = iw * s, dh = ih * s;
    c.drawImage(im, x + (w - dw) / 2, align === 'bottom' ? y + h - dh : y + (h - dh) / 2, dw, dh);
    return true;
  }

  // Fill the box, crop overflow (backgrounds).
  function cover(c, n, x, y, w, h) {
    const im = img(n);
    if (!im) return false;
    const [iw, ih] = size(im);
    const s = Math.max(w / iw, h / ih);
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.drawImage(im, x + (w - iw * s) / 2, y + (h - ih * s) / 2, iw * s, ih * s);
    c.restore();
    return true;
  }

  // 9-slice: the outer 25% of the source on each side is the corner/edge frame (any image size),
  // drawn `inset` px wide on screen; edges/center stretch (panels, buttons).
  function nine(c, n, x, y, w, h, inset = 24) {
    const im = img(n);
    if (!im) return false;
    const [iw, ih] = size(im);
    const s = Math.round(Math.min(iw, ih) * 0.25), d = Math.min(inset, w / 2, h / 2);
    const sx = [0, s, iw - s], sw = [s, iw - 2 * s, s];
    const sy = [0, s, ih - s], sh = [s, ih - 2 * s, s];
    const dx = [x, x + d, x + w - d], dw = [d, w - 2 * d, d];
    const dy = [y, y + d, y + h - d], dh = [d, h - 2 * d, d];
    for (let r = 0; r < 3; r++)
      for (let q = 0; q < 3; q++)
        if (dw[q] > 0 && dh[r] > 0) c.drawImage(im, sx[q], sy[r], sw[q], sh[r], dx[q], dy[r], dw[q], dh[r]);
    return true;
  }

  window.Assets = { load, img, contain, cover, nine };
})();
