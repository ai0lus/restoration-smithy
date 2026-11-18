// Sound effects synthesized with Web Audio (no audio files needed).
// The AudioContext is created/resumed on the first user gesture (browser autoplay rules).
(function () {
  const MUTE_KEY = 'arrow-dress.mute';
  let ctx = null, master = null, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) {}

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  addEventListener('pointerdown', ensure);
  addEventListener('keydown', ensure);

  function env(g, t, vol, attack, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function tone({ freq = 440, to = null, type = 'sine', dur = 0.15, vol = 0.3, delay = 0, attack = 0.005 }) {
    if (muted || !ensure()) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    env(g, t, vol, attack, dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise({ dur = 0.2, vol = 0.2, from = 800, to = 3000, delay = 0, type = 'bandpass' }) {
    if (muted || !ensure()) return;
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = type; f.Q.value = 1.2;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    env(g, t, vol, 0.005, dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }

  window.Sfx = {
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) {}
      if (!muted) this.click();
    },
    click() { tone({ freq: 660, type: 'triangle', dur: 0.06, vol: 0.12 }); },
    // combo: pitch rises with consecutive successful moves
    slide(combo = 0) {
      const p = 1 + Math.min(combo, 12) * 0.045;
      noise({ dur: 0.18, vol: 0.22, from: 600 * p, to: 3200 * p });
      tone({ freq: 420 * p, to: 900 * p, type: 'triangle', dur: 0.12, vol: 0.12 });
    },
    block() {
      tone({ freq: 160, to: 90, type: 'square', dur: 0.18, vol: 0.1 });
      noise({ dur: 0.1, vol: 0.18, from: 400, to: 150, type: 'lowpass' });
    },
    undo() { tone({ freq: 720, to: 420, type: 'triangle', dur: 0.14, vol: 0.13 }); },
    hint() {
      tone({ freq: 988, dur: 0.25, vol: 0.16 });
      tone({ freq: 1319, dur: 0.32, vol: 0.11, delay: 0.08 });
    },
    clear() {
      [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.3, vol: 0.17, delay: i * 0.09 }));
      tone({ freq: 1568, dur: 0.6, vol: 0.1, delay: 0.38 });
      noise({ dur: 0.5, vol: 0.05, from: 5000, to: 9000, type: 'highpass', delay: 0.36 });
    },
    fail() {
      [392, 330, 262].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.3, vol: 0.15, delay: i * 0.15 }));
    },
    equip() {
      [1175, 1568, 2093].forEach((f, i) => tone({ freq: f, dur: 0.22, vol: 0.1, delay: i * 0.05 }));
      noise({ dur: 0.25, vol: 0.06, from: 4000, to: 8000, type: 'highpass' });
    },
    locked() { tone({ freq: 220, to: 180, type: 'triangle', dur: 0.12, vol: 0.12 }); },
  };
})();
