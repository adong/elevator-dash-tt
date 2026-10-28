/* TT Elevator Dash: the 3D things, chunky toy style. The toy hotel cut open like a dollhouse (wallpaper, carpets, doors,
   floor numbers, lift shafts in the back wall behind glass doors, the lift cars), the roof with its sign and water tower,
   the garage with the delivery van, the sky and a toy town, the delivery blimp, the bellhop robots, pillows, towels,
   confetti and dizzy stars. js/game.js places and moves them. */
(function () {
  'use strict';
  const T = THREE, G = Kit.gfx, LV = ED.levels;
  const A = (ED.art = {});
  const FH = LV.FH, NF = LV.NF;
  const XW = 10, OUT = 10.8; // inside walls at ±10, the outside of the side walls at ±10.8
  const ZB = -1.5, ZF = 1.1; // the back wall and the front edge of the floors
  const ROOM = FH - 0.35; // floor to ceiling
  A.dims = { XW, OUT, ZB, ZF, ROOM, CAR_Z: -2.12 };

  const mats = new Map();
  const mat = (color, o) => {
    const k = color + JSON.stringify(o || {});
    if (!mats.has(k)) mats.set(k, G.std(color, o));
    return mats.get(k);
  };
  A.mat = mat;

  // many still meshes with one material drawn as one (fewer draw calls for older iPads)
  function merge(meshes, material) {
    const parts = meshes.map((m) => {
      m.updateMatrix();
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      g.applyMatrix4(m.matrix);
      return g;
    });
    const cat = (name, n) => {
      const out = new Float32Array(parts.reduce((a, g) => a + g.attributes.position.count * n, 0));
      let o = 0;
      for (const g of parts) { out.set(g.attributes[name].array, o); o += g.attributes.position.count * n; }
      return new T.BufferAttribute(out, n);
    };
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', cat('position', 3));
    geo.setAttribute('normal', cat('normal', 3));
    if (parts.every((g) => g.attributes.uv)) geo.setAttribute('uv', cat('uv', 2));
    parts.forEach((g) => g.dispose());
    return new T.Mesh(geo, material);
  }
  A.merge = merge;
  // collects still meshes by material, then merges each material's meshes into one
  function builder() {
    const by = new Map();
    const add = (geo, m, x, y, z, rx, ry, rz) => {
      const me = new T.Mesh(geo, m);
      me.position.set(x, y, z);
      me.rotation.set(rx || 0, ry || 0, rz || 0);
      if (!by.has(m)) by.set(m, []);
      by.get(m).push(me);
      return me;
    };
    return {
      add,
      // a box by its edges
      box(x0, x1, y0, y1, z0, z1, m) { return add(new T.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); },
      build(group) {
        for (const [m, list] of by) {
          const me = merge(list, m);
          group.add(me);
          list.forEach((x) => x.geometry.dispose());
        }
      },
    };
  }
  // a plane whose texture repeats by world metres (so walls of any width match)
  function wallPlane(x0, x1, y0, y1, z, unit) {
    const g = new T.PlaneGeometry(x1 - x0, y1 - y0);
    const pos = g.attributes.position, uv = g.attributes.uv;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + cx) / unit, (pos.getY(i) + cy) / unit);
    const m = new T.Mesh(g);
    m.position.set(cx, cy, z);
    return m;
  }

  // ---------- textures ----------
  function wallTex(pal) {
    const [c, g] = G.makeCanvas(128, 128);
    g.fillStyle = pal.wall;
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = pal.dot;
    for (const [x, y] of [[32, 32], [96, 96], [96, 32], [32, 96]]) {
      g.beginPath();
      if ((x + y) % 128 === 64) g.arc(x, y, 9, 0, Math.PI * 2);
      else { g.moveTo(x, y - 12); g.lineTo(x + 12, y); g.lineTo(x, y + 12); g.lineTo(x - 12, y); }
      g.fill();
    }
    return G.toTexture(c, true);
  }
  function concreteTex() {
    const [c, g] = G.makeCanvas(128, 128);
    g.fillStyle = '#b9c3d1';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#aab4c3';
    g.fillRect(0, 60, 128, 4);
    g.fillRect(60, 0, 4, 60);
    g.fillRect(20, 64, 4, 64);
    g.fillRect(100, 64, 4, 64);
    return G.toTexture(c, true);
  }
  function carpetTex(color) {
    const [c, g] = G.makeCanvas(64, 64);
    g.fillStyle = color;
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(0, 4, 64, 4);
    g.fillRect(0, 56, 64, 4);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    for (let x = 6; x < 64; x += 16) g.fillRect(x, 26, 6, 12);
    return G.toTexture(c, true);
  }
  // floor numbers in one picture: cell f holds floor f's badge (the garage gets 🅿️)
  let numTex = null;
  function numbers() {
    if (numTex) return numTex;
    const [c, g] = G.makeCanvas(1024, 64);
    for (let f = 0; f < 16; f++) {
      const x = f * 64 + 32;
      g.fillStyle = '#14121f';
      g.beginPath(); g.arc(x, 32, 30, 0, Math.PI * 2); g.fill();
      g.fillStyle = f === 0 ? '#3d7bff' : '#ffd400';
      g.beginPath(); g.arc(x, 32, 26, 0, Math.PI * 2); g.fill();
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      if (f === 0) { g.font = `38px ${G.EMOJI_FONT}`; g.fillText('🅿️', x, 35); }
      else { g.font = `${f > 9 ? 30 : 36}px ${G.FONT}`; g.fillStyle = '#14121f'; g.fillText(String(f), x, 35); }
    }
    return (numTex = G.toTexture(c));
  }
  function numPlane(f, x, y, z, size) {
    const g = new T.PlaneGeometry(size, size);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, (f + uv.getX(i)) / 16);
    const m = new T.Mesh(g);
    m.position.set(x, y, z);
    return m;
  }
  function faceTex(kind) {
    const [c, g] = G.makeCanvas(128, 112);
    g.fillStyle = '#1d2b4f';
    G.roundRect(g, 6, 6, 116, 100, 22);
    g.fill();
    g.strokeStyle = '#7ff3ff';
    g.fillStyle = '#7ff3ff';
    g.lineWidth = 7;
    g.lineCap = 'round';
    for (const x of [40, 88]) {
      g.beginPath();
      if (kind === 'dizzy') { for (let a = 0; a < 12; a += 0.3) { const r = a * 1.4; g.lineTo(x + Math.cos(a) * r, 46 + Math.sin(a) * r); } g.stroke(); }
      else if (kind === 'sorry') { g.moveTo(x - 10, 38); g.lineTo(x + 10, 46); g.lineTo(x - 10, 54); g.stroke(); }
      else { g.arc(x, 46, 12, 0, Math.PI * 2); g.fill(); }
    }
    g.beginPath();
    if (kind === 'sorry') g.arc(64, 86, 8, Math.PI * 1.1, Math.PI * 1.9);
    else if (kind === 'dizzy') { g.moveTo(48, 82); for (let x = 48; x <= 80; x += 4) g.lineTo(x, 82 + ((x / 4) % 2 ? 4 : -4)); }
    else g.arc(64, 72, 16, 0.2, Math.PI - 0.2);
    g.stroke();
    if (kind === 'sorry') { g.fillStyle = '#ff9db0'; g.fillRect(18, 66, 16, 8); g.fillRect(94, 66, 16, 8); }
    return G.toTexture(c);
  }
  const FACES = {};
  A.face = (kind) => FACES[kind] || (FACES[kind] = faceTex(kind));

  // ---------- the sky, the town and the street ----------
  A.clouds = [];
  A.backdrop = function (scene) {
    const b = builder();
    // grass, the pavement and the street in front of the hotel
    b.box(-140, 140, -2, -0.02, -90, ZF + 0.5, mat('#86d66b', { roughness: 1 }));
    b.box(-140, 140, -0.3, -0.01, ZF - 0.1, ZF + 2.4, mat('#d9dee8', { roughness: 1 }));
    b.box(-140, 140, -0.4, -0.015, ZF + 2.4, ZF + 9, mat('#5b6275', { roughness: 1 }));
    for (let x = -130; x < 140; x += 6) b.box(x, x + 3, -0.01, 0.005, ZF + 5.4, ZF + 5.7, mat('#ffffff', { roughness: 1 }));
    // toy town far behind: blocks with windows of light
    const cols = ['#ff9eb5', '#ffd166', '#8fd3ff', '#b8f2a0', '#d6b8ff', '#ffb38a'];
    let x = -120;
    let k = 0;
    while (x < 120) {
      const wd = 6 + ((k * 37) % 7), ht = 8 + ((k * 53) % 22), z = -34 - ((k * 29) % 3) * 8;
      if (Math.abs(x + wd / 2) > 16 || z < -45) {
        b.box(x, x + wd, 0, ht, z - 5, z, mat(cols[k % cols.length], { roughness: 0.9 }));
        b.box(x - 0.3, x + wd + 0.3, ht, ht + 0.6, z - 5.3, z + 0.3, mat(G.shade(cols[k % cols.length], -0.25), { roughness: 0.9 }));
      }
      x += wd + 2 + ((k * 13) % 4);
      k++;
    }
    // round toy trees along the street
    for (let tx = -120; tx < 120; tx += 9) {
      if (Math.abs(tx) < 14) continue;
      b.add(new T.CylinderGeometry(0.18, 0.22, 1.6, 8), mat('#9b6b3d'), tx, 0.8, -3);
      b.add(new T.SphereGeometry(1.2, 12, 10), mat(tx % 2 ? '#4caf50' : '#66bb6a'), tx, 2.4, -3);
    }
    const g = new T.Group();
    b.build(g);
    scene.add(g);
    // clouds drift across the sky
    const cm = new T.MeshStandardMaterial({ color: '#ffffff', emissive: '#e8f6ff', emissiveIntensity: 0.35, roughness: 1 });
    for (let i = 0; i < 14; i++) {
      const parts = [];
      for (let j = 0; j < 4; j++) {
        const s = new T.Mesh(new T.SphereGeometry(1.4 + (j % 2) * 0.6, 10, 8));
        s.position.set((j - 1.5) * 1.6, (j % 2) * 0.5, 0);
        parts.push(s);
      }
      const c = merge(parts, cm);
      c.position.set(-80 + ((i * 47) % 160), 6 + ((i * 19) % 46), -26 - (i % 3) * 6);
      c.userData.v = 0.6 + (i % 4) * 0.25;
      scene.add(c);
      A.clouds.push(c);
    }
  };

  // ---------- one toy hotel ----------
  A.hotel = function (L) {
    const P = L.pal;
    const group = new T.Group();
    const b = builder();
    const wallM = new T.MeshStandardMaterial({ map: wallTex(P), roughness: 0.95 });
    const concM = new T.MeshStandardMaterial({ map: concreteTex(), roughness: 1 });
    const carpetM = new T.MeshStandardMaterial({ map: carpetTex(G.shade(P.floor, 0.12)), roughness: 1 });
    const numM = new T.MeshBasicMaterial({ map: numbers(), transparent: true });
    const slabM = mat(P.floor, { roughness: 0.7 });
    const outerM = mat(P.outer, { roughness: 0.7 });
    const liftM = mat(P.lift, { roughness: 0.5 });
    const recessM = mat(G.shade(P.lift, -0.72), { roughness: 0.9 });
    const frameM = mat(P.frame, { roughness: 0.6 });
    const doorM = mat(P.door, { roughness: 0.6 });
    const knobM = mat('#ffc83d', { roughness: 0.3, metalness: 0.4 });
    const roomM = mat(G.shade(P.wall, -0.35), { roughness: 1 });
    const greyDoorM = mat('#8792a6', { roughness: 0.7 });
    const potM = mat('#d9733b'), leafM = mat('#3fbf5a');
    const shaftsOn = (f) => L.shafts.filter((s) => f >= s.lo && f <= s.hi);
    const targetAt = (f, d) => L.targets.find((t) => t.f === f && t.d === d);

    for (let f = 0; f <= NF; f++) {
      const y0 = f * FH;
      // the floor slab (the garage's is concrete grey) and its carpet runner
      b.box(-OUT, OUT, y0 - 0.35, y0, ZB, ZF, f === 0 ? mat('#8c95a6', { roughness: 1 }) : slabM);
      if (f > 0 && f < NF) b.box(-XW, XW, y0, y0 + 0.02, -0.75, 0.75, carpetM);
      if (f === NF) {
        // the roof: a low wall at the back, a sign with the hotel's emoji, a water tower
        b.box(-OUT, OUT, y0, y0 + 0.9, ZB - 0.3, ZB, outerM);
        b.box(-OUT, -XW, y0, y0 + 1.2, ZB, ZF, outerM);
        b.box(XW, OUT, y0, y0 + 1.2, ZB, ZF, outerM);
        const tx = L.startX > 0 ? -8.4 : 8.4;
        b.add(new T.CylinderGeometry(1, 1, 2, 14), mat('#c98b4f'), tx, y0 + 3.4, ZB - 1.4);
        b.add(new T.ConeGeometry(1.15, 0.8, 14), mat('#a0522d'), tx, y0 + 4.8, ZB - 1.4);
        for (const dx of [-0.7, 0.7]) b.add(new T.CylinderGeometry(0.08, 0.08, 2.4, 6), mat('#6d4c41'), tx + dx, y0 + 1.2, ZB - 1.4);
        continue;
      }
      // the back wall, with holes where lifts stop on this floor
      const holes = shaftsOn(f).map((s) => [s.x - 0.98, s.x + 0.98]).sort((a, c) => a[0] - c[0]);
      let x = -XW;
      for (const [h0, h1] of holes.concat([[XW, XW]])) {
        if (h0 > x + 0.01) {
          const wp = wallPlane(x, h0, y0, y0 + ROOM, ZB, 2);
          if (!b.walls) b.walls = [];
          (f === 0 ? (b.conc = b.conc || []) : b.walls).push(wp);
        }
        x = h1;
      }
      // the doors: hotel rooms (the parcel doors move, so they're built below), grey staff doors in the garage
      LV.DOORS.forEach((dx, d) => {
        b.box(dx - 0.68, dx - 0.56, y0, y0 + 2.3, ZB, ZB + 0.12, frameM);
        b.box(dx + 0.56, dx + 0.68, y0, y0 + 2.3, ZB, ZB + 0.12, frameM);
        b.box(dx - 0.68, dx + 0.68, y0 + 2.2, y0 + 2.32, ZB, ZB + 0.12, frameM);
        if (f > 0 && targetAt(f, d)) return;
        if (f === 0 && Math.abs(dx - L.vanX) < 2) return;
        b.box(dx - 0.56, dx + 0.56, y0, y0 + 2.2, ZB, ZB + 0.06, f === 0 ? greyDoorM : doorM);
        b.add(new T.SphereGeometry(0.06, 8, 6), knobM, dx + 0.36, y0 + 1.05, ZB + 0.1);
        if (f > 0) b.box(dx - 0.14, dx + 0.14, y0 + 1.7, y0 + 1.82, ZB + 0.06, ZB + 0.08, knobM);
      });
      // floor numbers at both ends of the corridor
      if (!b.nums) b.nums = [];
      b.nums.push(numPlane(f, -9.55, y0 + 1.75, ZB + 0.02, 0.62), numPlane(f, 9.55, y0 + 1.75, ZB + 0.02, 0.62));
      // a potted plant here and there
      if (f > 0 && f % 2 === 1) {
        const px = [-1.6, 1.6, -4.6, 4.6][f % 4];
        if (!shaftsOn(f).some((s) => Math.abs(s.x - px) < 1.4)) {
          b.add(new T.CylinderGeometry(0.22, 0.17, 0.4, 10), potM, px, y0 + 0.2, ZB + 0.35);
          b.add(new T.SphereGeometry(0.34, 10, 8), leafM, px, y0 + 0.62, ZB + 0.35);
        }
      }
      // the garage: parking lines
      if (f === 0) for (let px = -7; px <= 7; px += 3.5) b.box(px - 0.06, px + 0.06, y0, y0 + 0.015, -0.9, 0.9, mat('#ffffff', { roughness: 1 }));
    }
    // the outside walls, up to the roof
    b.box(-OUT, -XW, -0.35, NF * FH, -3.05, ZF, outerM);
    b.box(XW, OUT, -0.35, NF * FH, -3.05, ZF, outerM);
    b.box(-OUT, OUT, -0.35, NF * FH, -3.05, -2.95, outerM); // the hotel's back, behind the lift shafts
    for (let f = 1; f <= NF; f++) b.box(-OUT - 0.15, OUT + 0.15, f * FH - 0.45, f * FH - 0.3, ZF - 0.05, ZF + 0.12, mat(G.shade(P.floor, -0.25), { roughness: 0.7 }));

    // the lift shafts: a coloured recess in the back wall, rails, a frame and a header on every floor it stops at
    for (const s of L.shafts) {
      const yb = s.lo * FH - 0.35, yt = Math.min(s.hi * FH + ROOM, NF * FH + ROOM);
      b.box(s.x - 0.98, s.x + 0.98, yb, yt, -2.9, -2.78, recessM);
      b.box(s.x - 1.0, s.x - 0.92, yb, yt, -2.8, ZB, liftM);
      b.box(s.x + 0.92, s.x + 1.0, yb, yt, -2.8, ZB, liftM);
      for (const rx of [-0.55, 0.55]) b.box(s.x + rx - 0.04, s.x + rx + 0.04, yb, yt, -2.78, -2.72, mat('#c9d3e0', { metalness: 0.5, roughness: 0.4 }));
      for (let f = s.lo; f <= s.hi; f++) {
        const y0 = f * FH;
        b.box(s.x - 1.1, s.x - 0.92, y0, y0 + ROOM, ZB - 0.02, ZB + 0.14, liftM);
        b.box(s.x + 0.92, s.x + 1.1, y0, y0 + ROOM, ZB - 0.02, ZB + 0.14, liftM);
        b.box(s.x - 1.1, s.x + 1.1, y0 + 2.36, y0 + 2.5, ZB - 0.02, ZB + 0.14, liftM);
      }
      if (s.hi === NF) {
        // the little lift house on the roof
        const y0 = NF * FH;
        b.box(s.x - 1.2, s.x + 1.2, y0 + ROOM, y0 + ROOM + 0.35, -2.95, ZB + 0.2, outerM);
      }
    }
    // the garage's open side, where the van drives out
    const wallsMesh = b.walls && b.walls.length ? merge(b.walls, wallM) : null;
    if (wallsMesh) group.add(wallsMesh);
    if (b.conc && b.conc.length) group.add(merge(b.conc, concM));
    if (b.nums && b.nums.length) group.add(merge(b.nums, numM));
    b.build(group);

    // the roof sign: the hotel's emoji on a board
    const sign = new T.Mesh(new T.PlaneGeometry(2.6, 2.6), new T.MeshBasicMaterial({ map: G.emojiTexture(L.emoji), transparent: true }));
    const sx = L.startX > 0 ? -3.2 : 3.2;
    sign.position.set(sx, NF * FH + 2.4, ZB - 0.5);
    group.add(sign);
    const board = new T.Mesh(new T.BoxGeometry(3, 3, 0.2), mat('#ffffff'));
    board.position.set(sx, NF * FH + 2.4, ZB - 0.65);
    group.add(board);
    for (const dx of [-1, 1]) {
      const leg = new T.Mesh(new T.BoxGeometry(0.14, 1, 0.14), mat('#6d4c41'));
      leg.position.set(sx + dx, NF * FH + 0.5, ZB - 0.65);
      group.add(leg);
    }

    // the lift cars
    const cars = L.shafts.map((s) => {
      const parts = [];
      const add = (w, h, d, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d)); m.position.set(x, y, z); parts.push(m); };
      add(1.8, 0.12, 1.2, 0, 0.06, 0);
      add(1.8, 0.1, 1.2, 0, 2.3, 0);
      add(1.8, 2.3, 0.06, 0, 1.15, -0.6);
      add(0.08, 2.3, 1.2, -0.88, 1.15, 0);
      add(0.08, 2.3, 1.2, 0.88, 1.15, 0);
      add(1.6, 0.08, 0.06, 0, 1.0, -0.56); // the hand rail
      const car = merge(parts, mat(P.car, { roughness: 0.45, emissive: P.car, emissiveIntensity: 0.12 }));
      const lamp = new T.Mesh(new T.SphereGeometry(0.13, 10, 8), new T.MeshBasicMaterial({ color: '#fff6c9' }));
      lamp.position.set(0, 2.2, 0);
      car.add(lamp);
      car.position.set(s.x, s.hi * FH, A.dims.CAR_Z);
      group.add(car);
      return car;
    });
    // the glass lift doors on every floor: one instanced mesh, slid open on the floor where a car stands
    const landings = [];
    for (const s of L.shafts) for (let f = s.lo; f <= s.hi; f++) landings.push({ s: s.i, f, x: s.x });
    const glass = new T.InstancedMesh(new T.BoxGeometry(0.9, 2.34, 0.05), new T.MeshStandardMaterial({ color: '#c9f3ff', transparent: true, opacity: 0.22, roughness: 0.1, metalness: 0.1, depthWrite: false }), landings.length * 2);
    glass.renderOrder = 2;
    group.add(glass);
    const m4 = new T.Matrix4();
    function doors(open) {
      landings.forEach((l, i) => {
        const o = open(l.s, l.f) * 0.84;
        m4.makeTranslation(l.x - 0.46 - o, l.f * FH + 1.18, ZB + 0.04);
        glass.setMatrixAt(i * 2, m4);
        m4.makeTranslation(l.x + 0.46 + o, l.f * FH + 1.18, ZB + 0.04);
        glass.setMatrixAt(i * 2 + 1, m4);
      });
      glass.instanceMatrix.needsUpdate = true;
    }
    doors(() => 0);

    // the parcel doors: they swing open for the guest; a lamp above, the parcel's number on the door
    const targets = L.targets.map((t) => {
      const y0 = t.f * FH;
      const room = new T.Mesh(new T.PlaneGeometry(1.12, 2.2), roomM);
      room.position.set(t.x, y0 + 1.1, ZB + 0.015);
      group.add(room);
      const pivot = new T.Group();
      pivot.position.set(t.x - 0.56, y0, ZB + 0.03);
      const panel = new T.Mesh(new T.BoxGeometry(1.12, 2.2, 0.06), doorM);
      panel.position.set(0.56, 1.1, 0);
      pivot.add(panel);
      const knob = new T.Mesh(new T.SphereGeometry(0.06, 8, 6), knobM);
      knob.position.set(0.92, 1.05, 0.06);
      pivot.add(knob);
      const badge = new T.Mesh(new T.PlaneGeometry(0.8, 0.8), new T.MeshBasicMaterial({ map: G.emojiTexture(['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'][t.i]), transparent: true }));
      badge.position.set(0.56, 1.45, 0.045);
      pivot.add(badge);
      group.add(pivot);
      const lamp = new T.Mesh(new T.SphereGeometry(0.18, 12, 10), new T.MeshStandardMaterial({ color: '#ffd400', emissive: '#ffb000', emissiveIntensity: 0.2 }));
      lamp.position.set(t.x, y0 + 2.48, ZB + 0.15);
      group.add(lamp);
      const glow = new T.Sprite(new T.SpriteMaterial({ map: G.glowTexture(), color: '#ffd23f', transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      glow.position.set(t.x, y0 + 1.3, ZB + 0.3);
      glow.scale.set(2.6, 3.2, 1);
      group.add(glow);
      const guest = A.emoji(t.guest, 1.0);
      guest.position.set(t.x, y0 + 1.2, ZB + 0.2);
      guest.visible = false;
      group.add(guest);
      return { t, pivot, badge, lamp, glow, guest, open: 0 };
    });
    const van = A.van();
    van.position.set(L.vanX, 0, -0.1);
    van.rotation.y = L.vanX > 0 ? 0 : Math.PI;
    group.add(van);
    return { group, cars, targets, van, doors };
  };

  // ---------- the delivery van and the blimp ----------
  A.van = function () {
    const g = new T.Group();
    const body = new T.Group();
    g.add(body);
    const add = (geo, m, x, y, z, parent) => { const me = new T.Mesh(geo, m); me.position.set(x, y, z); (parent || body).add(me); return me; };
    add(new T.BoxGeometry(2.4, 1.7, 1.5), mat('#ffffff', { roughness: 0.5 }), -0.4, 1.25, 0);
    add(new T.BoxGeometry(1.0, 1.25, 1.5), mat('#ff5a5f', { roughness: 0.5 }), 1.3, 1.02, 0);
    add(new T.BoxGeometry(0.06, 0.6, 1.3), mat('#9fe3ff', { roughness: 0.1 }), 1.8, 1.25, 0);
    add(new T.BoxGeometry(2.42, 0.22, 1.52), mat('#ff5a5f', { roughness: 0.5 }), -0.4, 0.75, 0);
    for (const [x, z] of [[-1.1, 0.72], [1.2, 0.72], [-1.1, -0.72], [1.2, -0.72]]) {
      const wh = add(new T.CylinderGeometry(0.36, 0.36, 0.24, 14), mat('#2b2d42'), x, 0.36, z);
      wh.rotation.x = Math.PI / 2;
      const hub = add(new T.CylinderGeometry(0.15, 0.15, 0.26, 10), mat('#d9dee8', { metalness: 0.4 }), x, 0.36, z);
      hub.rotation.x = Math.PI / 2;
    }
    const decal = new T.Mesh(new T.PlaneGeometry(1.1, 1.1), new T.MeshBasicMaterial({ map: G.emojiTexture('📦'), transparent: true }));
    decal.position.set(-0.4, 1.3, 0.76);
    body.add(decal);
    const decal2 = decal.clone();
    decal2.position.z = -0.76;
    decal2.rotation.y = Math.PI;
    body.add(decal2);
    g.userData.body = body;
    return g;
  };
  A.blimp = function () {
    const g = new T.Group();
    const hull = new T.Mesh(new T.SphereGeometry(1, 24, 16), mat('#ffd23f', { roughness: 0.45 }));
    hull.scale.set(3.4, 1.25, 1.25);
    g.add(hull);
    const band = new T.Mesh(new T.CylinderGeometry(1.27, 1.27, 0.5, 24, 1, true), mat('#ff5a5f', { roughness: 0.5 }));
    band.rotation.z = Math.PI / 2;
    band.position.x = 0.6;
    g.add(band);
    for (const [ry, rz] of [[0, 0], [Math.PI / 2, 0]]) {
      const fin = new T.Mesh(new T.BoxGeometry(1.1, 1.4, 0.08), mat('#ff5a5f'));
      fin.position.set(-3.1, 0, 0);
      fin.rotation.set(ry, 0, rz);
      g.add(fin);
    }
    const gon = new T.Mesh(new T.BoxGeometry(1.4, 0.6, 0.8), mat('#3d7bff', { roughness: 0.5 }));
    gon.position.set(0.3, -1.45, 0);
    g.add(gon);
    const decal = new T.Mesh(new T.PlaneGeometry(1.5, 1.5), new T.MeshBasicMaterial({ map: G.emojiTexture('📦'), transparent: true }));
    decal.position.set(0.2, 0.15, 1.27);
    g.add(decal);
    const prop = new T.Mesh(new T.BoxGeometry(0.08, 1.2, 0.18), mat('#14121f'));
    prop.position.set(-3.75, 0, 0);
    g.add(prop);
    g.userData.prop = prop;
    const rope = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 1, 6), mat('#6d4c41'));
    rope.visible = false;
    g.add(rope);
    g.userData.rope = rope;
    return g;
  };

  // ---------- a bellhop robot: red jacket, gold buttons, a little round cap, one wheel ----------
  A.robot = function () {
    const root = new T.Group();
    const body = new T.Group();
    root.add(body);
    const red = mat('#e63946', { roughness: 0.5 }), gold = mat('#ffc83d', { roughness: 0.3, metalness: 0.4 }), steel = mat('#dfe6ee', { roughness: 0.35, metalness: 0.3 });
    const add = (geo, m, x, y, z, parent) => { const me = new T.Mesh(geo, m); me.position.set(x, y, z); (parent || body).add(me); return me; };
    const wheel = add(new T.CylinderGeometry(0.2, 0.2, 0.18, 14), mat('#2b2d42'), 0, 0.2, 0);
    wheel.rotation.z = Math.PI / 2;
    add(new T.CylinderGeometry(0.12, 0.2, 0.22, 10), steel, 0, 0.42, 0);
    add(new T.BoxGeometry(0.6, 0.56, 0.44), red, 0, 0.78, 0);
    for (const y of [0.88, 0.7]) add(new T.SphereGeometry(0.045, 8, 6), gold, 0, y, -0.23);
    add(new T.BoxGeometry(0.22, 0.08, 0.04), gold, 0, 1.0, -0.23);
    const head = new T.Group();
    head.position.set(0, 1.3, 0);
    body.add(head);
    add(new T.BoxGeometry(0.58, 0.46, 0.46), steel, 0, 0, 0, head);
    const face = add(new T.PlaneGeometry(0.5, 0.4), new T.MeshBasicMaterial({ map: A.face('happy') }), 0, 0, -0.235, head);
    face.rotation.y = Math.PI;
    add(new T.CylinderGeometry(0.21, 0.23, 0.18, 14), red, 0, 0.32, 0, head);
    add(new T.CylinderGeometry(0.235, 0.235, 0.05, 14), gold, 0, 0.25, 0, head);
    add(new T.CylinderGeometry(0.02, 0.02, 0.24, 6), steel, 0.12, 0.5, 0, head);
    add(new T.SphereGeometry(0.06, 8, 6), gold, 0.12, 0.62, 0, head);
    for (const sx of [-1, 1]) add(new T.CylinderGeometry(0.07, 0.07, 0.08, 10), gold, sx * 0.31, 0, 0, head).rotation.z = Math.PI / 2;
    const arms = [-1, 1].map((sx) => {
      const a = new T.Group();
      a.position.set(sx * 0.36, 0.98, 0);
      body.add(a);
      add(new T.BoxGeometry(0.13, 0.42, 0.15), red, 0, -0.2, 0, a);
      add(new T.SphereGeometry(0.09, 8, 6), mat('#ffffff'), 0, -0.44, 0, a);
      return a;
    });
    const bubble = new T.Mesh(new T.SphereGeometry(0.95, 18, 14), new T.MeshStandardMaterial({ color: '#c9f2ff', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false }));
    bubble.position.y = 0.85;
    bubble.visible = false;
    root.add(bubble);
    return { root, body, head, face, armL: arms[0], armR: arms[1], wheel, bubble, faceKind: 'happy' };
  };
  A.setFace = function (r, kind) {
    if (r.faceKind === kind) return;
    r.faceKind = kind;
    r.face.material.map = A.face(kind);
  };
  A.pillow = function () {
    const g = new T.Group();
    const m = new T.Mesh(new T.SphereGeometry(0.3, 14, 10), mat('#ffffff', { roughness: 0.9 }));
    m.scale.set(1.6, 0.55, 1.1);
    g.add(m);
    const band = new T.Mesh(new T.TorusGeometry(0.27, 0.025, 6, 20), mat('#7ec8ff'));
    band.scale.set(1.75, 0.55, 1);
    g.add(band);
    return g;
  };
  A.towel = function () {
    const g = new T.Group();
    const m = new T.Mesh(new T.CylinderGeometry(0.13, 0.13, 0.5, 12), mat('#ff8fc8', { roughness: 1 }));
    m.rotation.x = Math.PI / 2;
    g.add(m);
    const s = new T.Mesh(new T.CylinderGeometry(0.135, 0.135, 0.1, 12), mat('#ffffff', { roughness: 1 }));
    s.rotation.x = Math.PI / 2;
    g.add(s);
    return g;
  };
  A.parcel = function (size) {
    const g = new T.Group();
    const s = size || 0.5;
    g.add(new T.Mesh(new T.BoxGeometry(s, s * 0.8, s * 0.8), mat('#c98b4f', { roughness: 0.9 })));
    const tape = new T.Mesh(new T.BoxGeometry(s * 1.02, s * 0.16, s * 0.82), mat('#ff5a5f'));
    g.add(tape);
    return g;
  };

  // ---------- confetti (also the pillow feathers), dizzy stars, emoji sprites ----------
  A.confetti = function (scene, max) {
    max = max || 500;
    const geo = new T.PlaneGeometry(0.16, 0.1);
    const im = new T.InstancedMesh(geo, new T.MeshBasicMaterial({ side: T.DoubleSide }), max);
    im.instanceMatrix.setUsage(T.DynamicDrawUsage);
    im.frustumCulled = false;
    scene.add(im);
    const ps = [];
    const col = new T.Color(), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(1, 1, 1), v = new T.Vector3();
    const COLS = ['#ff3d7f', '#ffd400', '#18d4ff', '#7dff5a', '#ff8a1f', '#c77dff', '#ffffff'];
    for (let i = 0; i < max; i++) { im.setColorAt(i, col.set(COLS[i % COLS.length])); m4.makeScale(0, 0, 0); im.setMatrixAt(i, m4); }
    let next = 0;
    return {
      burst(x, y, z, n, power, colors) {
        for (let i = 0; i < n; i++) {
          const k = next++ % max;
          const a = Math.random() * Math.PI * 2, sp = (0.4 + Math.random()) * (power || 4);
          ps[k] = { x, y, z: z || 0.5, vx: Math.cos(a) * sp, vy: Math.abs(Math.sin(a)) * sp + 1.5, vz: (Math.random() - 0.3) * 2, rx: Math.random() * 6, ry: Math.random() * 6, life: 1.6 + Math.random() * 1.2 };
          im.setColorAt(k, col.set(colors ? colors[i % colors.length] : COLS[k % COLS.length]));
        }
        im.instanceColor.needsUpdate = true;
      },
      rain(x0, x1, y, n) {
        for (let i = 0; i < n; i++) {
          const k = next++ % max;
          ps[k] = { x: x0 + Math.random() * (x1 - x0), y: y + Math.random() * 3, z: 0.6 + Math.random(), vx: (Math.random() - 0.5) * 1.5, vy: -1 - Math.random(), vz: 0, rx: Math.random() * 6, ry: Math.random() * 6, life: 4 + Math.random() * 2 };
          im.setColorAt(k, col.set(COLS[k % COLS.length]));
        }
        im.instanceColor.needsUpdate = true;
      },
      update(dt) {
        for (let k = 0; k < max; k++) {
          const p = ps[k];
          if (!p) continue;
          p.life -= dt;
          if (p.life <= 0) { ps[k] = null; m4.makeScale(0, 0, 0); im.setMatrixAt(k, m4); continue; }
          p.vy -= 6 * dt;
          p.vx *= 1 - 1.2 * dt;
          p.vy = Math.max(p.vy, -2.2);
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          p.rx += dt * 7; p.ry += dt * 5;
          q.setFromEuler(e.set(p.rx, p.ry, 0));
          s.setScalar(Math.min(1, p.life * 2));
          m4.compose(v.set(p.x, p.y, p.z), q, s);
          im.setMatrixAt(k, m4);
        }
        im.instanceMatrix.needsUpdate = true;
      },
      clear() { for (let k = 0; k < max; k++) if (ps[k]) { ps[k] = null; m4.makeScale(0, 0, 0); im.setMatrixAt(k, m4); } im.instanceMatrix.needsUpdate = true; },
    };
  };
  A.stars = function () {
    const g = new T.Group();
    const tex = G.emojiTexture('⭐');
    for (let i = 0; i < 5; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: tex, depthTest: false }));
      s.scale.set(0.3, 0.3, 1);
      g.add(s);
    }
    g.userData.spin = (t) => g.children.forEach((s, i) => { const a = t * 5 + (i / 5) * Math.PI * 2; s.position.set(Math.cos(a) * 0.42, Math.sin(a * 2) * 0.05, Math.sin(a) * 0.42); });
    return g;
  };
  A.emoji = function (e, size) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: G.emojiTexture(e), depthTest: false }));
    s.scale.set(size || 0.6, size || 0.6, 1);
    s.renderOrder = 5;
    return s;
  };
})();
