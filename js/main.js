/* ————————————————————————————————————————————
   The Seventh Seal — an approach
   One pinned scene. One scrubbed timeline. Seven lines.
   The cliff is the spine: each time you look back up, he is nearer.
   ———————————————————————————————————————————— */
(() => {
  'use strict';

  const html = document.documentElement;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  window.addEventListener('pageshow', () => window.scrollTo(0, 0));

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';

  // Reduced motion or missing engine → the quiet vertical flow (default CSS).
  if (reduced || !hasGSAP) {
    const gate = document.getElementById('gate');
    if (gate) gate.remove();
    return;
  }

  html.classList.add('cine');
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  // Touch devices: stabilize the pinned viewport against address-bar resizes,
  // track flicks a little tighter, and shorten the total walk to suit thumbs.
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  if (isCoarse) ScrollTrigger.normalizeScroll(true);

  /* ————————————————— wind (synthesized — no audio files) ————————————————— */

  const Wind = (() => {
    let ctx = null, master = null, built = false, on = false;
    let progress = 0, lastApply = 0;

    const smooth = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
    const band = (p, a, b, c, d) =>
      (p <= a || p >= d) ? 0 : p < b ? smooth((p - a) / (b - a)) : p > c ? smooth(1 - (p - c) / (d - c)) : 1;

    // The wind thins as Death comes near, dies at the question,
    // returns faintly over the game, and is gone before the last words.
    function levelFor(p) {
      let l = 0.075;
      l *= 1 - 0.82 * band(p, 0.49, 0.575, 0.665, 0.725); // near-silence around "Are you ready?"
      l *= 1 - 0.5 * band(p, 0.775, 0.80, 0.845, 0.87);   // hushed over the game
      if (p > 0.85) l *= 1 - smooth(Math.min(1, (p - 0.85) / 0.05)); // silence from the last line on
      return l;
    }

    function build() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();

      // brown noise, two decorrelated loops
      const sr = ctx.sampleRate, len = sr * 4;
      const buf = ctx.createBuffer(2, len, sr);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        let last = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.5;
        }
      }

      master = ctx.createGain();
      master.gain.value = 0;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 38;
      hp.connect(master).connect(ctx.destination);

      const layer = (freq, q, lfoPeriod, lfoDepth, pan, gain) => {
        const src = ctx.createBufferSource();
        src.buffer = buf; src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q;
        const g = ctx.createGain(); g.gain.value = gain;
        const lfo = ctx.createOscillator();
        lfo.type = 'sine'; lfo.frequency.value = 1 / lfoPeriod;
        const lg = ctx.createGain(); lg.gain.value = lfoDepth;
        lfo.connect(lg); lg.connect(f.frequency); lfo.start();
        src.connect(f); f.connect(g);
        if (ctx.createStereoPanner) {
          const p = ctx.createStereoPanner(); p.pan.value = pan;
          g.connect(p); p.connect(hp);
        } else { g.connect(hp); }
        src.start(0, Math.random() * 3.5);
      };
      layer(310, 0.8, 11.0, 170, -0.22, 0.55); // high wind, slow swell
      layer(105, 0.6,  7.3,  42,  0.22, 0.75); // low surf

      built = true;
      return true;
    }

    function apply(force) {
      if (!built) return;
      const now = performance.now();
      if (!force && now - lastApply < 140) return;
      lastApply = now;
      master.gain.setTargetAtTime(on ? levelFor(progress) : 0, ctx.currentTime, 0.7);
    }

    return {
      start() {
        if (!built && !build()) return false;
        if (ctx.state === 'suspended') ctx.resume();
        on = true; apply(true);
        return true;
      },
      stop() { on = false; if (built) master.gain.setTargetAtTime(0, ctx.currentTime, 0.4); },
      setProgress(p) { progress = p; if (on) apply(false); },
      get on() { return on; }
    };
  })();

  /* ————————————————— grain ————————————————— */

  (() => {
    const canvas = document.getElementById('grain');
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    const tile = document.createElement('canvas');
    tile.width = tile.height = 144;
    const tctx = tile.getContext('2d');

    const size = () => {
      canvas.width = Math.ceil(window.innerWidth / 2);
      canvas.height = Math.ceil(window.innerHeight / 2);
    };
    size();
    window.addEventListener('resize', size);

    const stamp = () => {
      const img = tctx.createImageData(144, 144);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
      tctx.putImageData(img, 0, 0);
      ctx2d.fillStyle = ctx2d.createPattern(tile, 'repeat');
      ctx2d.save();
      ctx2d.translate(-(Math.random() * 144) | 0, -(Math.random() * 144) | 0);
      ctx2d.fillRect(0, 0, canvas.width + 144, canvas.height + 144);
      ctx2d.restore();
    };
    stamp();
    setInterval(stamp, 120);
  })();

  /* ————————————————— the living sea ————————————————— */

  const seaVideo = document.querySelector('#sh-sea .loop');
  let vidBroken = false;
  if (seaVideo) {
    seaVideo.muted = true;
    seaVideo.addEventListener('playing', () => seaVideo.closest('.shot').classList.add('live'));
    seaVideo.addEventListener('error', () => {
      vidBroken = true;
      seaVideo.closest('.shot').classList.remove('live');
    });
  }
  // Play only while the sea shot can be seen; the still beneath covers every failure.
  const syncSea = p => {
    if (!seaVideo || vidBroken) return;
    if (p < 0.075) {
      if (seaVideo.paused) seaVideo.play().catch(() => {});
    } else if (p > 0.095 && !seaVideo.paused) {
      seaVideo.pause();
    }
  };

  /* ————————————————— the score ————————————————— */

  const T = gsap.timeline({ paused: true, defaults: { ease: 'none' } });

  const img = id => `#${id} img`;
  const lines = gsap.utils.toArray('.line');

  gsap.set('.shot', { autoAlpha: 0 });
  gsap.set(lines, { xPercent: -50, yPercent: -50, x: 0, y: 14, autoAlpha: 0 });
  gsap.set(['#ln-afraid', '#ln-notafraid'], { y: 12, autoAlpha: 0 });
  gsap.set(['.card-film', '.card-epitaph'], { y: 10, autoAlpha: 0 });
  gsap.set('.veil-presence', { xPercent: 22, autoAlpha: 0 });

  const shotIn  = (id, at, d = 0.7)     => T.to('#' + id, { autoAlpha: 1, duration: d, ease: 'power1.inOut' }, at);
  const shotOut = (id, at, d = 0.6)     => T.to('#' + id, { autoAlpha: 0, duration: d, ease: 'power1.inOut' }, at);
  const drift   = (id, at, from, to, d) => T.fromTo(img(id), { scale: from }, { scale: to, duration: d, ease: 'none' }, at);
  const lineIn  = (sel, at, d = 0.5)    => T.to(sel, { autoAlpha: 1, y: 0, duration: d, ease: 'power1.out' }, at);
  const lineOut = (sel, at, d = 0.4)    => T.to(sel, { autoAlpha: 0, y: -10, duration: d, ease: 'power1.in' }, at);

  /* I. The sea is already there when the gate lifts — breathing, in no hurry.
        The pale figure stands at its edge. Nothing approaches until you move. */
  gsap.set('#sh-sea', { autoAlpha: 1 });
  T.fromTo('#sh-sea img, #sh-sea .loop', { scale: 1.0 }, { scale: 1.05, duration: 3.6, ease: 'none' }, 0.0);

  /* II. The man, alone before the water. */
  shotOut('sh-sea', 2.60, 0.70);
  shotIn('sh-alone', 2.65, 0.80);
  drift('sh-alone', 2.65, 1.0, 1.05, 3.4);

  /* III. Above his camp, on the high cliff — a figure. */
  shotOut('sh-alone', 4.50, 0.55);
  shotIn('sh-far', 5.35, 0.85);
  drift('sh-far', 5.35, 1.0, 1.05, 4.6);

  lineIn('#ln-who', 7.00);             /* — Who are you? */
  lineOut('#ln-who', 8.50);
  shotOut('sh-far', 8.95, 0.60);

  /* IV. The same cliff. No answer — only nearer. */
  shotIn('sh-closer', 9.80, 0.70);
  drift('sh-closer', 9.80, 1.0, 1.045, 3.4);

  /* V. Then the face, over his shoulder. */
  shotOut('sh-closer', 11.50, 0.45);
  shotIn('sh-face', 11.60, 0.50);
  drift('sh-face', 11.60, 1.02, 1.0, 3.0);

  lineIn('#ln-death', 12.60, 0.55);    /* — I am Death. */
  lineOut('#ln-death', 14.65, 0.45);
  shotOut('sh-face', 15.20, 0.55);

  /* VI. The man does not look up. */
  shotIn('sh-knight', 15.85, 0.60);
  drift('sh-knight', 15.85, 1.0, 1.035, 3.2);
  lineIn('#ln-come', 16.50);           /* — Have you come for me? */
  lineOut('#ln-come', 18.05);

  /* VII. He looks back up. The figure is standing over him now. */
  shotOut('sh-knight', 18.50, 0.50);
  shotIn('sh-looming', 18.55, 0.80);
  drift('sh-looming', 18.55, 1.0, 1.05, 4.4);
  T.to('.veil-presence', { autoAlpha: 0.55, xPercent: 0, duration: 1.6, ease: 'power1.out' }, 18.90);

  lineIn('#ln-beside', 19.90, 0.60);   /* — I have been walking beside you for a long time. */
  lineOut('#ln-beside', 21.75, 0.45);
  T.to('.veil-presence', { autoAlpha: 0, duration: 0.6 }, 22.25);
  shotOut('sh-looming', 22.30, 0.70);

  /* VIII. Nothing. Acceptance, in the dark. */
  lineIn('#ln-know', 23.10);           /* — I know. */
  lineOut('#ln-know', 25.20, 0.50);

  /* IX. The face, too close. The push does not stop. */
  shotIn('sh-close', 26.15, 0.70);
  drift('sh-close', 26.15, 1.0, 1.12, 5.0);
  lineIn('#ln-ready', 27.15, 0.55);    /* — Are you ready? */
  lineOut('#ln-ready', 29.00, 0.45);
  shotOut('sh-close', 29.50, 0.60);

  /* X. The man, eyes level. */
  shotIn('sh-stand', 30.40, 0.65);
  drift('sh-stand', 30.40, 1.02, 1.0, 4.2);
  lineIn('#ln-final', 31.20);
  lineIn('#ln-afraid', 31.20);         /* — My body is afraid. */
  lineIn('#ln-notafraid', 32.55, 0.55);/* — I am not. */
  lineOut('#ln-final', 34.45, 0.55);
  shotOut('sh-stand', 34.60, 0.70);

  /* XI. What remains: the game. */
  T.to('#sh-game', { autoAlpha: 0.42, duration: 0.80, ease: 'power1.inOut' }, 35.65);
  drift('sh-game', 35.65, 1.0, 1.03, 3.0);
  shotOut('sh-game', 37.65, 0.70);

  /* XII. The one thing the visitor now knows for themselves. */
  lineIn('#ln-thesis', 38.60, 0.60);   /* Death does not arrive. It has always been near. */
  lineOut('#ln-thesis', 40.70, 0.50);

  /* XIII. The card — after the last line, a longer black, so the claim can settle. */
  T.to('.card-film', { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power1.out' }, 41.90);
  T.to('.card-epitaph', { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power1.out' }, 43.55);
  T.to({}, { duration: 1.15 });        /* hold the card */

  /* ————————————————— scroll binding ————————————————— */

  const UNIT_VH = isCoarse ? 0.38 : 0.42; // scroll-length of one timeline unit, in viewport heights

  const st = ScrollTrigger.create({
    animation: T,
    trigger: '#scene',
    start: 'top top',
    end: () => '+=' + Math.round(T.duration() * Math.max(window.innerHeight, 480) * UNIT_VH),
    pin: true,
    scrub: isCoarse ? 1.0 : 1.2,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate(self) {
      Wind.setProgress(self.progress);
      syncSea(self.progress);
      if (self.progress > 0.004 && !html.classList.contains('moving')) {
        html.classList.add('moving');
      }
    }
  });

  // expose for verification / debugging
  window.__seal = { T, st, Wind, syncSea };

  /* ————————————————— threshold ————————————————— */

  const gate = document.getElementById('gate');
  const toggleBtn = document.getElementById('soundtoggle');
  let entered = false;

  const setToggleUI = on => {
    toggleBtn.classList.toggle('off', !on);
    toggleBtn.setAttribute('aria-pressed', String(on));
  };

  const enter = withSound => {
    if (entered) return;
    entered = true;
    if (withSound) setToggleUI(Wind.start());
    syncSea(0); // the sea breathes from the first frame
    html.classList.add('entered');
    gate.classList.add('leaving');
    setTimeout(() => gate.remove(), 2400);
    document.getElementById('scene').focus({ preventScroll: true });
    ScrollTrigger.refresh();
  };

  document.getElementById('enter-sound').addEventListener('click', () => enter(true));
  document.getElementById('enter-silence').addEventListener('click', () => enter(false));

  toggleBtn.addEventListener('click', () => {
    if (Wind.on) { Wind.stop(); setToggleUI(false); }
    else setToggleUI(Wind.start());
  });

  /* ————————————————— settle layout ————————————————— */

  const imgs = Array.from(document.images);
  Promise.all([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    ...imgs.map(i => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()))
  ]).then(() => ScrollTrigger.refresh());
})();
