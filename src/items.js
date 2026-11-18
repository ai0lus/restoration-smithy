// Old, worn-out items brought to the smithy for repair. Each item's `mask` is the puzzle map:
// '#' = a cell the arrows may occupy, '.' = empty. Max 10 wide x 13 tall.
// (`curse` is the damage description; the field name is left over from the first concept.)
(function () {
  // The player is the blacksmith. These five clients bring the items in (two items each);
  // portraits are assets/images/clients/<id>.png. `greet` = what she says at the counter.
  const CLIENTS = [
    { id: 'bard', name: '떠돌이 음유시인',
      greet: ['안녕하세요! 소문 듣고 찾아왔어요. 이거 고칠 수 있을까요?', '공연 때 꼭 필요한 물건이에요. 부탁드려도 될까요?'] },
    { id: 'mercenary', name: '은퇴한 용병',
      greet: ['오래 쓴 녀석이야. 아직 쓸 만하게 만들 수 있겠나?', '손에 익은 물건이라 버리질 못하겠더군. 좀 봐 주게.'] },
    { id: 'knight', name: '백발의 노기사',
      greet: ['젊은 시절을 함께한 물건이라네. 다시 빛을 볼 수 있겠는가?', '창고에 너무 오래 묵혀 두었지. 자네 솜씨를 믿어 보겠네.'] },
    { id: 'captain', name: '국경 수비대장',
      greet: ['수비대 비품입니다. 다음 순찰 전까지 수리를 부탁합니다.', '상태가 좋지 않습니다만, 가능하겠습니까?'] },
    { id: 'noble', name: '익명의 귀족 아가씨',
      greet: ['저… 집안에 내려오던 물건인데, 조용히 고쳐 주실 수 있나요?', '누가 맡겼는지는 비밀로 해 주세요. 부탁드려요.'] },
  ];

  const ITEMS = [
    { id: 'ring', name: '빛바랜 은반지', client: 'bard', reward: 60,
      curse: '오래 서랍에 넣어 둔 탓에 검게 변색되고 잔흠집이 가득하다.',
      mask: [
        '..###..',
        '.#####.',
        '##...##',
        '##...##',
        '##...##',
        '.#####.',
        '..###..',
      ] },
    { id: 'dagger', name: '이 빠진 단검', client: 'mercenary', reward: 80,
      curse: '날 곳곳의 이가 빠지고 손잡이 가죽이 삭아 너덜거린다.',
      mask: [
        '..#..',
        '.###.',
        '.###.',
        '.###.',
        '.###.',
        '.###.',
        '#####',
        '..#..',
        '.###.',
        '.###.',
        '..#..',
      ] },
    { id: 'amulet', name: '녹슨 목걸이', client: 'bard', reward: 100,
      curse: '사슬 고리가 늘어나고 펜던트에는 푸른 녹이 슬었다.',
      mask: [
        '##....##',
        '.##..##.',
        '..####..',
        '..####..',
        '.######.',
        '########',
        '########',
        '.######.',
        '..####..',
        '...##...',
      ] },
    { id: 'helmet', name: '찌그러진 투구', client: 'captain', reward: 120,
      curse: '옛 전투에서 맞은 자국이 그대로 남아 여기저기 움푹 패였다.',
      mask: [
        '..#####..',
        '.#######.',
        '#########',
        '#########',
        '###...###',
        '##.....##',
        '##.....##',
        '###...###',
        '.##...##.',
      ] },
    { id: 'sword', name: '녹슨 장검', client: 'knight', reward: 150,
      curse: '창고에서 수십 년을 보내 날 전체에 붉은 녹이 올랐다.',
      mask: [
        '...#...',
        '..###..',
        '..###..',
        '..###..',
        '..###..',
        '..###..',
        '..###..',
        '..###..',
        '#######',
        '.#####.',
        '...#...',
        '..###..',
        '..###..',
      ] },
    { id: 'gauntlet', name: '굳어버린 건틀릿', client: 'captain', reward: 170,
      curse: '관절마다 녹이 슬어 손가락이 전혀 굽혀지지 않는다.',
      mask: [
        '.#.#.#..',
        '.#.#.#..',
        '.#####..',
        '.######.',
        '.#######',
        '.######.',
        '.#####..',
        '..####..',
        '..####..',
        '.######.',
        '.######.',
      ] },
    { id: 'axe', name: '무뎌진 전투도끼', client: 'mercenary', reward: 190,
      curse: '자루가 헐겁게 흔들리고 날은 장작도 못 팰 만큼 무뎌졌다.',
      mask: [
        '....####.',
        '..#######',
        '.########',
        '.########',
        '..#######',
        '....####.',
        '....##...',
        '....##...',
        '....##...',
        '....##...',
        '....##...',
        '...####..',
      ] },
    { id: 'crown', name: '칠 벗겨진 왕관', client: 'noble', reward: 220,
      curse: '금박이 벗겨지고 보석은 흐려져 옛 광채를 찾아볼 수 없다.',
      mask: [
        '#...##...#',
        '##..##..##',
        '###.##.###',
        '##########',
        '##########',
        '##########',
        '##########',
        '.########.',
      ] },
    { id: 'shield', name: '금 간 방패', client: 'knight', reward: 240,
      curse: '한가운데에 금이 가고 테두리 리벳이 군데군데 빠졌다.',
      mask: [
        '#########',
        '#########',
        '#########',
        '#########',
        '#########',
        '#########',
        '.#######.',
        '.#######.',
        '..#####..',
        '...###...',
        '....#....',
      ] },
    { id: 'armor', name: '삭아버린 흉갑', client: 'noble', reward: 280,
      curse: '가죽 끈이 끊어지고 판금 이음새마다 녹이 번졌다.',
      mask: [
        '###....###',
        '####..####',
        '##########',
        '##########',
        '##########',
        '.########.',
        '.########.',
        '.########.',
        '..######..',
        '..######..',
        '...####...',
      ] },
  ];
  const STRENGTH = ['가벼운 손상', '심한 손상', '오랜 방치'];

  // Level n = the n-th commission. Items repeat in later rounds with stronger curses.
  // Each mask cell becomes k x k cells: same silhouette, much bigger knot.
  function scaleMask(mask, k) {
    if (k <= 1) return mask;
    const out = [];
    for (const row of mask) {
      const wide = Array.from(row, ch => ch.repeat(k)).join('');
      for (let i = 0; i < k; i++) out.push(wide);
    }
    return out;
  }

  function commission(level) {
    const base = ITEMS[(level - 1) % ITEMS.length];
    const round = Math.floor((level - 1) / ITEMS.length);
    return {
      ...base, level, round,
      client: CLIENTS.find(k => k.id === base.client),
      mask: scaleMask(base.mask, Math.min(2 + round, 4)), // dense from the start; later boards outgrow the screen
      strength: STRENGTH[Math.min(round, STRENGTH.length - 1)],
      reward: Math.round(base.reward * (1 + round * 0.5)),
    };
  }

  const COLORS = { old: '#7a5a44', fixed: '#d9cfbf', unknown: '#3d3530' };

  // Item picture. state: 'old' (worn, before repair) | 'fixed' (repaired) | 'unknown'.
  // Art: items/<id>_old.png and items/<id>.png; until the worn art exists, the repaired art is
  // shown dulled; with no art at all, the mask is drawn as pixels. glow=false skips the halo.
  function drawIcon(c, item, x, y, w, h, state, glow = true) {
    const A = window.Assets;
    const worn = A && A.img('items/' + item.id + '_old');
    const name = state === 'old' && worn ? 'items/' + item.id + '_old' : 'items/' + item.id;
    const img = A && A.img(name);
    c.save();
    if (state === 'fixed' && glow) {
      const g = c.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) * 0.6);
      g.addColorStop(0, 'rgba(242,193,78,.35)'); g.addColorStop(1, 'rgba(242,193,78,0)');
      c.fillStyle = g; c.fillRect(x, y, w, h);
    }
    if (img) {
      if (state === 'unknown') c.filter = 'grayscale(1) brightness(0.25)';
      else if (state === 'old' && !worn) c.filter = 'sepia(0.7) saturate(0.6) brightness(0.6)';
      A.contain(c, name, x, y, w, h);
    } else {
      const m = item.mask, rows = m.length, cols = m[0].length;
      const s = Math.min(w / cols, h / rows) * 0.9;
      const ox = x + (w - s * cols) / 2, oy = y + (h - s * rows) / 2;
      c.fillStyle = COLORS[state];
      for (let r = 0; r < rows; r++)
        for (let q = 0; q < cols; q++)
          if (m[r][q] === '#') c.fillRect(ox + q * s, oy + r * s, s + 0.5, s + 0.5);
    }
    c.restore();
  }

  window.Items = { ITEMS, CLIENTS, commission, drawIcon };
})();
