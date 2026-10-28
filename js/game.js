/* TT Elevator Dash: the page. The Three.js scene with a fixed side-on arcade camera that glides up and down the hotel with
   the courier, the HUD and screens, keys and touch, the brother who pops in and delivers the next parcel, the guests,
   the robots, the celebrations, and the window.game test hooks.
   The rules are js/sim.js (fixed 1/60 s steps); the 3D things are js/art.js; sounds are js/sfx.js. */
(function () {
  'use strict';
  const T = THREE, S = ED.sim, A = ED.art, SFX = ED.sfx, LV = ED.levels;
  const $ = (id) => document.getElementById(id);
  const PI = Math.PI, DT = S.DT, FH = S.FH, NF = S.NF;
  const KEY = 'elevatorDashTT.v1';
  const NAME = (id) => (Kit.roster.get(id) || { name: id.toUpperCase() }).name;
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const SCALE = 0.62; // the kit's people are 2 m tall; couriers here are about 1.25 m (floors are 3 m)
  const RSCALE = 0.82; // bellhop robots, a little taller than Tommy
  const FRIENDS = { easy: [['foxy', 12000], ['froggy', 7000]], normal: [['foxy', 20000], ['froggy', 12000]] };
  const Z_WALK = 0.15, Z_CAR = A.dims.CAR_Z + 0.1;

  const store = {
    d: {},
    load() {
      try { this.d = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { this.d = {}; }
      this.d.top = this.d.top || {};
    },
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.d)); } catch (e) { /* private mode: fine */ } },
    table(level) {
      const t = (this.d.top[level] || []).slice();
      for (const [who, score] of FRIENDS[level]) if (!t.some((r) => r.who === who && r.cpu)) t.push({ who, score, cpu: true });
      return t.sort((a, b) => b.score - a.score).slice(0, 6);
    },
    add(level, who, score) {
      if (!score) return null;
      const row = { who, score, at: Date.now() };
      const mine = (this.d.top[level] || []).concat([row]).sort((a, b) => b.score - a.score).slice(0, 5);
      this.d.top[level] = mine;
      this.save();
      return mine.includes(row) ? row : null;
    },
  };

  const G = {
    screen: 'loading', w: null, demo: false, paused: false, hold: false, autoPause: true, serial: 0,
    keys: {}, taps: {}, touch: { l: 0, r: 0, u: 0, d: 0, duck: 0 }, pillowBuf: 0, acc: 0, time: 0,
    players: 1, who: 'teddy', level: 'easy', sab: null, botInp: null, botK: 0,
    views: [], viewB: -1, scene2: null, cheerT: 0, overT: 0, throwT: 0, newRows: [], frame: 0,
    camY: NF * FH, k: 20, D: 40, offY: 0, doorAnim: {}, guestT: {}, stepSnd: 0,
  };
  let renderer, scene, cam, confetti, stars, robotStars, cloud, treat, ball, peace, blimp, carried, budParcel, last = 0;
  const people = {};
  let portraits = {};
  const robotMeshes = new Map(), robotPool = [];
  const pillowMeshes = [], towelMeshes = [];
  const v3 = new T.Vector3();

  // ---------- start-up ----------
  function boot() {
    renderer = new T.WebGLRenderer({ canvas: $('game'), antialias: true });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.setPixelRatio(Math.min(2, Math.max(1, devicePixelRatio || 1)));
    scene = new T.Scene();
    scene.background = new T.Color('#9fdcff');
    cam = new T.PerspectiveCamera(30, 1, 1, 400);
    scene.add(new T.HemisphereLight('#ffffff', '#c9b48a', 0.85));
    const sun = new T.DirectionalLight('#fff4dd', 0.7);
    sun.position.set(-8, 20, 30);
    scene.add(sun);
    A.backdrop(scene);
    confetti = A.confetti(scene, 700);
    for (const id of ['teddy', 'tommy', 'foxy', 'froggy']) {
      const r = Kit.roster.get(id);
      const p = Kit.people.build(r.look);
      p.root.scale.setScalar(SCALE * (id === 'foxy' || id === 'froggy' ? 0.95 : 1));
      p.root.visible = false;
      scene.add(p.root);
      people[id] = p;
    }
    stars = A.stars();
    stars.visible = false;
    scene.add(stars);
    robotStars = A.stars();
    robotStars.visible = false;
    scene.add(robotStars);
    cloud = new T.Group();
    for (let k = 0; k < 4; k++) {
      const m = new T.Mesh(new T.SphereGeometry(0.22 + (k % 2) * 0.06, 10, 8), new T.MeshStandardMaterial({ color: '#ffffff', emissive: '#dff4ff', emissiveIntensity: 0.4 }));
      m.position.set((k - 1.5) * 0.24, (k % 2) * 0.06, 0);
      cloud.add(m);
    }
    cloud.visible = false;
    scene.add(cloud);
    treat = A.emoji('🍦', 0.5);
    treat.visible = false;
    scene.add(treat);
    ball = A.emoji('🏀', 0.4);
    ball.visible = false;
    scene.add(ball);
    peace = A.emoji('✌️', 0.45);
    peace.visible = false;
    scene.add(peace);
    blimp = A.blimp();
    scene.add(blimp);
    carried = A.parcel(0.55); // in the kit's 2 m units: on the courier's back
    carried.position.set(0, 0.55, 0.36);
    budParcel = A.parcel(0.3);
    budParcel.visible = false;
    scene.add(budParcel);
    for (let i = 0; i < 3; i++) { const m = A.pillow(); m.visible = false; scene.add(m); pillowMeshes.push(m); }
    for (let i = 0; i < 4; i++) { const m = A.towel(); m.visible = false; scene.add(m); towelMeshes.push(m); }
    portraits = Kit.portraits(['teddy', 'tommy', 'foxy', 'froggy'].map((id) => Kit.roster.get(id)), { size: 128 });
    store.load();
    const o = store.d.opts || {};
    if (o.players === 2) G.players = 2;
    if (o.who === 'tommy') G.who = 'tommy';
    if (o.level === 'normal') G.level = 'normal';
    setupUI();
    addEventListener('resize', fit);
    showTitle();
    $('loading').classList.add('hidden');
    requestAnimationFrame(frame);
  }

  // ---------- the fixed side-on camera: the hotel's full width, about 4½ floors high, gliding with the courier ----------
  const BOX = { x0: -11.2, x1: 11.2, h: 13.6 };
  function fit() {
    const W = innerWidth, H = innerHeight;
    renderer.setSize(W, H, false);
    const short = H <= 460, narrow = W <= 520;
    let top = short ? 48 : narrow ? 56 : 66, bottom = 6, left = 58, right = 10;
    if (document.body.classList.contains('touch') && G.screen === 'play') {
      const s = short ? 0.82 : 1;
      if (H > W) bottom = 186 * s + 18;
      else { left = 64 + 186 * s + 4; right = 210 * s + 14; }
    }
    const sw = Math.max(50, W - left - right), sh = Math.max(50, H - top - bottom);
    const k = Math.min(sw / (BOX.x1 - BOX.x0), sh / BOX.h);
    const viewH = H / k;
    G.D = viewH / 2 / Math.tan((cam.fov * PI) / 360);
    G.offX = (left + sw / 2 - W / 2) / k;
    G.offY = (top + sh / 2 - H / 2) / k; // the free area's middle, below the screen's middle by this many metres
    G.viewH = viewH;
    G.freeH = sh / k;
    cam.aspect = W / H;
    cam.near = Math.max(1, G.D * 0.4);
    cam.far = G.D + 140;
    cam.updateProjectionMatrix();
    G.k = k;
    placeCam(true);
  }
  // where the middle of the free area looks: the courier's floor, kept inside the hotel (and the sky above it)
  function camWant() {
    const w = G.w;
    if (!w) return NF * FH;
    let y = S.py(w) + 1.4;
    const sc = G.scene2;
    if (sc && sc.kind === 'win') y = 1.6;
    if (w.phase === 'ready' && w.drop) y = NF * FH + 2.5;
    const lo = -0.6 + G.freeH / 2, hi = NF * FH + 9 - G.freeH / 2;
    return lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, y));
  }
  function placeCam(snap, dt) {
    const want = camWant();
    if (snap) G.camY = want;
    else G.camY += (want - G.camY) * (1 - Math.exp(-(dt || DT) * 5));
    const cx = (BOX.x0 + BOX.x1) / 2 - G.offX, cy = G.camY + G.offY;
    cam.position.set(cx, cy, G.D);
    cam.lookAt(cx, cy, 0);
    cam.updateMatrixWorld();
  }
  function toScreen(x, y, z) {
    v3.set(x, y, z || 0).project(cam);
    return [(v3.x * 0.5 + 0.5) * innerWidth, (-v3.y * 0.5 + 0.5) * innerHeight];
  }

  // ---------- games ----------
  function newWorld(demo) {
    const who = demo ? ['teddy'] : G.players === 2 ? ['teddy', 'tommy'] : [G.who];
    const w = S.create({ level: demo ? 'easy' : G.level, players: who, seed: (Math.random() * 1e9) | 0, buddyFor: (id) => Kit.roster.buddyFor(id) });
    G.serial++;
    return w;
  }
  function play() {
    Kit.sound.init();
    store.d.opts = { players: G.players, who: G.who, level: G.level };
    store.save();
    G.w = newWorld(false);
    G.demo = false;
    G.paused = false;
    G.overT = 0;
    G.scene2 = null;
    G.keys = {};
    G.taps = {};
    G.pillowBuf = 0;
    G.acc = 0;
    G.doorAnim = {};
    confetti.clear();
    clearPops();
    showScreen('play');
    setupBud();
    big(LV.NAMES[0], hotelLine());
    Kit.sound.music('play');
  }
  function setupBud() {
    const w = G.w;
    const two = w.two;
    const who = two ? null : Kit.roster.buddyFor(w.players[0].who);
    const img = two ? portraits[w.players[1 - w.cp].who] : portraits[who];
    $('budBtn').querySelector('img').src = img || '';
    document.querySelector('.tb.call img').src = img || '';
    setText($('budLbl'), two ? 'HIGH FIVE' : `CALL ${NAME(who)}`);
  }
  function call() {
    if (!G.w || G.demo || G.screen !== 'play' || G.paused) return false;
    const ok = S.call(G.w);
    if (ok) handleEvents(G.w.events.splice(0));
    return ok;
  }

  // ---------- screens ----------
  function showScreen(id) {
    G.screen = id;
    for (const s of ['title', 'pause', 'results']) $(s).classList.toggle('hidden', s !== id);
    $('hud').classList.toggle('hidden', id === 'title' || id === 'results');
    $('touch').classList.toggle('hidden', id !== 'play');
    $('menuMute').classList.toggle('hidden', id === 'play' || id === 'pause');
    document.body.classList.toggle('title', id === 'title');
    if (id !== 'play' && id !== 'pause') { $('bigmsg').classList.remove('show'); $('toast').classList.remove('show'); clearPops(); }
    fit();
  }
  function showTitle() {
    G.w = newWorld(true);
    G.demo = true;
    G.paused = false;
    G.scene2 = null;
    G.doorAnim = {};
    confetti.clear();
    clearPops();
    showScreen('title');
    refreshTitle();
    Kit.sound.music('title');
  }
  function refreshTitle() {
    document.querySelectorAll('[data-players]').forEach((b) => b.setAttribute('aria-checked', String(+b.dataset.players === G.players)));
    document.querySelectorAll('[data-who]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.who === G.who)));
    document.querySelectorAll('[data-level]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.level === G.level)));
    $('whoRow').classList.toggle('off', G.players === 2);
    const top = store.table(G.level)[0];
    setText($('titleHi'), `HI-SCORE ${fmt(top.score)} · ${NAME(top.who)}`);
  }
  function setOpt(k, v) {
    G[k] = v;
    SFX.click();
    refreshTitle();
  }
  function pause() {
    if (G.screen !== 'play' || G.paused) return;
    G.paused = true;
    showScreen('pause');
    Kit.sound.music('pause');
  }
  function resume() {
    if (!G.paused) return;
    G.paused = false;
    G.keys = {};
    G.touch = { l: 0, r: 0, u: 0, d: 0, duck: 0 };
    document.querySelectorAll('#touch .down').forEach((b) => b.classList.remove('down'));
    showScreen('play');
    Kit.sound.music('play');
  }
  function showResults() {
    const w = G.w;
    const ps = w.players;
    const bestScore = Math.max(...ps.map((p) => p.score));
    const winners = ps.filter((p) => p.score === bestScore);
    G.newRows = ps.map((p) => store.add(w.level, p.who, p.score)).filter(Boolean);
    const title = $('resTitle');
    if (ps.length === 2) setText(title, winners.length === 2 ? "IT'S A TIE!" : `${NAME(winners[0].who)} WINS!`);
    else setText(title, w.phase === 'won' ? 'ALL DELIVERED!' : 'GREAT DELIVERING!');
    const pl = ps[0];
    setText($('resSub'), ps.length === 2 ? `${NAME(ps[0].who)} ${fmt(ps[0].score)} · ${NAME(ps[1].who)} ${fmt(ps[1].score)}` : `${fmt(pl.score)} points · hotel ${pl.b + 1} of ${LV.COUNT}`);
    const rows = store.table(w.level);
    const tb = $('resTable');
    tb.innerHTML = '';
    const cap = document.createElement('caption');
    cap.textContent = w.level === 'easy' ? '🐣 TOP COURIERS' : '🔥 TOP COURIERS';
    tb.appendChild(cap);
    rows.forEach((r, i) => {
      const tr = document.createElement('tr');
      if (G.newRows.some((n) => n.at === r.at && n.who === r.who && n.score === r.score)) tr.className = 'me';
      tr.innerHTML = `<td class="rk">${i + 1}</td><td class="who"><img alt="" src="${portraits[r.who] || ''}"><span>${NAME(r.who)}</span></td><td class="pts">${fmt(r.score)}</td>`;
      tb.appendChild(tr);
    });
    const best = $('resBest');
    const isTop = G.newRows.some((n) => rows[0] && n.score === rows[0].score && n.who === rows[0].who && n.at === rows[0].at);
    setText(best, isTop ? '⭐ NEW HI-SCORE!' : G.newRows.length ? '⭐ ON THE BOARD!' : '');
    best.classList.toggle('new', G.newRows.length > 0);
    G.scene2 = { kind: 'win', who: winners.map((p) => p.who), t: 0 };
    showScreen('results');
    Kit.sound.music('over');
  }

  // ---------- keys and touch ----------
  const DIRS = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd' };
  const PILLOW = ['Space', 'KeyJ', 'KeyK', 'KeyX'];
  const DUCK = ['KeyZ', 'ShiftLeft', 'ShiftRight'];
  function held(d) {
    for (const c in G.keys) if (G.keys[c] && DIRS[c] === d) return true;
    return !!(G.touch[d] || G.taps[d]);
  }
  function readInput() {
    let lr = (held('r') ? 1 : 0) - (held('l') ? 1 : 0);
    let ud = (held('u') ? 1 : 0) - (held('d') ? 1 : 0);
    let duck = DUCK.some((c) => G.keys[c]) || !!G.touch.duck;
    if (G.sab === 'mirror') lr = -lr; // the play check's own sabotages
    if (G.sab === 'stuckCar' && G.w.p.mode === 'car') { lr = 0; ud = 0; }
    if (G.sab === 'stuckDuck' && G.w.p.duck) duck = true;
    G.taps = {};
    return { lr, ud, duck, pillow: G.pillowBuf > 0 };
  }
  function setupUI() {
    const logo = () => {
      const zh = Kit.lang.is('zh');
      $('logoText').textContent = zh ? ED.ZH : ED.TITLE;
      $('logoSub').textContent = zh ? ED.TITLE : '';
    };
    $('tagline').textContent = ED.TAGLINE;
    logo();
    Kit.lang.onChange(logo);
    document.querySelectorAll('[data-who] img').forEach((im) => (im.src = portraits[im.parentNode.dataset.who] || ''));
    document.querySelectorAll('[data-players]').forEach((b) => b.addEventListener('click', () => setOpt('players', +b.dataset.players)));
    document.querySelectorAll('[data-who]').forEach((b) => b.addEventListener('click', () => setOpt('who', b.dataset.who)));
    document.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => setOpt('level', b.dataset.level)));
    $('startBtn').addEventListener('click', play);
    $('pauseBtn').addEventListener('click', pause);
    $('resumeBtn').addEventListener('click', resume);
    $('quitBtn').addEventListener('click', showTitle);
    $('againBtn').addEventListener('click', play);
    $('menuBtn').addEventListener('click', showTitle);
    $('budBtn').addEventListener('click', call);
    const syncMute = () => document.querySelectorAll('.muteBtn').forEach((b) => (b.textContent = Kit.sound.isMuted() ? '🔇' : '🔊'));
    document.querySelectorAll('.muteBtn').forEach((b) => b.addEventListener('click', () => { Kit.sound.init(); Kit.sound.toggleMute(); syncMute(); }));
    Kit.sound.onMute(syncMute);
    syncMute();

    addEventListener('pointerdown', (e) => {
      Kit.sound.init();
      if (e.pointerType === 'touch' && !document.body.classList.contains('touch')) {
        document.body.classList.add('touch');
        fit();
      }
    }, true);
    if (matchMedia('(hover: none) and (pointer: coarse)').matches || /[?&]touch=1/.test(location.search)) document.body.classList.add('touch');

    addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      Kit.sound.init();
      const c = e.code;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(c)) e.preventDefault();
      if (c === 'KeyM' && !e.repeat) { Kit.sound.toggleMute(); syncMute(); return; }
      if (G.screen === 'title') {
        if (e.repeat) return;
        if (c === 'Digit1') setOpt('players', 1);
        else if (c === 'Digit2') setOpt('players', 2);
        else if (c === 'KeyE') setOpt('level', 'easy');
        else if (c === 'KeyN') setOpt('level', 'normal');
        else if ((c === 'KeyC' || c === 'ArrowLeft' || c === 'ArrowRight') && G.players === 1) setOpt('who', G.who === 'teddy' ? 'tommy' : 'teddy');
        else if (c === 'Enter' || c === 'Space') play();
        return;
      }
      if (G.screen === 'results') {
        if (e.repeat) return;
        if (c === 'Enter' || c === 'Space') play();
        else if (c === 'Escape' || c === 'KeyQ') showTitle();
        return;
      }
      if (G.paused) {
        if (e.repeat) return;
        if (c === 'KeyP' || c === 'Escape' || c === 'Space' || c === 'Enter') resume();
        else if (c === 'KeyQ') showTitle();
        return;
      }
      if (G.screen === 'play') {
        if ((c === 'KeyP' || c === 'Escape') && !e.repeat) return pause();
        if ((c === 'KeyT' || c === 'Enter' || c === 'NumpadEnter') && !e.repeat) { call(); return; }
        if (PILLOW.includes(c)) { if (!e.repeat) G.pillowBuf = 0.15; return; }
        G.keys[c] = true;
        if (DIRS[c]) G.taps[DIRS[c]] = true; // a tap shorter than a frame still moves
      }
    });
    addEventListener('keyup', (e) => { G.keys[e.code] = false; });
    addEventListener('blur', () => { G.keys = {}; G.touch = { l: 0, r: 0, u: 0, d: 0, duck: 0 }; });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && G.autoPause && G.screen === 'play' && !G.paused) pause();
      if (document.hidden) Kit.sound.suspend();
      else Kit.sound.resume();
    });

    // touch: the arrow cross, the pillow, duck and the brother's face
    const capture = (el, e) => { try { el.setPointerCapture(e.pointerId); } catch (err) { /* a test's pointer: fine */ } };
    document.querySelectorAll('#touch [data-k]').forEach((b) => {
      const k = b.dataset.k;
      const on = (v) => {
        b.classList.toggle('down', v);
        if (k === 'call') { if (v) call(); return; }
        if (k === 'pillow') { if (v) G.pillowBuf = 0.15; return; }
        G.touch[k] = v ? 1 : 0;
        if (v && k !== 'duck') G.taps[k] = true;
      };
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); capture(b, e); on(true); });
      b.addEventListener('pointerup', () => on(false));
      b.addEventListener('pointercancel', () => on(false));
      b.addEventListener('lostpointercapture', () => on(false));
    });
  }

  // ---------- each frame ----------
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, Math.max(0, (now - (last || now)) / 1000));
    last = now;
    if (!G.hold) advance(dt);
    draw();
  }
  function advance(dt) {
    G.time += dt;
    G.frame++;
    const w = G.w;
    if (!w) return;
    const frozen = G.paused || G.screen === 'pause';
    if (!frozen) {
      G.acc = Math.min(G.acc + dt, 0.25);
      while (G.acc >= DT - 1e-9) {
        G.acc -= DT;
        tick();
      }
      visuals(dt);
    }
  }
  function tick() {
    const w = G.w;
    let inp;
    if (G.demo) {
      if (G.botK++ % 3 === 0 || !G.botInp) G.botInp = ED.bot.decide(w);
      else G.botInp = { lr: G.botInp.lr, ud: G.botInp.ud, duck: G.botInp.duck, pillow: false };
      inp = G.botInp;
    } else if (G.screen === 'play') inp = readInput();
    else inp = {};
    S.step(w, inp);
    if (w.events.some((e) => e.type === 'pillow')) G.pillowBuf = 0;
    else G.pillowBuf = Math.max(0, G.pillowBuf - DT);
    handleEvents(w.events);
    if (G.demo) {
      if (w.phase === 'won' || w.phase === 'over' || w.t > 240 || (w.phase === 'clear' && w.phaseT > 4)) showDemoAgain();
    } else if ((w.phase === 'over' || w.phase === 'won') && G.screen === 'play') {
      G.overT += DT;
      if (G.overT > (w.phase === 'won' ? 3 : 2.2)) showResults();
    }
  }
  function showDemoAgain() {
    G.w = newWorld(true);
    G.doorAnim = {};
    placeCam(true);
  }

  // ---------- what the rules said happened ----------
  function handleEvents(evs) {
    const w = G.w;
    const loud = !G.demo;
    const snd = (f, ...a) => { if (loud) f(...a); };
    const here = (f) => Math.abs(f * FH - G.camY) < G.viewH / 2 + 2;
    for (const e of evs) {
      switch (e.type) {
        case 'go': snd(SFX.go); big('GO!'); break;
        case 'pillow': snd(SFX.pillow); G.throwT = 0.28; break;
        case 'puff': snd(SFX.puff); confetti.burst(e.x, e.f * FH + 1, 0.5, 26, 3.5, ['#ffffff', '#e8f6ff', '#bfe9ff']); pop(e.x, e.f * FH + 1.8, 'BOING! +100'); break;
        case 'feathers': confetti.burst(e.x, e.f * FH + e.y, 0.4, 8, 1.5, ['#ffffff', '#e8f6ff']); break;
        case 'float': if (e.sorry) pop(e.x, e.f * FH + 2.1, 'SORRY!', 'small'); else snd(SFX.float); break;
        case 'robotOut': snd(SFX.robot); confetti.burst(e.x, e.f * FH + 1, -1.2, 10, 2, ['#e63946', '#ffc83d']); break;
        case 'towel': snd(SFX.towel); break;
        case 'dodge': snd(SFX.dodge); pop(w.p.x, e.f * FH + 1.7, 'WHOOSH! +50'); break;
        case 'bump': snd(SFX.bump); pop(e.x, e.f * FH + 1.9, e.by === 'towel' ? 'FLUMP!' : 'OOF!', 'ouch'); break;
        case 'deliver': {
          snd(SFX.deliver);
          G.doorAnim[e.i] = 0.001;
          if (here(e.f)) {
            pop(e.x, e.f * FH + 2.3, 'THANK YOU! +500', 'big');
            confetti.burst(e.x, e.f * FH + 1.6, -1, 30, 3.5);
          }
          if (e.by === 'buddy' && e.left > 0 && !here(e.f)) toast(`PARCEL ${e.i + 1} DELIVERED!`);
          break;
        }
        case 'notYet': snd(SFX.nope); pop(e.x, e.f * FH + 2.3, `PARCEL ${e.next + 1} FIRST!`, 'small'); break;
        case 'allDone': snd(SFX.allDone); big('ALL PARCELS DELIVERED!', 'NOW RIDE DOWN TO THE GARAGE 🚐'); break;
        case 'vanWait': snd(SFX.honk); pop(w.L.vanX, 2.6, e.left === 1 ? '1 PARCEL LEFT!' : `${e.left} PARCELS LEFT!`, 'small'); break;
        case 'clear':
          snd(SFX.clear);
          G.scene2 = { kind: 'clear', t: 0 };
          big('HOTEL DONE!', `BONUS +${fmt(e.bonus)}`);
          confetti.burst(w.p.x, 1.4, 0.6, 70, 5);
          break;
        case 'building': G.scene2 = null; G.doorAnim = {}; big(LV.NAMES[w.L.index], hotelLine()); placeCam(true); break;
        case 'won': snd(SFX.won); big('ALL 5 HOTELS!', 'SUPER COURIER!'); break;
        case 'turn': snd(SFX.turn); big(`${NAME(e.who)}'S TURN!`); setTimeout(setupBud, 0); break;
        case 'out': if (w.two) toast(`${NAME(e.who)} IS OUT OF LIVES`); break;
        case 'over': snd(SFX.gameOver); big('GAME OVER'); break;
        case 'buddyIn': snd(SFX.buddy); confetti.burst(w.p.x - w.p.face, S.py(w) + 1, 0.6, 16, 2.5, ['#ffffff', '#bff3ff']); break;
        case 'treat': snd(SFX.treat); pop(w.p.x, S.py(w) + 1.6, `${e.e} +100`); break;
        case 'buddyShout':
          snd(SFX.zoom);
          toast(e.target >= 0 ? `${NAME(e.who)} SAYS: I'LL TAKE PARCEL ${e.target + 1}!` : `${NAME(e.who)} SAYS: GO TO THE GARAGE!`);
          break;
        case 'hi5': snd(SFX.hi5); pop(w.p.x, S.py(w) + 1.8, 'HIGH FIVE! ✋ +50', 'big'); confetti.burst(w.p.x, S.py(w) + 1.2, 0.6, 30, 3.5); break;
        case 'extraLife': snd(SFX.life); pop(w.p.x, S.py(w) + 2, 'EXTRA LIFE!', 'big'); break;
        case 'ding': if (e.rider || here(e.f)) { snd(SFX.ding); } break;
        case 'enter': case 'exit': snd(SFX.doors); break;
        case 'lift': snd(SFX.hum, e.dir > 0); break;
        case 'call': snd(SFX.call); break;
      }
    }
  }
  const floorName = (f) => (f === NF ? 'ROOF' : f === 0 ? 'GARAGE' : `FLOOR ${f}`);
  const hotelLine = () => (G.w ? `HOTEL ${G.w.L.index + 1} OF ${LV.COUNT}` : '');

  // ---------- pops, bubbles, toasts, big words (page text, so 中文 works by itself) ----------
  function pop(x, y, text, cls) {
    if (G.demo) return;
    const [sx, sy] = toScreen(x, y, 0.5);
    const d = document.createElement('div');
    d.className = 'pop' + (cls ? ' ' + cls : '');
    d.textContent = text;
    d.style.left = sx + 'px';
    d.style.top = sy + 'px';
    $('pops').appendChild(d);
    setTimeout(() => d.remove(), 1300);
  }
  function clearPops() { $('pops').innerHTML = ''; }
  let toastTimer = 0;
  function toast(text) {
    const t = $('toast');
    t.textContent = text;
    t.classList.remove('show');
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }
  let bigTimer = 0;
  function big(text, small) {
    if (G.demo) return;
    const b = $('bigmsg');
    b.innerHTML = '';
    b.appendChild(document.createTextNode(text));
    if (small) { const s = document.createElement('small'); s.textContent = small; b.appendChild(s); }
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
    clearTimeout(bigTimer);
    bigTimer = setTimeout(() => b.classList.remove('show'), 1600);
  }
  function setText(el, s) {
    if (el._t === s) return;
    el._t = s;
    el.textContent = s;
  }

  // ---------- drawing the world ----------
  function hotelView() {
    const L = G.w.L;
    if (G.viewB !== L.index) {
      G.views.forEach((v) => v && (v.group.visible = false));
      if (!G.views[L.index]) { G.views[L.index] = A.hotel(L); scene.add(G.views[L.index].group); }
      G.views[L.index].group.visible = true;
      G.viewB = L.index;
    }
    return G.views[L.index];
  }
  const FACE_R = -2.02, FACE_L = 2.02;
  const turn = (cur, want, k) => cur + (((want - cur + PI * 3) % (PI * 2)) - PI) * k;
  function signature(who, n) {
    const sig = (Kit.roster.get(who) || {}).signature || ['wave'];
    return sig[(n || 0) % sig.length];
  }
  function visuals(dt) {
    const w = G.w, V = hotelView();
    const t = G.time;
    for (const c of A.clouds) { c.position.x += c.userData.v * dt; if (c.position.x > 90) c.position.x = -90; }
    // lift cars and their glass doors
    w.cars.forEach((c, i) => { V.cars[i].position.y = c.y; });
    V.doors((s, f) => { const c = w.cars[s]; return c.to < 0 && c.at === f ? c.door : 0; });
    // parcel doors: the next one glows; delivered ones swing open for the guest, then show a heart
    const pl = w.players[w.cp];
    V.targets.forEach((d, i) => {
      const next = i === pl.done && w.phase !== 'clear';
      const done = i < pl.done;
      d.glow.visible = next;
      d.glow.material.opacity = 0.55 + Math.sin(t * 5) * 0.25;
      d.lamp.material.emissiveIntensity = next ? 1.2 + Math.sin(t * 6) * 0.5 : done ? 0.6 : 0.15;
      d.lamp.material.color.set(done ? '#7dff5a' : '#ffd400');
      d.lamp.material.emissive.set(done ? '#2fbf3a' : '#ffb000');
      let a = G.doorAnim[i];
      if (a) {
        a += dt;
        G.doorAnim[i] = a;
        if (a > 2.6) { delete G.doorAnim[i]; a = 0; }
      }
      const open = a ? Math.min(1, a * 4, (2.6 - a) * 3) : 0;
      d.pivot.rotation.y = -open * 1.4;
      d.guest.visible = open > 0.2;
      d.guest.position.y = d.t.f * FH + 1.25 + Math.abs(Math.sin(t * 8)) * 0.12 * open;
      d.guest.scale.setScalar(0.95 * open);
      const badge = done ? '💖' : ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'][i];
      if (d.badgeE !== badge) { d.badgeE = badge; d.badge.material.map = Kit.gfx.emojiTexture(badge); }
    });
    // the van drives away at the end of a hotel
    const sc = G.scene2;
    if (sc) sc.t += dt;
    const vanGo = sc && sc.kind === 'clear' && sc.t > 2.2 ? sc.t - 2.2 : 0;
    V.van.position.x = w.L.vanX + Math.sign(w.L.vanX) * vanGo * vanGo * 5;
    V.van.userData.body.position.y = vanGo ? Math.abs(Math.sin(t * 20)) * 0.04 : 0;
    if (vanGo && !sc.honked) { sc.honked = true; if (!G.demo) SFX.honk(); }
    // the blimp over the roof
    blimp.position.set(w.L.startX - 0.3 * Math.sign(w.L.startX) + Math.sin(t * 0.4) * 0.3, NF * FH + 7.3 + Math.sin(t * 0.9) * 0.2, -0.6);
    blimp.rotation.y = w.L.startX > 0 ? 0 : PI;
    blimp.userData.prop.rotation.x = t * 20;
    G.cheerT = Math.max(0, G.cheerT - dt);
    G.throwT = Math.max(0, G.throwT - dt);
    courier(dt);
    robots(dt);
    flying();
    buddy(dt);
    spectators(dt);
    confetti.update(dt);
    if (sc && (sc.kind === 'win' || sc.kind === 'clear') && sc.t < 3 && Math.floor(sc.t * 2) !== Math.floor((sc.t - dt) * 2)) confetti.rain(-8, 8, G.camY + 6, 26);
    placeCam(false, dt);
    hud();
  }

  function courier(dt) {
    const w = G.w, p = w.p, pl = w.players[w.cp];
    const k = 1 - Math.exp(-16 * dt);
    const P = people[pl.who];
    const other = w.two ? people[w.players[1 - w.cp].who] : null;
    for (const id of ['teddy', 'tommy']) if (people[id] !== P && people[id] !== other) people[id].root.visible = false;
    const sc = G.scene2;
    stars.visible = false;
    ball.visible = false;
    peace.visible = false;
    blimp.userData.rope.visible = false;
    if (sc && sc.kind === 'win') return winPose(sc, dt, k);
    const gone = w.phase === 'turn' || w.phase === 'over' || p.mode === 'gone' || (sc && sc.kind === 'clear' && sc.t > 2.2);
    P.root.visible = !gone;
    if (carried.parent !== P.hips) P.hips.add(carried);
    carried.visible = pl.done < w.L.targets.length && p.mode !== 'cheer';
    if (gone) return;
    let x = p.x, y = S.py(w) + (p.mode === 'car' ? 0.12 : 0), mode = 'stand', ph = 0, want = p.face > 0 ? FACE_R : FACE_L; // in a lift he stands on its floor plate
    let z = p.mode === 'car' ? Z_CAR : Z_WALK;
    if (w.phase === 'ready' && w.drop) {
      // the blimp lowers him onto the roof on a rope
      const u = Math.min(1, w.phaseT / S.READY);
      y = NF * FH + (1 - u) * 4.2;
      mode = 'jump';
      want = PI;
      const r = blimp.userData.rope;
      r.visible = true;
      blimp.updateMatrixWorld();
      const top = blimp.worldToLocal(v3.set(x, NF * FH + 5.6, 0.15)).clone();
      const bot = blimp.worldToLocal(v3.set(x, y + 1.25, 0.15)).clone();
      r.position.copy(top).add(bot).multiplyScalar(0.5);
      r.scale.y = Math.max(0.01, top.distanceTo(bot));
    }
    if (p.mode === 'walk') {
      if (p.duck) mode = 'duck';
      else if (Math.abs(p.vx) > 0.1 && w.phase === 'play') {
        mode = 'run';
        ph = p.walkT * 3.4;
        if (Math.floor(ph / PI) !== Math.floor((ph - Math.abs(p.vx) * dt * 3.4) / PI) && !G.demo && G.time - G.stepSnd > 0.12) { G.stepSnd = G.time; SFX.step(); }
      }
    } else if (p.mode === 'car') want = PI;
    else if (p.mode === 'dizzy') want = PI;
    else if (p.mode === 'cheer') { want = PI; mode = signature(pl.who, w.L.index); ph = G.time * 8; }
    if (sc && sc.kind === 'clear' && sc.t < 2.2) { x = w.L.vanX - Math.sign(w.L.vanX) * 1.7; z = 0.8; }
    if (G.throwT > 0 && p.mode === 'walk' && !p.duck) mode = 'give';
    P.root.position.x = x;
    P.root.position.y = y;
    P.root.position.z += (z - P.root.position.z) * Math.min(1, k * 0.8);
    P.root.scale.setScalar(SCALE);
    P.root.rotation.y = turn(P.root.rotation.y, want, Math.min(1, k * 1.4));
    Kit.people.pose(P, ph, mode === 'duck' ? 'stand' : mode, k);
    P.rig.position.y = 0;
    if (mode === 'duck') {
      // crouched, hands on the head: towels fly over
      P.legL.rotation.x = P.legR.rotation.x = 1.5;
      P.armL.rotation.x = P.armR.rotation.x = 2.7;
      P.armL.rotation.z = -0.5;
      P.armR.rotation.z = 0.5;
      P.rig.position.y = -0.7;
    }
    if (p.mode === 'dizzy') {
      P.legL.rotation.x = P.legR.rotation.x = 1.45;
      P.armL.rotation.z = -0.9;
      P.armR.rotation.z = 0.9;
      P.rig.position.y = -0.6;
      stars.visible = true;
      P.head.getWorldPosition(v3);
      stars.position.set(v3.x, v3.y + 0.3, v3.z);
      stars.userData.spin(G.time);
    }
    // blinking while safe after a bump
    if (p.inv > 0 && p.mode === 'walk') P.root.visible = Math.floor(G.time * 10) % 2 === 0;
    if (p.mode === 'cheer') props(P, mode);
  }
  function props(P, mode) {
    if (mode === 'jumpshot') {
      P.root.position.y += Math.abs(Math.sin(G.time * 4)) * 0.4;
      ball.visible = true;
      P.root.updateMatrixWorld();
      Kit.people.handWorld(P, 1, v3);
      ball.position.set(v3.x, v3.y + 0.25 + Math.max(0, Math.sin(G.time * 4)) * 0.8, v3.z + 0.2);
    } else if (mode === 'peace') {
      peace.visible = true;
      P.head.getWorldPosition(v3);
      peace.position.set(v3.x + 0.45, v3.y + 0.3 + Math.sin(G.time * 5) * 0.06, v3.z + 0.3);
    }
  }
  function winPose(sc, dt, k) {
    // the winner (or both, on a tie) in front of the garage doing his signature move
    const ids = sc.who;
    carried.visible = false;
    ids.forEach((id, i) => {
      const P = people[id];
      P.root.visible = true;
      P.root.position.set(ids.length === 2 ? (i ? 1.3 : -1.3) : 0, 0, 0.9);
      P.root.scale.setScalar(SCALE * 1.15);
      P.root.rotation.y = PI;
      const mode = signature(id, id === 'teddy' ? 1 : 0);
      Kit.people.pose(P, G.time * 8, mode, k);
      P.rig.position.y = 0;
      props(P, mode);
    });
    for (const id of ['teddy', 'tommy']) if (!ids.includes(id)) people[id].root.visible = false;
  }

  function robots(dt) {
    const w = G.w;
    const seen = new Set();
    robotStars.visible = false;
    for (const r of w.robots) {
      const key = G.serial + ':' + r.id;
      seen.add(key);
      let m = robotMeshes.get(key);
      if (!m) {
        m = robotPool.pop() || A.robot();
        if (!m.root.parent) scene.add(m.root);
        m.root.visible = true;
        robotMeshes.set(key, m);
      }
      const y = r.f * FH;
      let s = RSCALE, z = 0, x = r.x, yy = y;
      m.bubble.visible = false;
      m.head.rotation.set(0, 0, 0);
      m.body.rotation.set(0, 0, 0);
      let face = 'happy';
      if (r.st === 'out') { s *= Math.min(1, r.t / 0.4); z = -1.2 + Math.min(1, r.t / 0.5) * 1.2; }
      else if (r.st === 'in') { s *= Math.max(0.01, 1 - r.t / 0.5); z = -Math.min(1, r.t / 0.5) * 1.2; }
      else if (r.st === 'dizzy') {
        face = 'dizzy';
        m.head.rotation.y = r.t * 14;
        robotStars.visible = true;
        robotStars.position.set(x, y + RSCALE * 1.75, 0.2);
        robotStars.userData.spin(G.time);
      } else if (r.st === 'float') {
        face = r.sorry ? 'sorry' : 'dizzy';
        const u = r.t;
        yy = y + u * u * 1.6 + u * 0.6;
        m.bubble.visible = true;
        m.bubble.scale.setScalar(Math.min(1, u * 4));
        m.body.rotation.z = Math.sin(u * 3) * 0.3;
        if (u > 1.8) s *= Math.max(0.01, (2.2 - u) / 0.4);
      }
      A.setFace(m, face);
      m.root.position.set(x, yy, z);
      m.root.scale.setScalar(s);
      const want = r.st === 'float' || r.st === 'dizzy' ? PI : r.face > 0 ? -2.35 : 2.35; // turned toward the camera so the face shows
      m.root.rotation.y = turn(m.root.rotation.y, want, Math.min(1, dt * 12));
      // rolling, the arms swinging; winding up a towel throw
      const roll = r.st === 'walk' ? G.time * 9 : 0;
      m.wheel.rotation.x = roll;
      m.body.position.y = r.st === 'walk' ? Math.abs(Math.sin(G.time * 9)) * 0.04 : 0;
      m.armL.rotation.x = r.st === 'walk' ? Math.sin(roll) * 0.6 : r.st === 'float' ? 2.6 : 0;
      m.armR.rotation.x = r.st === 'throw' ? 2.8 - r.t * 3 : r.st === 'walk' ? -Math.sin(roll) * 0.6 : r.st === 'float' ? 2.6 : 0;
    }
    for (const [key, m] of robotMeshes) if (!seen.has(key)) { m.root.visible = false; robotMeshes.delete(key); robotPool.push(m); }
  }
  function flying() {
    const w = G.w;
    pillowMeshes.forEach((m, i) => {
      const q = w.pillows[i];
      m.visible = !!q;
      if (!q) return;
      m.position.set(q.x, q.f * FH + q.y, 0.25);
      m.rotation.set(0, 0, q.spin);
    });
    towelMeshes.forEach((m, i) => {
      const o = w.towels[i];
      m.visible = !!o;
      if (!o) return;
      m.position.set(o.x, o.f * FH + o.y, 0.2);
      m.rotation.set(0, o.t * 9, 0);
    });
  }

  function buddy(dt) {
    const w = G.w, bd = w.buddy, p = w.p;
    const k = 1 - Math.exp(-16 * dt);
    cloud.visible = false;
    treat.visible = false;
    budParcel.visible = false;
    if (G.scene2 && G.scene2.kind === 'win') return;
    if (!bd) return;
    const B = people[bd.who];
    const r = Kit.roster.get(bd.who) || {};
    let s = SCALE * (r.buddyScale || 0.8) * Math.min(1, bd.t * 5);
    B.root.visible = true;
    const side = -(p.face || 1);
    const px = Math.max(-9.2, Math.min(9.2, p.x + side * 1.0)), pyy = S.py(w) + 0.4 + Math.sin(G.time * 3) * 0.06;
    let bx = px, by = pyy, mode;
    const pz = p.mode === 'car' ? 0.4 : 0.6;
    if (bd.kind === 'hi5') {
      mode = bd.t < 0.5 ? 'wave' : 'give';
      if (bd.t > 1.3) s *= Math.max(0.01, (1.6 - bd.t) / 0.3);
    } else if (bd.t < 0.6) mode = signature(bd.who, bd.n);
    else if (bd.t < S.BUDDY_INTRO) mode = 'give';
    else if (bd.target >= 0) {
      // off he flies with the parcel to its door
      const tg = w.L.targets[bd.target];
      const u = Math.min(1, (bd.t - S.BUDDY_INTRO) / S.BUDDY_FLY);
      const e = u * u * (3 - 2 * u);
      bx = px + (tg.x - px) * e;
      by = pyy + (tg.f * FH + 0.3 - pyy) * e + Math.sin(u * PI) * 1.2;
      mode = u < 1 ? 'grab' : 'wave';
      if (u < 1) {
        budParcel.visible = true;
        budParcel.position.set(bx, by + 0.75, pz + 0.3);
      }
      if (bd.t > S.BUDDY_END - 0.3) s *= Math.max(0.01, (S.BUDDY_END - bd.t) / 0.3);
    } else {
      mode = 'wave';
      if (bd.t > S.BUDDY_INTRO + 0.9) s *= Math.max(0.01, (S.BUDDY_INTRO + 1.2 - bd.t) / 0.3);
    }
    B.root.scale.setScalar(Math.max(0.01, s));
    B.root.position.set(bx, by, pz);
    B.root.rotation.y = PI;
    cloud.visible = true;
    cloud.position.set(bx, by - 0.05, pz);
    Kit.people.pose(B, G.time * 8, mode, k);
    B.rig.position.y = 0;
    if (bd.kind === 'help' && bd.t < 0.6) props(B, mode);
    if (bd.kind === 'help' && bd.t >= 0.6 && bd.t < 0.95) {
      const u = (bd.t - 0.6) / 0.35;
      treat.visible = true;
      if (treat.userData.e !== bd.treat) { treat.material.map = Kit.gfx.emojiTexture(bd.treat); treat.userData.e = bd.treat; }
      treat.position.set(bx + (p.x - bx) * u, by + 1 + Math.sin(u * PI) * 0.8 + (S.py(w) + 0.9 - by - 1) * u, 0.8);
    }
  }

  function spectators(dt) {
    const w = G.w;
    const k = 1 - Math.exp(-16 * dt);
    const cheer = G.cheerT > 0 || (G.scene2 && G.scene2.kind === 'clear') || w.phase === 'won';
    const crowd = w.two ? [[w.players[1 - w.cp].who, -9.7]] : [['foxy', -9.7], ['froggy', 9.7]]; // on the pavement in front of the garage
    for (const id of ['foxy', 'froggy']) people[id].root.visible = false;
    for (const [id, x] of crowd) {
      if (w.buddy && w.buddy.who === id) continue;
      const P = people[id];
      P.root.visible = w.phase !== 'turn' || id === 'foxy' || id === 'froggy';
      if (G.scene2 && G.scene2.kind === 'win') {
        if (id === 'teddy' || id === 'tommy') continue;
      }
      P.root.scale.setScalar(SCALE * (id === 'foxy' || id === 'froggy' ? 0.95 : 1));
      P.root.position.set(x, 0, 2.3);
      P.root.rotation.y = PI + (x < 0 ? -0.4 : 0.4);
      Kit.people.pose(P, G.time * 7, cheer ? 'wave' : 'stand', k);
      P.rig.position.y = cheer ? Math.abs(Math.sin(G.time * 7)) * 0.2 : 0;
    }
  }

  // ---------- HUD ----------
  function hud() {
    const w = G.w;
    if (!w || G.demo) return;
    const top = store.table(w.level)[0].score;
    for (let i = 0; i < 2; i++) {
      const box = $('hudP' + i);
      const pl = w.players[i];
      box.style.display = pl ? '' : 'none';
      if (!pl) continue;
      box.classList.toggle('on', i === w.cp || !w.two);
      setText(box.querySelector('.lbl'), NAME(pl.who));
      setText(box.querySelector('.sc'), fmt(pl.score));
      setText(box.querySelector('.lives'), pl.out ? '—' : pl.lives > 6 ? `❤️ ×${pl.lives}` : '❤️'.repeat(Math.max(0, pl.lives)));
    }
    setText($('hudHi'), fmt(Math.max(top, ...w.players.map((p) => p.score))));
    const p = w.p, pl = w.players[w.cp], L = w.L;
    setText($('hudStage'), `HOTEL ${L.index + 1} · ${floorName(p.f)}`);
    const n = L.targets.length;
    setText($('hudParcels'), `📦 ${pl.done} / ${n}`);
    const tg = L.targets[pl.done];
    let next;
    if (!tg) next = p.f === 0 ? `GARAGE ${L.vanX > p.x ? '➡' : '⬅'}` : 'GARAGE ⬇';
    else if (tg.f === p.f) next = `NEXT: HERE ${tg.x > p.x ? '➡' : '⬅'}`;
    else next = `NEXT: FLOOR ${tg.f} ${tg.f > p.f ? '⬆' : '⬇'}`;
    setText($('hudNext'), next);
    document.querySelector('.box.parcels').classList.toggle('all', !tg);
    const on = !!w.buddy;
    $('budBtn').classList.toggle('on', on);
    document.querySelector('.tb.call').classList.toggle('on', on);
  }

  function draw() {
    if (G.w) hotelView();
    renderer.render(scene, cam);
  }

  // ---------- test hooks ----------
  function state() {
    const w = G.w;
    if (!w) return { screen: G.screen };
    const p = w.p, pl = w.players[w.cp];
    const P = people[pl.who];
    const wy = S.py(w);
    const R = P.root.position; // where he is drawn, not where the rules say
    const [sx, sy] = toScreen(R.x, R.y + 0.6, R.z);
    const [gx, gy] = toScreen(0, 0, 0); // a fixed point (the garage floor) to measure up and down against
    return {
      screen: G.screen, paused: G.paused, demo: G.demo, phase: w.phase, b: w.L.index, level: w.level,
      who: pl.who, cp: w.cp, players: w.players.map((q) => ({ who: q.who, score: q.score, lives: q.lives, b: q.b, done: q.done, out: q.out })),
      p: { x: +p.x.toFixed(3), y: +wy.toFixed(3), f: p.f, mode: p.mode, duck: p.duck, car: p.car, face: p.face, sx: Math.round(sx), sy: Math.round(sy), ry: Math.round(sy - gy), drawnX: +P.root.position.x.toFixed(3), drawnY: +P.root.position.y.toFixed(3) },
      cars: w.cars.map((c) => ({ at: c.at, to: c.to, y: +c.y.toFixed(3), door: +c.door.toFixed(2), rider: c.rider })),
      robots: w.robots.length, pillows: w.pillows.length, buddy: w.buddy && { kind: w.buddy.kind, who: w.buddy.who, t: +w.buddy.t.toFixed(2) },
      done: pl.done, parcels: w.L.targets.length, muted: Kit.sound.isMuted(), sfx: Object.assign({}, SFX.log), lang: Kit.lang.get(), touch: document.body.classList.contains('touch'),
    };
  }
  window.game = {
    start(o) {
      o = o || {};
      if (o.players) G.players = o.players;
      if (o.who) G.who = o.who;
      if (o.level) G.level = o.level;
      play();
      if (o.building != null) { G.w.players.forEach((pl) => { pl.b = o.building; pl.x = null; }); S.loadBuilding(G.w, true); }
      if (o.building != null) big(LV.NAMES[G.w.L.index], hotelLine());
      if (o.go) { G.w.phase = 'play'; G.w.phaseT = 0; G.w.drop = false; }
      placeCam(true);
      return state();
    },
    step(secs, o) {
      const n = Math.max(1, Math.round((secs || DT) / DT));
      for (let i = 0; i < n; i++) advance(DT);
      if (!o || o.draw !== false) draw();
      return state();
    },
    state,
    hold(v) { G.hold = v !== false; return G.hold; },
    call,
    pause, resume, showTitle, showResults,
    check: (only) => ED.check.run(only),
    checkFail: () => ED.check.fail(),
    // put the courier on floor f at x, walking (tests): the rules stay the real ones
    put(f, x) {
      const w = G.w, p = w.p;
      if (p.mode === 'car') { w.cars[p.car].rider = false; }
      p.mode = 'walk'; p.car = -1; p.f = f; p.x = x; p.duck = false; p.inv = 0; p.vx = 0;
      w.lastF = f;
      placeCam(true);
      return state();
    },
    // park lift s's car on floor f with its doors open
    park(s, f) {
      const c = G.w.cars[s];
      c.at = f; c.to = -1; c.y = f * FH; c.door = 1; c.stopT = 0; c.rider = false;
      return state();
    },
    quiet() { G.w.robots = []; G.w.spawnT = 1e9; G.w.cfg = Object.assign({}, G.w.cfg, { first: 1e9 }); return state(); }, // no robots (tests that only look at moving)
    sabotage(s) { G.sab = s || null; return G.sab; },
    toScreen,
    world: () => G.w,
    G,
    info() { draw(); const r = renderer.info.render; let meshes = 0; scene.traverseVisible((o) => { if (o.isMesh || o.isSprite) meshes++; }); return { calls: r.calls, triangles: r.triangles, meshes, pixelRatio: renderer.getPixelRatio() }; },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
