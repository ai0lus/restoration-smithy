// Arrow puzzle rules + level generator.
// A piece is a chain of orthogonally adjacent cells, tail -> head, with `dir` = head direction.
//   piece = { id, cells: [{x,y}, ...], dir: 'U'|'D'|'L'|'R', gone?: bool }
// Tapping a piece moves it head-first: the body follows the head's own path, then continues
// straight off the board. It can leave only when every cell from the head to the edge in
// `dir` is empty (its own cells count as blocking).
(function () {
  const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
  const KEYS = ['U', 'D', 'L', 'R'];
  const ANGLE = { R: 0, D: Math.PI / 2, L: Math.PI, U: -Math.PI / 2 };
  const OPP = { U: 'D', D: 'U', L: 'R', R: 'L' };
  const CW = { U: 'R', R: 'D', D: 'L', L: 'U' };
  const CCW = { U: 'L', L: 'D', D: 'R', R: 'U' };

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rand) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const inBounds = (cols, rows, x, y) => x >= 0 && y >= 0 && x < cols && y < rows;
  const headOf = p => p.cells[p.cells.length - 1];

  // grid[y][x] = piece id or null
  function buildGrid(cols, rows, pieces) {
    const g = Array.from({ length: rows }, () => Array(cols).fill(null));
    for (const p of pieces) if (!p.gone) for (const c of p.cells) g[c.y][c.x] = p.id;
    return g;
  }

  // First occupied cell in front of the head ({x, y, id}), or null if the way out is clear.
  function blockerOf(grid, p, dir = p.dir, from = headOf(p)) {
    const [dx, dy] = DIRS[dir];
    const rows = grid.length, cols = grid[0].length;
    let x = from.x + dx, y = from.y + dy;
    while (inBounds(cols, rows, x, y)) {
      if (grid[y][x] != null) return { x, y, id: grid[y][x] };
      x += dx; y += dy;
    }
    return null;
  }

  const removable = (grid, pieces) => pieces.filter(p => !p.gone && !blockerOf(grid, p));

  // Is cell (x, y) strictly ahead of head h in direction dir?
  function onRay(h, dir, x, y) {
    const [dx, dy] = DIRS[dir];
    return dx ? y === h.y && (x - h.x) * dx > 0 : x === h.x && (y - h.y) * dy > 0;
  }

  // Deterministic per level; always solvable; fills (nearly) every '#' cell of the mask.
  //
  // Built in reverse solving order: each new arrow needs a clear way out past the arrows
  // already placed, so removing them newest-first always works. Later arrows may sit on an
  // earlier arrow's way out, which is what creates the blocking chains.
  // Shapes vary per arrow: short darts, straight bars, winding snakes and wall-hugging
  // spirals / U-turns.
  function generate(level, mask) {
    // Short arrows (1-2 dots) must never sit next to each other. Try several layouts and keep
    // the cleanest; if a pile still remains, drop arrows from it (leaves a few bare dots).
    const SHORT = 2;
    const piles = b => {
      const g = buildGrid(b.cols, b.rows, b.pieces), out = new Map();
      for (const p of b.pieces) {
        if (p.cells.length > SHORT) continue;
        const near = new Set();
        for (const c of p.cells) for (const k of KEYS) {
          const x = c.x + DIRS[k][0], y = c.y + DIRS[k][1];
          if (!inBounds(b.cols, b.rows, x, y) || g[y][x] == null || g[y][x] === p.id) continue;
          if (b.pieces[g[y][x]].cells.length <= SHORT) near.add(g[y][x]);
        }
        if (near.size) out.set(p.id, near);
      }
      return out;
    };
    let best = null, bestN = Infinity;
    for (let salt = 0; salt < 24 && bestN > 0; salt++) {
      const b = build(level, mask, salt), n = piles(b).size;
      if (n < bestN) { best = b; bestN = n; }
    }
    for (let m = piles(best); m.size; m = piles(best)) {
      let worst = null;
      for (const [id, near] of m) if (worst == null || near.size > m.get(worst).size) worst = id;
      best.pieces = best.pieces.filter(p => p.id !== worst).map((p, i) => ({ ...p, id: i }));
    }
    return best;
  }

  function build(level, mask, salt) {
    const rand = mulberry32(level * 7919 + 17 + salt * 104729);
    const rows = mask.length, cols = mask[0].length;
    const maxLen = Math.min(8 + level, 28);
    const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
    const free = (x, y) => inBounds(cols, rows, x, y) && mask[y][x] === '#' && grid[y][x] == null;
    const pieces = [];

    const pool = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (mask[y][x] === '#') pool.push({ x, y });
    shuffle(pool, rand);

    // cells to the edge in front of (x, y), or -1 if an arrow is in the way
    // Returns the number of still-empty dots on that way out: each is a place where a later
    // arrow can end up blocking this one. 0 = points straight off the board (free from the start).
    const rayLen = (x, y, dir) => {
      const [dx, dy] = DIRS[dir];
      let n = 0;
      x += dx; y += dy;
      while (inBounds(cols, rows, x, y)) {
        if (grid[y][x] != null) return -1;
        if (mask[y][x] === '#') n++;
        x += dx; y += dy;
      }
      return n;
    };
    // Difficulty: how strongly "blockable" directions are preferred over random ones.
    // Low levels keep more arrows free from the start; later levels chain them.
    const jitter = Math.max(1.5, 9 - level * 0.6);
    const dirCount = { U: 0, D: 0, L: 0, R: 0 };

    function pickLength() {
      const r = rand();
      if (r < 0.14) return 3 + Math.floor(rand() * 2);                      // dart
      if (r < 0.62) return 4 + Math.floor(rand() * 5);                      // medium
      return 9 + Math.floor(rand() * Math.max(1, maxLen - 8));              // long
    }

    for (let fails = 0; pool.length && fails < 80;) {
      // choose a head: deep cells (long way out) first, so the outside is filled last
      let best = null;
      for (let k = 0; k < 36 && pool.length; k++) {
        const i = Math.floor(rand() * pool.length), c = pool[i];
        if (grid[c.y][c.x] != null) { pool[i] = pool[pool.length - 1]; pool.pop(); continue; }
        for (const d of KEYS) {
          const [dx, dy] = DIRS[d];
          if (!free(c.x - dx, c.y - dy)) continue; // needs room for at least one body cell
          const r = rayLen(c.x, c.y, d);
          if (r < 0) continue;
          // prefer ways out that cross many empty dots (they will get blocked later), and
          // directions that are under-used so far, so all four directions stay mixed
          const share = dirCount[d] / (pieces.length + 4);
          const score = Math.min(r, 12) + rand() * jitter - share * 14;
          if (!best || score > best.score) best = { c, d, score };
        }
      }
      if (!best) { fails++; continue; }
      fails = 0;

      const id = pieces.length, head = best.c, dir = best.d;
      dirCount[dir]++;
      const cells = [head];
      grid[head.y][head.x] = id;
      const target = pickLength();
      const style = rand();                 // <.3 straight, <.6 winding, else spiral
      const side = rand() < 0.5 ? CW : CCW; // spiral turning side
      let h = OPP[dir], cur = head;         // grow the body backwards from the head
      while (cells.length < target) {
        let opts;
        if (cells.length === 1) opts = [h];
        else if (style < 0.3) opts = rand() < 0.08 ? shuffle([h, CW[h], CCW[h]], rand) : [h, ...shuffle([CW[h], CCW[h]], rand)];
        else if (style < 0.6) opts = rand() < 0.45 ? shuffle([h, CW[h], CCW[h]], rand) : [h, ...shuffle([CW[h], CCW[h]], rand)];
        else opts = [h, side[h], OPP[side[h]]];
        let moved = false;
        for (const d of opts) {
          const nx = cur.x + DIRS[d][0], ny = cur.y + DIRS[d][1];
          if (!free(nx, ny) || onRay(head, dir, nx, ny)) continue; // never across its own way out
          cur = { x: nx, y: ny }; cells.push(cur); grid[ny][nx] = id; h = d; moved = true;
          break;
        }
        if (!moved) break;
      }
      pieces.push({ cells: cells.reverse(), dir });
    }

    // Fill the leftover dots. `ord` is the placement order (solve order is highest ord first):
    // an arrow's way out must be clear of every arrow with a lower ord, so a dot may be taken by
    // an arrow only if every arrow whose way out crosses that dot has a lower ord than it.
    pieces.forEach((p, i) => { p.ord = i; });
    const flipX = rand() < 0.5, flipY = rand() < 0.5; // scan corner varies, so no direction is favoured
    for (let changed = true; changed;) {
      changed = false;
      for (let yy = 0; yy < rows; yy++) for (let xx = 0; xx < cols; xx++) {
        const x = flipX ? cols - 1 - xx : xx, y = flipY ? rows - 1 - yy : yy;
        if (!free(x, y)) continue;
        let lo = -Infinity; // highest ord among arrows whose way out crosses this dot
        for (const b of pieces) if (b.ord > lo && onRay(headOf(b), b.dir, x, y)) lo = b.ord;
        let done = false;
        // 1) lengthen a neighbouring arrow's tail
        for (const d of shuffle(KEYS.slice(), rand)) {
          const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
          if (!inBounds(cols, rows, nx, ny) || grid[ny][nx] == null) continue;
          const ai = grid[ny][nx], a = pieces[ai], tail = a.cells[0];
          if (tail.x !== nx || tail.y !== ny || a.cells.length > maxLen + 8) continue;
          if (a.cells.length === 1 && d !== a.dir) continue; // a one-dot arrow keeps its direction
          if (lo >= a.ord) continue;
          a.cells.unshift({ x, y }); grid[y][x] = ai; done = true;
          break;
        }
        // 2) a new one-dot arrow, slotted into the order between the arrows it must wait for
        //    and the arrows that must leave before it
        if (!done) {
          // try directions that leave room for a body behind the head first
          const dirs = shuffle(KEYS.slice(), rand)
            .sort((a, b) => (free(x - DIRS[b][0], y - DIRS[b][1]) ? 1 : 0) - (free(x - DIRS[a][0], y - DIRS[a][1]) ? 1 : 0));
          for (const d of dirs) {
            let hi = Infinity; // lowest ord among arrows standing in this dot's way out
            let cx = x + DIRS[d][0], cy = y + DIRS[d][1];
            while (inBounds(cols, rows, cx, cy)) {
              if (grid[cy][cx] != null) hi = Math.min(hi, pieces[grid[cy][cx]].ord);
              cx += DIRS[d][0]; cy += DIRS[d][1];
            }
            if (lo >= hi) continue;
            const ord = hi === Infinity ? (lo === -Infinity ? pieces.length : lo + 0.5)
              : (lo === -Infinity ? hi - 0.5 : (lo + hi) / 2);
            // grow it backwards through neighbouring leftover dots so it is a real line
            const id = pieces.length, head = { x, y }, cells = [head];
            grid[y][x] = id;
            const target = pickLength();
            let h = OPP[d], cur = head;
            while (cells.length < target) {
              const opts = cells.length === 1 ? [h] : [h, ...shuffle([CW[h], CCW[h]], rand)];
              let moved = false;
              for (const s of opts) {
                const nx = cur.x + DIRS[s][0], ny = cur.y + DIRS[s][1];
                if (!free(nx, ny) || onRay(head, d, nx, ny)) continue;
                if (pieces.some(b => b.ord >= ord && onRay(headOf(b), b.dir, nx, ny))) continue;
                cur = { x: nx, y: ny }; cells.push(cur); grid[ny][nx] = id; h = s; moved = true;
                break;
              }
              if (!moved) break;
            }
            pieces.push({ cells: cells.reverse(), dir: d, ord }); done = true;
            break;
          }
        }
        if (done) changed = true;
      }
    }

    // No piles of tiny arrows: a short arrow (1-3 dots) is absorbed into the tail of a
    // neighbouring arrow, becoming part of its body. Allowed only when every arrow whose way
    // out crosses those dots leaves after the absorbing arrow, so the puzzle stays solvable.
    const absorb = maxShort => {
      for (let si = 0; si < pieces.length; si++) {
        const s = pieces[si];
        if (s.dead || s.cells.length > maxShort) continue;
        let lo = -Infinity;
        for (const b of pieces) {
          if (b.dead || b === s || b.ord <= lo) continue;
          const bh = headOf(b);
          if (s.cells.some(c => onRay(bh, b.dir, c.x, c.y))) lo = b.ord;
        }
        const ends = [{ end: headOf(s), chain: s.cells }];
        if (s.cells.length > 1) ends.push({ end: s.cells[0], chain: s.cells.slice().reverse() });
        absorbed:
        for (const { end, chain } of ends) {
          for (const d of KEYS) {
            const nx = end.x + DIRS[d][0], ny = end.y + DIRS[d][1];
            if (!inBounds(cols, rows, nx, ny) || grid[ny][nx] == null || grid[ny][nx] === si) continue;
            const ai = grid[ny][nx], a = pieces[ai];
            if (a.cells[0].x !== nx || a.cells[0].y !== ny || lo >= a.ord) continue;
            if (a.cells.length === 1 && d !== a.dir) continue;
            for (const c of chain) grid[c.y][c.x] = ai;
            a.cells = chain.concat(a.cells);
            s.dead = true;
            break absorbed;
          }
        }
        if (s.dead) continue;
        // otherwise let a neighbouring arrow's head run on through the short arrow's dots,
        // if its new way out only crosses arrows that leave before it
        extended:
        for (const { end, chain } of ends) {
          const seq = chain.slice().reverse(); // starts at `end`
          for (const d of KEYS) {
            const nx = end.x + DIRS[d][0], ny = end.y + DIRS[d][1];
            if (!inBounds(cols, rows, nx, ny) || grid[ny][nx] == null || grid[ny][nx] === si) continue;
            const ai = grid[ny][nx], a = pieces[ai], ah = headOf(a);
            if (ah.x !== nx || ah.y !== ny || lo >= a.ord) continue;
            const nh = seq[seq.length - 1], prev = seq.length > 1 ? seq[seq.length - 2] : ah;
            const nd = nh.x > prev.x ? 'R' : nh.x < prev.x ? 'L' : nh.y > prev.y ? 'D' : 'U';
            let ok = true, cx = nh.x + DIRS[nd][0], cy = nh.y + DIRS[nd][1];
            while (ok && inBounds(cols, rows, cx, cy)) {
              const id = grid[cy][cx];
              if (id != null && (id === si || id === ai || pieces[id].ord <= a.ord)) ok = false;
              cx += DIRS[nd][0]; cy += DIRS[nd][1];
            }
            if (!ok) continue;
            for (const c of seq) grid[c.y][c.x] = ai;
            a.cells = a.cells.concat(seq); a.dir = nd;
            s.dead = true;
            break extended;
          }
        }
      }
    };
    absorb(1); absorb(2); absorb(3);

    // No arrow trains: when an arrow's head points straight into the tail of the next arrow
    // (head, tail, head, tail ... in one line), join them into one longer arrow. The joined
    // arrow keeps the front arrow's way out and order, so the puzzle stays solvable.
    for (let changed = true; changed;) {
      changed = false;
      for (let ti = 0; ti < pieces.length; ti++) {
        const t = pieces[ti];
        if (t.dead) continue;
        const th = headOf(t), fx = th.x + DIRS[t.dir][0], fy = th.y + DIRS[t.dir][1];
        if (!inBounds(cols, rows, fx, fy) || grid[fy][fx] == null) continue;
        const si = grid[fy][fx], s = pieces[si];
        if (si === ti || s.cells[0].x !== fx || s.cells[0].y !== fy) continue;
        if (s.cells.length === 1 && s.dir !== t.dir) continue;
        for (const c of t.cells) grid[c.y][c.x] = si;
        s.cells = t.cells.concat(s.cells);
        t.dead = true; changed = true;
      }
    }

    return { cols, rows, pieces: pieces.filter(p => !p.dead).map((p, i) => ({ id: i, cells: p.cells, dir: p.dir })) };
  }

  window.Puzzle = { DIRS, ANGLE, headOf, buildGrid, blockerOf, removable, generate };
})();
