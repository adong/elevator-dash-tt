/* TT Elevator Dash: the headless check of the brief's rules (and a few more), on js/sim.js alone. The page runs it as
   game.check(); node tools/check.js runs the same file. ED.check.fail() breaks one rule at a time (the sim's
   sabotages) and makes sure some check catches each one, so a green check means something. */
(function (root) {
  'use strict';
  const ED = root.ED;
  const S = ED.sim, LV = ED.levels, B = ED.bot;
  const FH = S.FH;

  // a world with nothing in the way: no robots unless a test adds them
  function quiet(o) {
    const w = S.create(Object.assign({ level: 'easy', seed: 7 }, o || {}));
    w.phase = 'play';
    w.phaseT = 0;
    w.spawnT = 1e9;
    w.cfg = Object.assign({}, w.cfg, { first: 1e9 });
    return w;
  }
  function run(w, secs, inp) {
    const evs = [];
    const n = Math.round(secs / S.DT);
    for (let i = 0; i < n; i++) {
      S.step(w, typeof inp === 'function' ? inp(w, i) : inp);
      for (const e of w.events) evs.push(e);
    }
    return evs;
  }
  function put(w, f, x) {
    const p = w.p;
    p.mode = 'walk'; p.car = -1; p.f = f; p.x = x; p.duck = false; p.inv = 0;
    w.cars.forEach((c) => { c.rider = false; });
    w.lastF = f;
  }
  // a car whose lift serves floor f, parked on floor at
  function park(w, s, at) {
    const c = w.cars[s.i];
    c.at = at; c.to = -1; c.y = at * FH; c.door = 1; c.stopT = 0; c.rider = false;
    return c;
  }
  // every tick: where you are always makes sense (a floor, or a lift car that is in its own shaft)
  function sane(w, bad) {
    const p = w.p;
    if (p.mode === 'walk' || p.mode === 'dizzy') {
      if (!(Number.isInteger(p.f) && p.f >= 0 && p.f <= S.NF)) bad.push(`floor ${p.f}`);
      if (p.x < S.XL - 1e-6 || p.x > S.XR + 1e-6) bad.push(`x ${p.x.toFixed(2)} outside the walls`);
    }
    if (p.mode === 'car') {
      const c = w.cars[p.car];
      if (!c || !c.rider) bad.push('in a car that has no rider');
      else if (c.y < c.lo * FH - 1e-6 || c.y > c.hi * FH + 1e-6) bad.push(`car outside its shaft ${c.y.toFixed(2)}`);
    }
    for (const c of w.cars) if (c.to < 0 && Math.abs(c.y - c.at * FH) > 1e-6) bad.push(`car ${c.i} stopped between floors at y ${c.y.toFixed(2)}`);
  }
  // a kid mashing keys: random lr / ud / duck / pillow held for random times
  function monkey(seed) {
    let s = seed >>> 0, held = {}, left = 0;
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    return () => {
      if (left-- <= 0) {
        left = 5 + Math.floor(r() * 60);
        held = { lr: [-1, 0, 1][Math.floor(r() * 3)], ud: [-1, 0, 0, 1][Math.floor(r() * 4)], duck: r() < 0.1, pillow: r() < 0.3 };
      }
      return held;
    };
  }
  // the autopilot plays until the phase is reached (or time runs out)
  function autoplay(w, secs, until) {
    const n = Math.round(secs / S.DT);
    const bad = [];
    let inp = null, k = 0;
    for (let i = 0; i < n; i++) {
      if (k++ % 3 === 0 || !inp) inp = B.decide(w);
      else inp = { lr: inp.lr, ud: inp.ud, duck: inp.duck, pillow: false };
      S.step(w, inp);
      sane(w, bad);
      if (w.phase === until) return { ok: true, t: +w.t.toFixed(1), bad };
      if (w.phase === 'won' || w.phase === 'over') break;
    }
    return { ok: w.phase === until, t: +w.t.toFixed(1), phase: w.phase, bad, b: w.players[w.cp].b, done: w.players[w.cp].done };
  }

  const CHECKS = {
    // the brief: elevators carry you and stop at floors
    liftsCarry() {
      const fails = [];
      for (let b = 0; b < LV.COUNT; b++) {
        const w = quiet({ building: b });
        const s = w.L.shafts.find((q) => q.hi === S.NF);
        put(w, S.NF, s.x);
        park(w, s, S.NF);
        // one tap of ↓: in, down one floor, stopped exactly on it
        run(w, 0.05, { ud: -1 });
        const inCar = w.p.mode === 'car';
        run(w, 2.5, {});
        const c = w.cars[s.i];
        if (!inCar || c.at !== S.NF - 1 || w.p.f !== S.NF - 1 || Math.abs(c.y - (S.NF - 1) * FH) > 1e-6) fails.push(`b${b + 1}: one ↓ ended at floor ${c.at} y ${c.y.toFixed(2)} (in car ${inCar})`);
        // hold ↓ to the bottom of the lift: it stops at every floor on the way
        const evs = run(w, 12, { ud: -1 });
        const dings = evs.filter((e) => e.type === 'ding' && e.car === s.i).map((e) => e.f);
        const want = [];
        for (let f = S.NF - 2; f >= s.lo; f--) want.push(f);
        if (dings.join() !== want.join()) fails.push(`b${b + 1}: held ↓ stopped at [${dings}] not [${want}]`);
        // the stop is a real stop: the car stands still on each floor for a moment
        const w2 = quiet({ building: b });
        put(w2, S.NF, s.x);
        park(w2, s, S.NF);
        let still = 0, standing = 0;
        run(w2, 6, (ww) => {
          const cc = ww.cars[s.i];
          if (cc.to < 0 && cc.at < S.NF && cc.at > s.lo) still++;
          return { ud: -1 };
        });
        standing = still * S.DT;
        if (standing < (S.NF - 1 - s.lo) * 0.3 - 0.1 && s.hi - s.lo > 2) fails.push(`b${b + 1}: stood on the floors only ${standing.toFixed(2)} s`);
        // ↑ carries you back up
        const w3 = quiet({ building: b });
        const s3 = w3.L.shafts.find((q) => q.lo === 0);
        put(w3, 0, s3.x);
        park(w3, s3, 0);
        run(w3, 0.05, { ud: 1 });
        run(w3, 2.5, {});
        if (w3.p.mode !== 'car' || w3.cars[s3.i].at !== 1) fails.push(`b${b + 1}: ↑ from the garage ended at ${w3.cars[s3.i].at}`);
        // ← or → steps out on that floor, walking
        run(w3, 0.3, { lr: 1 });
        if (w3.p.mode !== 'walk' || w3.p.f !== 1) fails.push(`b${b + 1}: → in a stopped car left you ${w3.p.mode} on ${w3.p.f}`);
      }
      return { ok: !fails.length, info: fails.length ? fails.slice(0, 3).join('; ') : 'all 5 hotels: one tap = one floor, held ↓ stops at every floor, ↑ goes up, ← → step out' };
    },
    // the lift comes to you
    liftComes() {
      const fails = [];
      for (let b = 0; b < LV.COUNT; b++) {
        const w = quiet({ building: b });
        for (const s of w.L.shafts) {
          for (const f of [s.lo, s.hi, Math.floor((s.lo + s.hi) / 2)]) {
            const far = f === s.hi ? s.lo : s.hi;
            park(w, s, far);
            put(w, f, s.x);
            run(w, (Math.abs(far - f) * FH) / 6 + 1.2, {});
            const c = w.cars[s.i];
            if (c.at !== f || c.door < 0.9) fails.push(`b${b + 1} lift ${s.i} to floor ${f}: at ${c.at}, door ${c.door.toFixed(2)}`);
          }
        }
      }
      return { ok: !fails.length, info: fails.length ? fails.slice(0, 3).join('; ') : 'every lift comes to every floor it serves when you stand at it, doors open' };
    },
    // the brief: you can never fall into a shaft
    neverFall() {
      const fails = [];
      let crossings = 0;
      for (let b = 0; b < LV.COUNT; b++) {
        const w = quiet({ building: b });
        for (const s of w.L.shafts) {
          for (let f = s.lo; f <= s.hi; f++) {
            if (f === 0 && b < 0) continue;
            // the car is far away (or on its way): walk right across its doors both ways
            park(w, s, f === s.hi ? s.lo : s.hi);
            put(w, f, s.x - 2.2);
            run(w, 1.4, { lr: 1 });
            const a = { f: w.p.f, x: w.p.x, mode: w.p.mode };
            run(w, 1.4, { lr: -1 });
            crossings += 2;
            if (a.f !== f || a.x < s.x + 1 || w.p.f !== f || w.p.x > s.x - 1 || w.p.mode !== 'walk') fails.push(`b${b + 1} floor ${f} lift x ${s.x}: ended ${a.f}/${w.p.f} at ${a.x.toFixed(1)}/${w.p.x.toFixed(1)}`);
          }
        }
      }
      // a kid mashing keys in every hotel, on both levels, never leaves a floor except in a car
      const bad = [];
      for (const level of ['easy', 'normal']) {
        for (let b = 0; b < LV.COUNT; b++) {
          const w = S.create({ level, building: b, seed: 11 + b });
          const m = monkey(5 + b * 3);
          let f = w.p.f, mode = w.p.mode;
          for (let i = 0; i < 60 * 90 && w.phase !== 'over'; i++) {
            S.step(w, m());
            sane(w, bad);
            const p = w.p;
            if (p.mode === 'walk' && mode === 'walk' && p.f !== f && w.phase === 'play') bad.push(`b${b + 1}: walking changed floor ${f}→${p.f}`);
            if (w.phase === 'play' || w.phase === 'ready') { f = p.f; mode = p.mode; }
            if (w.phase === 'turn' || w.phase === 'clear') break;
            if (w.p.mode === 'dizzy') { w.players[w.cp].lives = 9; }
          }
        }
      }
      if (bad.length) fails.push(...bad.slice(0, 2));
      return { ok: !fails.length, info: fails.length ? fails.slice(0, 3).join('; ') : `${crossings} walks across lift doors with the car away: still on the floor; key mashing in 10 hotels: never off a floor but in a car` };
    },
    // the brief: never stuck between floors
    neverStuck() {
      const fails = [];
      let tries = 0;
      for (let b = 0; b < LV.COUNT; b++) {
        for (const s of LV.build(b).shafts) {
          for (const hold of [0.05, 0.4, 0.9, 1.7, 2.9]) {
            for (const dir of [-1, 1]) {
              const w = quiet({ building: b });
              const start = dir < 0 ? s.hi : s.lo;
              put(w, start, s.x);
              park(w, s, start);
              run(w, hold, { ud: dir }); // let go anywhere: mid-floor, during a stop
              tries++;
              run(w, 2.6, {});
              const c = w.cars[s.i];
              if (c.to >= 0 || Math.abs(c.y - c.at * FH) > 1e-6 || w.p.f !== c.at) { fails.push(`b${b + 1} lift ${s.i}: let go after ${hold} s, car at y ${c.y.toFixed(2)} (to ${c.to})`); continue; }
              run(w, 0.4, { lr: s.x > 0 ? -1 : 1 });
              if (w.p.mode !== 'walk' || w.p.f !== c.at) fails.push(`b${b + 1} lift ${s.i}: could not step out (${w.p.mode})`);
            }
          }
        }
      }
      // and the ↑ key in a car at the top of its lift, ↓ at the bottom: nothing happens, → still steps out
      const w = quiet();
      const s = w.L.shafts.find((q) => q.hi === S.NF);
      put(w, S.NF, s.x);
      park(w, s, S.NF);
      run(w, 0.05, { ud: 1 });
      run(w, 1, { ud: 1 });
      run(w, 0.3, { lr: 1 });
      if (w.p.mode !== 'walk' || w.p.f !== S.NF) fails.push(`↑ at the top of a lift: ${w.p.mode} on ${w.p.f}`);
      return { ok: !fails.length, info: fails.length ? fails.slice(0, 3).join('; ') : `${tries} rides let go at all sorts of moments: always finished on a floor and stepped out` };
    },
    // the brief: parcels are delivered in order
    parcelsInOrder() {
      const fails = [];
      for (let b = 0; b < LV.COUNT; b++) {
        const w = quiet({ building: b });
        const T = w.L.targets;
        // the floors go down the hotel, one parcel per floor
        for (let i = 1; i < T.length; i++) if (!(T[i].f < T[i - 1].f)) fails.push(`b${b + 1}: parcel ${i} on floor ${T[i].f} not below ${T[i - 1].f}`);
        // a later door does nothing yet
        put(w, T[1].f, T[1].x);
        const e1 = run(w, 0.3, {});
        if (w.players[0].done !== 0 || e1.some((e) => e.type === 'deliver')) fails.push(`b${b + 1}: parcel 2 went before parcel 1`);
        if (!e1.some((e) => e.type === 'notYet')) fails.push(`b${b + 1}: no "not yet" at a later door`);
        // the right door takes it
        put(w, T[0].f, T[0].x);
        run(w, 0.2, {});
        if (w.players[0].done !== 1) fails.push(`b${b + 1}: parcel 1 not delivered at its door`);
        // whole buildings by the autopilot: the log is 0, 1, 2 ... with nothing skipped
        const w2 = S.create({ level: 'easy', building: b, seed: 3 + b });
        const r = autoplay(w2, 400, 'clear');
        const order = w2.log.map((x) => +x.split(':')[0]);
        if (!r.ok || order.join() !== T.map((t) => t.i).join()) fails.push(`b${b + 1}: autopilot order [${order}] (${r.phase || 'clear'})`);
      }
      // key mashing never delivers out of order either
      for (let b = 0; b < LV.COUNT; b++) {
        const w = quiet({ building: b, seed: 9 });
        const m = monkey(77 + b);
        for (let i = 0; i < 60 * 120; i++) S.step(w, m());
        const order = w.log.map((x) => +x.split(':')[0]);
        if (order.some((v, i) => v !== i)) fails.push(`b${b + 1}: mashing delivered [${order}]`);
      }
      return { ok: !fails.length, info: fails.length ? fails.slice(0, 3).join('; ') : 'parcels go top floor first; a later door says not yet; autopilot and key mashing deliver 1, 2, 3 ... in all 5 hotels' };
    },
    // the brief: a building ends when all are delivered and you reach the garage
    buildingEnds() {
      const fails = [];
      for (let b = 0; b < LV.COUNT; b++) {
        const w = quiet({ building: b });
        const L = w.L;
        put(w, 0, L.vanX);
        const e1 = run(w, 0.5, {});
        if (w.phase !== 'play' || !e1.some((e) => e.type === 'vanWait')) fails.push(`b${b + 1}: the van with parcels left: ${w.phase}`);
        w.players[0].done = L.targets.length - 1;
        put(w, L.targets[L.targets.length - 1].f, L.targets[L.targets.length - 1].x);
        run(w, 0.2, {});
        if (w.players[0].done !== L.targets.length || w.phase !== 'play') fails.push(`b${b + 1}: last parcel: done ${w.players[0].done}, ${w.phase}`);
        put(w, 0, L.vanX - 2.5 * Math.sign(L.vanX));
        run(w, 0.3, {});
        if (w.phase !== 'play') fails.push(`b${b + 1}: ended before reaching the van`);
        run(w, 1.2, { lr: Math.sign(L.vanX) });
        if (w.phase !== 'clear') fails.push(`b${b + 1}: all delivered + van = ${w.phase}`);
        run(w, S.CLEAR_T + 0.2, {});
        const pl = w.players[0];
        if (b < LV.COUNT - 1 && (pl.b !== b + 1 || w.L.index !== b + 1 || pl.done !== 0 || w.p.f !== S.NF)) fails.push(`b${b + 1}: next hotel ${pl.b}, floor ${w.p.f}`);
        if (b === LV.COUNT - 1 && w.phase !== 'won') fails.push(`b5: after the last hotel: ${w.phase}`);
      }
      // the autopilot plays all 5 hotels on EASY and NORMAL, 1 player and 2
      const runs = [];
      for (const [level, players, seed] of [['easy', ['teddy'], 1], ['easy', ['tommy'], 2], ['normal', ['teddy'], 3], ['easy', ['teddy', 'tommy'], 4], ['normal', ['teddy', 'tommy'], 5]]) {
        const w = S.create({ level, players, seed });
        w.players.forEach((pl) => (pl.lives = 99)); // a bump passes the turn; this checks the rules, not the bot's luck
        const r = autoplay(w, 60 * 30, 'won');
        runs.push(`${level} ${players.length}P ${r.ok ? r.t + ' s' : 'stuck in b' + (r.b + 1) + ' ' + r.phase}`);
        if (!r.ok) fails.push(`autopilot ${level} ${players.length}P: ${r.phase} b${r.b + 1} parcel ${r.done}`);
        if (r.bad.length) fails.push(`autopilot ${level}: ${r.bad[0]}`);
      }
      return { ok: !fails.length, info: fails.length ? fails.slice(0, 3).join('; ') : `van waits for the parcels, then ends the hotel; the next hotel starts on the roof; autopilot wins all 5: ${runs.join(', ')}` };
    },
    // the brief: robots never appear right on top of you
    spawnSafe() {
      const fails = [];
      let n = 0, min = 99;
      for (const level of ['easy', 'normal']) {
        for (let b = 0; b < LV.COUNT; b++) {
          for (const how of ['bot', 'monkey']) {
            const w = S.create({ level, building: b, seed: 100 + b });
            w.players[0].lives = 999;
            const m = monkey(31 + b);
            let inp = null, k = 0;
            for (let i = 0; i < 60 * 150; i++) {
              if (how === 'monkey') inp = m();
              else if (k++ % 3 === 0 || !inp) inp = B.decide(w);
              S.step(w, inp);
              for (const e of w.events) {
                if (e.type !== 'robotOut') continue;
                n++;
                const d = Math.abs(e.x - w.p.x);
                min = Math.min(min, d);
                if (d < w.cfg.safe - 1e-6) fails.push(`${level} b${b + 1}: a robot popped out ${d.toFixed(2)} m away`);
                if (w.p.mode !== 'walk') fails.push(`${level} b${b + 1}: a robot popped out while you were ${w.p.mode}`);
              }
              if (w.phase === 'clear' || w.phase === 'won') break;
            }
          }
        }
      }
      if (n < 100) fails.push(`only ${n} robots came out`);
      return { ok: !fails.length, info: fails.length ? fails.slice(0, 3).join('; ') : `${n} robots popped out, the nearest ${min.toFixed(1)} m away (EASY ≥ 5.5, NORMAL ≥ 4.5), none while riding` };
    },
    // pillows make robots dizzy, then they float away; a bump costs a life and the robots float away too
    pillowsAndBumps() {
      const fails = [];
      const w = quiet({ building: 1 });
      put(w, 7, -8);
      w.robots.push({ id: 90, f: 7, x: -2, home: -3, face: -1, st: 'walk', t: 0, throwCd: 9, thrower: false });
      w.p.face = 1;
      const e = run(w, 1.2, { pillow: true });
      const r = w.robots.find((q) => q.id === 90);
      if (!e.some((x) => x.type === 'puff') || (r && r.st !== 'float' && r.st !== 'dizzy')) fails.push('a pillow did not make the robot dizzy');
      run(w, 3, {});
      if (w.robots.length) fails.push('the dizzy robot did not float away');
      if (w.players[0].score < 100) fails.push('no points for a pillow');
      // a bump: one life, dizzy, then on your feet again with a moment of safety
      const w2 = quiet({ building: 1 });
      put(w2, 7, 0);
      w2.robots.push({ id: 91, f: 7, x: 2, home: 3, face: -1, st: 'walk', t: 0, throwCd: 9, thrower: false }, { id: 92, f: 7, x: 6, home: 8.6, face: -1, st: 'walk', t: 0, throwCd: 9, thrower: false });
      run(w2, 1.5, {});
      const lives = w2.players[0].lives;
      run(w2, 2, {});
      if (lives !== S.LEVELS.easy.lives - 1) fails.push(`a bump left ${lives} lives`);
      if (w2.p.mode !== 'walk' || w2.robots.length) fails.push(`after a bump: ${w2.p.mode}, ${w2.robots.length} robots left`);
      run(w2, 0.4, { lr: 1 });
      if (!(w2.p.x > 0.5)) fails.push('could not walk after a bump');
      return { ok: !fails.length, info: fails.length ? fails.join('; ') : 'pillow → dizzy → floats away (+100); bump → 1 life, robots float away, walking again' };
    },
    // NORMAL: towels at head height; ducking lets them fly over
    duckTowels() {
      const fails = [];
      for (const duck of [true, false]) {
        const w = quiet({ level: 'normal', building: 2 });
        put(w, 5, 0);
        w.towels.push({ x: 5, f: 5, vx: -5.2, t: 0, y: 1.05, dodged: false });
        const e = run(w, 1.6, { duck });
        const hit = e.some((x) => x.type === 'bump');
        if (duck && (hit || !e.some((x) => x.type === 'dodge'))) fails.push('a towel hit a ducking courier');
        if (!duck && !hit) fails.push('a towel flew through a standing courier');
      }
      // ducking is only while Z is held: let go and he walks
      const w = quiet();
      put(w, 7, 0);
      run(w, 0.5, { duck: true, lr: 1 });
      const x0 = w.p.x;
      run(w, 0.5, { lr: 1 });
      if (Math.abs(x0) > 1e-6 || !(w.p.x > 1) || w.p.duck) fails.push(`duck: moved ${x0.toFixed(2)} while ducking, then ${w.p.x.toFixed(2)}`);
      // EASY robots never throw
      const we = S.create({ level: 'easy', seed: 5 });
      let towels = 0;
      for (let i = 0; i < 60 * 200 && we.phase !== 'won'; i++) { S.step(we, B.decide(we)); if (we.events.some((x) => x.type === 'towel')) towels++; we.players[0].lives = 9; }
      if (towels) fails.push(`${towels} towels on EASY`);
      return { ok: !fails.length, info: fails.length ? fails.join('; ') : 'ducking dodges a towel (+50), standing gets bumped; Z only ducks while held; no towels on EASY' };
    },
    easyNormal() {
      const e = S.LEVELS.easy, n = S.LEVELS.normal;
      const fails = [];
      if (S.create({ level: 'easy' }).players[0].lives !== 5) fails.push('EASY is not 5 lives');
      if (S.create({ level: 'normal' }).players[0].lives !== 3) fails.push('NORMAL is not 3 lives');
      for (let b = 0; b < LV.COUNT; b++) if (!(e.rob[0] + e.rob[1] * b < n.rob[0] + n.rob[1] * b)) fails.push(`b${b + 1}: EASY robots not slower`);
      if (!(e.safe > n.safe) || e.towels) fails.push('EASY robots not kinder');
      return { ok: !fails.length, info: fails.length ? fails.join('; ') : `EASY: 5 lives, robots ${e.rob[0]}–${(e.rob[0] + e.rob[1] * 4).toFixed(2)} m/s, no towels; NORMAL: 3 lives, ${n.rob[0]}–${(n.rob[0] + n.rob[1] * 4).toFixed(2)} m/s, towels` };
    },
    // the companion: he delivers the next parcel, every time he's called, in order
    buddyDelivers() {
      const fails = [];
      const w = quiet({ building: 3 });
      put(w, S.NF, w.L.startX);
      const n = w.L.targets.length;
      let calls = 0, inOrder = true;
      for (let k = 0; k < n + 2; k++) {
        const before = w.players[0].done;
        if (!S.call(w)) { fails.push(`call ${k + 1} refused`); break; }
        calls++;
        const e = run(w, S.BUDDY_END + 0.1, {});
        const d = e.filter((x) => x.type === 'deliver');
        if (before < n) {
          if (d.length !== 1 || d[0].i !== before || d[0].by !== 'buddy') inOrder = false;
          if (!e.some((x) => x.type === 'treat') || !e.some((x) => x.type === 'buddyShout')) fails.push('no treat or shout');
        } else if (d.length) inOrder = false;
      }
      if (!inOrder) fails.push('the brother skipped or repeated a parcel');
      if (w.players[0].done !== n) fails.push(`after ${calls} calls ${w.players[0].done}/${n} delivered`);
      // robots stand still while he's here
      const w2 = quiet({ building: 1 });
      put(w2, 7, 0);
      w2.robots.push({ id: 93, f: 7, x: 1.5, home: 3, face: -1, st: 'walk', t: 0, throwCd: 9, thrower: false });
      S.call(w2);
      run(w2, 2, {});
      if (w2.players[0].lives !== 5 || Math.abs(w2.robots[0].x - 1.5) > 1e-6) fails.push('a robot moved or bumped while the brother was there');
      // 2 players: T is a high five, no delivery
      const w3 = quiet({ players: ['teddy', 'tommy'] });
      S.call(w3);
      const e3 = run(w3, 2, {});
      if (!e3.some((x) => x.type === 'hi5') || e3.some((x) => x.type === 'deliver')) fails.push('2P: T was not a high five');
      return { ok: !fails.length, info: fails.length ? fails.join('; ') : `${calls} calls in a row: he delivered parcels 1–${n} in order (then just cheered); robots wait while he's there; 2P = high five` };
    },
    // 2 players take turns: a bump passes the turn; each keeps his own hotel, parcels, lives and score
    turns() {
      const fails = [];
      const w = quiet({ players: ['teddy', 'tommy'] });
      w.players[0].done = 2;
      w.players[0].score = 1234;
      put(w, 9, -4);
      w.robots.push({ id: 94, f: 9, x: -3, home: -3, face: -1, st: 'walk', t: 0, throwCd: 9, thrower: false });
      run(w, 2, {});
      if (w.phase !== 'turn') fails.push(`a bump in 2P: ${w.phase}`);
      run(w, S.TURN_T + 1.2, {});
      if (w.cp !== 1 || w.p.f !== S.NF || w.players[1].done !== 0) fails.push(`Tommy's turn: cp ${w.cp}, floor ${w.p.f}`);
      w.robots.push({ id: 95, f: S.NF - 1, x: 0, home: 0, face: -1, st: 'walk', t: 0, throwCd: 9, thrower: false });
      put(w, S.NF - 1, 0.3);
      run(w, 2, {});
      run(w, S.TURN_T + 1.2, {});
      const t = w.players[0];
      if (w.cp !== 0 || w.p.f !== 9 || Math.abs(w.p.x + 4) > 1 || t.done !== 2 || t.score !== 1234 || t.lives !== 4) fails.push(`back to Teddy: cp ${w.cp} floor ${w.p.f} x ${w.p.x.toFixed(1)} done ${t.done} lives ${t.lives}`);
      // a brother out of lives is skipped; both out = game over
      w.players[1].out = true;
      w.players[0].lives = 1;
      w.robots.push({ id: 96, f: 9, x: w.p.x + 0.3, home: 0, face: -1, st: 'walk', t: 0, throwCd: 9, thrower: false });
      run(w, 2.2, {});
      if (w.phase !== 'over') fails.push(`both out: ${w.phase}`);
      return { ok: !fails.length, info: fails.length ? fails.join('; ') : 'a bump passes the turn; each brother comes back to his own floor, parcels, score and lives; both out = game over' };
    },
  };

  // each sabotage breaks one rule; fail() proves a check catches it
  const SABOTAGES = [
    ['noStop', 'held ↓ rides past floors without stopping', 'liftsCarry'],
    ['shaftFall', 'a lift with its car away is a hole', 'neverFall'],
    ['midStop', 'letting go stops the car between floors', 'neverStuck'],
    ['anyOrder', 'any parcel door takes a parcel', 'parcelsInOrder'],
    ['garageEarly', 'the van ends the hotel with parcels left', 'buildingEnds'],
    ['spawnOnTop', 'robots pop out of the nearest door', 'spawnSafe'],
  ];
  function runAll(only) {
    const results = [];
    for (const name of Object.keys(CHECKS)) {
      if (only && !only.includes(name)) continue;
      let r;
      try { r = CHECKS[name](); } catch (e) { r = { ok: false, info: 'threw ' + (e && e.stack ? e.stack.split('\n').slice(0, 2).join(' ') : e) }; }
      results.push({ name, ok: r.ok, info: r.info });
    }
    const failed = results.filter((r) => !r.ok).map((r) => r.name);
    return { ok: !failed.length, results, failed };
  }
  function fail() {
    const caught = [];
    for (const [sab, what, check] of SABOTAGES) {
      S.sabotage(sab);
      let r;
      try { r = runAll([check]); } finally { S.sabotage(null); }
      caught.push({ sabotage: sab, what, check, caught: !r.ok, failed: r.results.filter((x) => !x.ok).map((x) => x.info.slice(0, 140)) });
    }
    return { ok: caught.every((c) => c.caught), caught };
  }
  ED.check = { run: runAll, fail, autoplay, monkey, quiet, CHECKS };
})(typeof window !== 'undefined' ? window : globalThis);
