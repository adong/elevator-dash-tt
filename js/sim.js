/* TT Elevator Dash: the rules, in fixed 1/60 s steps, with no drawing (js/game.js draws; tools/check.js runs this in node).
   A courier walks the corridors of a toy hotel (side view). Floors are solid all the way across: the lifts sit in the back
   wall behind glass doors, so nobody can ever fall down a shaft. Stand at a lift and it comes to you; step in with ↑ or ↓
   and it carries you one floor at a time, stopping at every floor, and it always finishes the floor it started (never
   stuck between floors). ← or → steps out. Parcels go to glowing doors in order, top first; with all of them delivered,
   the van in the garage ends the building. Bellhop robots pop out of doors (never close to you) and roll toward you;
   a pillow makes them dizzy and they float away in a bubble. On NORMAL some toss rolled-up towels at head height: duck.
   A bump costs a life; the robots say sorry and float away. 2 players take turns (a bump passes the turn).
   The brother called with T pops in, does his signature move, tosses a treat and delivers the next parcel for you. */
(function (root) {
  'use strict';
  const ED = (root.ED = root.ED || {});
  const LV = ED.levels;
  const DT = 1 / 60, FH = LV.FH, NF = LV.NF;
  const XL = -9.5, XR = 9.5;
  const IN_R = 0.6; // standing at a lift or a door
  const BUMP_R = 0.72, PILLOW_R = 0.6, TOWEL_R = 0.42;
  const READY = 1.6, TURN_T = 2.4, CLEAR_T = 4.6, STOP = 0.4, EXPRESS = 6, DIZZY = 1.5, SAFE_AFTER = 2.5;
  const BUDDY_INTRO = 1.0, BUDDY_FLY = 1.3, BUDDY_END = BUDDY_INTRO + BUDDY_FLY + 0.8;
  const TREATS = ['🍦', '💧', '🧃', '🍪', '🍉', '🍌'];
  const LEVELS = {
    // walk m/s, robot speed (base, + per building), robots at once per building, first robot after reaching a floor,
    // then one every (base - per building) s, how far from you a robot may pop out, towels, lift speed
    easy: { lives: 5, walk: 3.3, rob: [0.95, 0.1], max: [1, 1, 2, 2, 2], first: 2.8, every: [4.8, 0.25], safe: 5.5, towels: false, ride: 2.7 },
    normal: { lives: 3, walk: 3.5, rob: [1.55, 0.15], max: [2, 2, 2, 3, 3], first: 1.6, every: [3.0, 0.2], safe: 4.5, towels: true, ride: 3.0 },
  };
  let SAB = null; // js/check.js breaks one rule on purpose to prove the check can fail

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function rnd(w) { w.seed = (w.seed * 1664525 + 1013904223) >>> 0; return w.seed / 4294967296; }
  const ev = (w, type, o) => w.events.push(Object.assign({ type }, o || {}));

  function create(o) {
    o = o || {};
    const level = o.level === 'normal' ? 'normal' : 'easy';
    const cfg = LEVELS[level];
    const who = o.players || ['teddy'];
    const w = {
      level, cfg, seed: (o.seed >>> 0) || 1, t: 0, events: [], two: who.length === 2, cp: 0, rid: 0, calls: 0, log: [], spawns: [],
      players: who.map((id) => ({ who: id, score: 0, lives: cfg.lives, b: 0, done: 0, f: NF, x: null, out: false, nextLife: 20000, round: 1 })),
      buddyFor: o.buddyFor || ((id) => (id === 'tommy' ? 'teddy' : 'tommy')),
      phase: 'ready', phaseT: 0,
    };
    if (o.building) w.players.forEach((pl) => (pl.b = o.building));
    loadBuilding(w, true);
    return w;
  }
  // build the current player's hotel; fresh = from the roof, else where he was when his turn ended
  function loadBuilding(w, fresh) {
    const pl = w.players[w.cp];
    const L = (w.L = LV.build(pl.b));
    w.cars = L.shafts.map((s) => ({ i: s.i, x: s.x, lo: s.lo, hi: s.hi, at: s.hi, to: -1, y: s.hi * FH, stopT: 0, door: 0, rider: false }));
    w.robots = [];
    w.pillows = [];
    w.towels = [];
    w.buddy = null;
    if (fresh || pl.x == null) { pl.f = NF; pl.x = L.startX; }
    w.p = { x: pl.x, f: pl.f, mode: 'walk', car: -1, face: pl.x > 0 ? -1 : 1, duck: false, inv: 0, dz: 0, walkT: 0, vx: 0, pillowCd: 0 };
    w.drop = !!fresh; // the blimp lowers him onto the roof (drawn by the page)
    w.spawnT = w.cfg.first;
    w.lastF = w.p.f;
    w.bt = 0;
    w.nag = 0;
    w.phase = 'ready';
    w.phaseT = 0;
  }
  const py = (w) => (w.p.mode === 'car' ? w.cars[w.p.car].y : w.p.f * FH);
  const frozen = (w) => !!(w.buddy && w.buddy.kind === 'help'); // nothing bumps while the brother is here

  function addScore(w, n) {
    const pl = w.players[w.cp];
    pl.score += n;
    while (pl.score >= pl.nextLife) {
      pl.nextLife += 20000;
      pl.lives++;
      ev(w, 'extraLife', { who: pl.who });
    }
  }

  function step(w, inp) {
    inp = inp || {};
    w.events = [];
    w.t += DT;
    w.phaseT += DT;
    stepBuddy(w);
    switch (w.phase) {
      case 'ready':
        stepCars(w);
        if (w.phaseT >= (w.drop ? READY : 0.8)) { w.phase = 'play'; w.phaseT = 0; w.drop = false; ev(w, 'go'); }
        break;
      case 'play': play(w, inp); break;
      case 'clear':
        stepCars(w);
        if (w.phaseT >= CLEAR_T) nextBuilding(w);
        break;
      case 'turn':
        if (w.phaseT >= TURN_T) {
          w.cp = 1 - w.cp;
          loadBuilding(w, false);
          ev(w, 'building', { b: w.L.index, turn: true });
        }
        break;
    }
  }

  function play(w, inp) {
    const p = w.p;
    w.bt += DT;
    w.nag = Math.max(0, w.nag - DT);
    p.inv = Math.max(0, p.inv - DT);
    p.pillowCd = Math.max(0, p.pillowCd - DT);
    if (p.mode === 'dizzy') { p.dz -= DT; if (p.dz <= 0) afterBump(w); }
    else if (p.mode === 'walk') walk(w, inp);
    else if (p.mode === 'car') ride(w, inp);
    stepCars(w);
    if (p.mode === 'walk' && p.f !== w.lastF) { w.lastF = p.f; w.spawnT = w.cfg.first; }
    stepRobots(w);
    stepPillows(w);
    stepTowels(w);
    if (p.mode === 'walk' && w.phase === 'play') { deliveries(w); garage(w); }
  }

  // ---------- walking, and the lifts ----------
  function walk(w, inp) {
    const p = w.p, cfg = w.cfg;
    p.duck = !!inp.duck;
    const lr = inp.lr ? Math.sign(inp.lr) : 0;
    if (lr) p.face = lr;
    p.vx = p.duck ? 0 : lr * cfg.walk;
    const nx = clamp(p.x + p.vx * DT, XL, XR);
    p.walkT += Math.abs(nx - p.x);
    p.x = nx;
    if (SAB === 'shaftFall') {
      // the broken rule: a lift with no car here is a hole
      const s = LV.shaftAt(w.L, p.f, p.x, 0.5);
      if (s && w.cars[s.i].at !== p.f && p.f > 0) { p.f--; return; }
    }
    if (inp.pillow && p.pillowCd <= 0 && w.pillows.length < 2) {
      w.pillows.push({ x: p.x + p.face * 0.45, f: p.f, y: p.duck ? 0.45 : 0.85, vx: p.face * 9, t: 0, spin: 0 });
      p.pillowCd = 0.32;
      ev(w, 'pillow', { x: p.x, f: p.f, low: p.duck });
    }
    const s = LV.shaftAt(w.L, p.f, p.x, IN_R);
    if (!s) return;
    const c = w.cars[s.i];
    if (c.at === p.f && c.to < 0) {
      if (inp.ud && !p.duck) enter(w, c, Math.sign(inp.ud));
    } else if (c.to !== p.f && !c.rider) {
      // the lift comes to you (express, no stops)
      c.to = p.f;
      c.at = -1;
      ev(w, 'call', { car: c.i, f: p.f });
    }
  }
  function enter(w, c, ud) {
    const p = w.p;
    p.mode = 'car';
    p.car = c.i;
    p.duck = false;
    p.vx = 0;
    p.x = c.x;
    c.rider = true;
    ev(w, 'enter', { car: c.i, f: p.f });
    go(w, c, ud);
  }
  function go(w, c, ud) {
    const f = c.at + ud;
    if (f < c.lo || f > c.hi) return false;
    c.to = f;
    c.from = c.at;
    c.at = -1;
    ev(w, 'lift', { car: c.i, dir: ud });
    return true;
  }
  function ride(w, inp) {
    const p = w.p, c = w.cars[p.car];
    p.duck = false;
    p.x = c.x;
    if (c.to >= 0) {
      if (SAB === 'midStop' && !inp.ud && Math.abs(c.y - c.to * FH) > 0.5) { c.to = -2; } // the broken rule: let go and it stops where it is
      return; // moving: it always finishes the floor it started
    }
    if (c.at < 0) return;
    p.f = c.at;
    const ud = inp.ud ? Math.sign(inp.ud) : 0;
    if (ud && c.stopT <= 0 && go(w, c, ud)) return;
    if (inp.lr) {
      const lr = Math.sign(inp.lr);
      p.mode = 'walk';
      p.car = -1;
      p.f = c.at;
      p.face = lr;
      p.x = c.x + lr * 0.05;
      c.rider = false;
      ev(w, 'exit', { car: c.i, f: p.f });
    }
  }
  function stepCars(w) {
    for (const c of w.cars) {
      if (c.to === -2) { c.door = 0; continue; } // only the "midStop" sabotage gets here
      if (c.to >= 0) {
        if (c.door > 0) { c.door = Math.max(0, c.door - DT * 6); continue; } // the doors shut before it moves
        const ty = c.to * FH, sp = c.rider ? w.cfg.ride : EXPRESS;
        const d = ty - c.y;
        if (Math.abs(d) <= sp * DT + 1e-9) {
          c.y = ty;
          c.at = c.to;
          c.to = -1;
          c.stopT = SAB === 'noStop' ? 0 : STOP;
          if (c.rider) w.p.f = c.at;
          ev(w, 'ding', { car: c.i, f: c.at, rider: c.rider });
        } else c.y += Math.sign(d) * sp * DT;
      } else {
        c.stopT = Math.max(0, c.stopT - DT);
        if (!c.rider || c.stopT <= 0) c.door = Math.min(1, c.door + DT * 4);
      }
    }
  }

  // ---------- parcels and the garage ----------
  function deliveries(w) {
    const p = w.p, pl = w.players[w.cp], L = w.L;
    for (const tg of L.targets) {
      if (tg.f !== p.f || Math.abs(tg.x - p.x) > IN_R) continue;
      if (tg.i === pl.done || (SAB === 'anyOrder' && !w.log.includes(tg.i + ':' + pl.b + ':' + w.cp))) deliver(w, tg.i, 'me');
      else if (tg.i > pl.done && w.nag <= 0) { w.nag = 2.5; ev(w, 'notYet', { i: tg.i, next: pl.done, x: tg.x, f: tg.f }); }
    }
  }
  function deliver(w, i, by) {
    const pl = w.players[w.cp], tg = w.L.targets[i];
    if (SAB === 'anyOrder') pl.done++;
    else pl.done = i + 1;
    w.log.push(i + ':' + pl.b + ':' + w.cp);
    addScore(w, 500);
    ev(w, 'deliver', { i, f: tg.f, x: tg.x, by, guest: tg.guest, left: w.L.targets.length - pl.done });
    if (pl.done >= w.L.targets.length) ev(w, 'allDone');
  }
  function garage(w) {
    const p = w.p, pl = w.players[w.cp], L = w.L;
    if (p.f !== 0 || Math.abs(p.x - L.vanX) > 1.3) return;
    if (pl.done >= L.targets.length || SAB === 'garageEarly') {
      const bonus = Math.max(500, Math.round((5000 - w.bt * 20) / 10) * 10);
      addScore(w, bonus);
      w.phase = 'clear';
      w.phaseT = 0;
      p.mode = 'cheer';
      p.duck = false;
      w.robots.forEach((r) => { if (r.st !== 'float') { r.st = 'float'; r.t = 0; } });
      w.towels = [];
      w.pillows = [];
      ev(w, 'clear', { b: L.index, bonus });
    } else if (w.nag <= 0) {
      w.nag = 2.5;
      ev(w, 'vanWait', { left: L.targets.length - pl.done });
    }
  }
  function nextBuilding(w) {
    const pl = w.players[w.cp];
    pl.b++;
    pl.done = 0;
    pl.x = null;
    if (pl.b >= LV.COUNT) {
      pl.b = LV.COUNT - 1;
      w.phase = 'won';
      w.phaseT = 0;
      ev(w, 'won', { who: pl.who });
      return;
    }
    loadBuilding(w, true);
    ev(w, 'building', { b: pl.b });
  }

  // ---------- robots ----------
  function stepRobots(w) {
    const p = w.p, cfg = w.cfg, b = w.L.index, fz = frozen(w);
    const spd = cfg.rob[0] + cfg.rob[1] * b;
    const live = (r) => r.st === 'out' || r.st === 'walk' || r.st === 'throw';
    // a new robot pops out of a door on your floor, never close to you
    if (p.mode === 'walk' && p.f < NF && !fz && w.phase === 'play') {
      w.spawnT -= DT;
      const n = w.robots.filter((r) => r.f === p.f && live(r)).length;
      if (w.spawnT <= 0) {
        w.spawnT = 0.5;
        if (n < cfg.max[b]) {
          const pl = w.players[w.cp];
          const next = w.L.targets[pl.done];
          let doors = LV.DOORS.map((x, d) => ({ x, d })).filter(({ x, d }) => {
            if (p.f > 0 && next && next.f === p.f && next.d === d) return false; // a guest is waiting there
            if (p.f === 0 && Math.abs(x - w.L.vanX) < 2) return false;
            if (w.robots.some((r) => r.f === p.f && r.st === 'out' && Math.abs(r.x - x) < 1)) return false;
            return Math.abs(x - p.x) >= cfg.safe;
          });
          if (SAB === 'spawnOnTop') doors = LV.DOORS.map((x, d) => ({ x, d })).sort((a, c) => Math.abs(a.x - p.x) - Math.abs(c.x - p.x)).slice(0, 1);
          if (doors.length) {
            const d = doors[Math.floor(rnd(w) * doors.length)];
            const r = { id: ++w.rid, f: p.f, x: d.x, home: d.x, face: p.x > d.x ? 1 : -1, st: 'out', t: 0, throwCd: 1.5 + rnd(w) * 2, thrower: cfg.towels && rnd(w) < 0.5 };
            w.robots.push(r);
            w.spawns.push(Math.abs(d.x - p.x));
            w.spawnT = cfg.every[0] - cfg.every[1] * b;
            ev(w, 'robotOut', { id: r.id, x: r.x, f: r.f, dist: Math.abs(d.x - p.x) });
          }
        }
      }
    }
    for (const r of w.robots) {
      r.t += DT;
      if (fz && live(r)) continue;
      switch (r.st) {
        case 'out': if (r.t > 0.6) { r.st = 'walk'; r.t = 0; } break; // popping out of the door: harmless
        case 'walk': {
          const chase = r.f === p.f && p.mode === 'walk';
          if (!chase) {
            // you rode away: he rolls back to his door and goes in
            const d = r.home - r.x;
            if (Math.abs(d) < 0.1) { r.st = 'in'; r.t = 0; break; }
            r.face = Math.sign(d);
            r.x += r.face * Math.min(Math.abs(d), spd * DT);
            break;
          }
          r.face = p.x > r.x ? 1 : -1;
          const gap = Math.abs(p.x - r.x);
          r.x += r.face * Math.min(gap, spd * DT);
          r.throwCd -= DT;
          if (r.thrower && r.throwCd <= 0 && gap > 3 && gap < 8) { r.st = 'throw'; r.t = 0; }
          break;
        }
        case 'throw':
          if (r.t >= 0.55) {
            w.towels.push({ x: r.x + r.face * 0.4, f: r.f, vx: r.face * 5.2, t: 0, y: 1.05, dodged: false });
            ev(w, 'towel', { x: r.x, f: r.f });
            r.st = 'walk';
            r.t = 0;
            r.throwCd = 2.5 + rnd(w) * 2.5;
          }
          break;
        case 'dizzy': if (r.t > 0.8) { r.st = 'float'; r.t = 0; ev(w, 'float', { id: r.id, x: r.x, f: r.f }); } break;
      }
      if (live(r) && r.st !== 'out' && r.f === p.f && p.mode === 'walk' && p.inv <= 0 && w.phase === 'play' && Math.abs(r.x - p.x) < BUMP_R) bump(w, r);
    }
    w.robots = w.robots.filter((r) => !((r.st === 'float' && r.t > 2.2) || (r.st === 'in' && r.t > 0.5)));
  }
  function stepPillows(w) {
    for (const q of w.pillows) {
      q.t += DT;
      q.x += q.vx * DT;
      q.spin += DT * 12;
      for (const r of w.robots) {
        if (r.f !== q.f || !(r.st === 'out' || r.st === 'walk' || r.st === 'throw') || Math.abs(r.x - q.x) > PILLOW_R) continue;
        r.st = 'dizzy';
        r.t = 0;
        q.hit = true;
        addScore(w, 100);
        ev(w, 'puff', { id: r.id, x: r.x, f: r.f });
        break;
      }
      if (!q.hit && (q.t > 0.85 || q.x < XL - 0.3 || q.x > XR + 0.3)) { q.hit = true; ev(w, 'feathers', { x: q.x, f: q.f, y: q.y }); }
    }
    w.pillows = w.pillows.filter((q) => !q.hit);
  }
  function stepTowels(w) {
    const p = w.p, fz = frozen(w);
    for (const o of w.towels) {
      if (fz) continue;
      o.t += DT;
      const was = o.x - p.x;
      o.x += o.vx * DT;
      if (o.f === p.f && p.mode === 'walk' && w.phase === 'play') {
        if (!p.duck && p.inv <= 0 && Math.abs(o.x - p.x) < TOWEL_R) { o.gone = true; bump(w, null); continue; }
        if (p.duck && !o.dodged && Math.sign(o.x - p.x) !== Math.sign(was)) { o.dodged = true; addScore(w, 50); ev(w, 'dodge', { x: p.x, f: p.f }); }
      }
      if (o.t > 2.4 || o.x < XL - 1 || o.x > XR + 1) o.gone = true;
    }
    w.towels = w.towels.filter((o) => !o.gone);
  }
  function bump(w, r) {
    const p = w.p, pl = w.players[w.cp];
    p.mode = 'dizzy';
    p.dz = DIZZY;
    p.duck = false;
    p.vx = 0;
    pl.lives--;
    ev(w, 'bump', { x: p.x, f: p.f, by: r ? 'robot' : 'towel' });
    // nobody's hurt: every robot on the floor says sorry and floats away
    for (const q of w.robots) if (q.f === p.f && q.st !== 'float') { q.st = 'float'; q.t = 0; q.sorry = true; ev(w, 'float', { id: q.id, x: q.x, f: q.f, sorry: true }); }
    w.towels = [];
    w.pillows = [];
  }
  function afterBump(w) {
    const p = w.p, pl = w.players[w.cp];
    pl.f = p.f;
    pl.x = p.x;
    if (pl.lives <= 0) { pl.out = true; ev(w, 'out', { who: pl.who }); }
    const other = w.two ? w.players[1 - w.cp] : null;
    if (other && !other.out) {
      w.phase = 'turn';
      w.phaseT = 0;
      p.mode = 'gone';
      ev(w, 'turn', { who: other.who });
      return;
    }
    if (pl.out) {
      w.phase = 'over';
      w.phaseT = 0;
      p.mode = 'gone';
      ev(w, 'over');
      return;
    }
    p.mode = 'walk';
    p.inv = SAFE_AFTER;
    w.spawnT = w.cfg.first + 1;
  }

  // ---------- the brother ----------
  function call(w) {
    if (w.phase !== 'play' || w.buddy) return false;
    const pl = w.players[w.cp];
    if (w.two) {
      const other = w.players[1 - w.cp];
      w.buddy = { kind: 'hi5', t: 0, who: other.who, done: false };
      return true;
    }
    w.calls++;
    const n = w.calls;
    const target = pl.done < w.L.targets.length ? pl.done : -1;
    w.buddy = { kind: 'help', t: 0, who: w.buddyFor(pl.who), n, treat: TREATS[(n - 1) % TREATS.length], target, x0: w.p.x, f0: w.p.f, tossed: false, shouted: false, delivered: false };
    ev(w, 'buddyIn', { who: w.buddy.who, n });
    return true;
  }
  function stepBuddy(w) {
    const bd = w.buddy;
    if (!bd) return;
    bd.t += DT;
    if (bd.kind === 'hi5') {
      if (!bd.done && bd.t >= 0.5) { bd.done = true; addScore(w, 50); ev(w, 'hi5'); }
      if (bd.t > 1.6) { w.buddy = null; ev(w, 'buddyOut'); }
      return;
    }
    if (!bd.tossed && bd.t >= 0.7) { bd.tossed = true; addScore(w, 100); ev(w, 'treat', { e: bd.treat }); }
    if (!bd.shouted && bd.t >= BUDDY_INTRO) {
      bd.shouted = true;
      ev(w, 'buddyShout', { who: bd.who, target: bd.target });
    }
    if (bd.target >= 0 && !bd.delivered && bd.t >= BUDDY_INTRO + BUDDY_FLY) {
      bd.delivered = true;
      if (w.players[w.cp].done === bd.target && w.phase === 'play') deliver(w, bd.target, 'buddy');
    }
    if (bd.t >= (bd.target >= 0 ? BUDDY_END : BUDDY_INTRO + 1.2)) { w.buddy = null; ev(w, 'buddyOut'); }
  }

  ED.sim = {
    DT, FH, NF, XL, XR, IN_R, BUMP_R, READY, TURN_T, CLEAR_T, STOP, BUDDY_INTRO, BUDDY_FLY, BUDDY_END, LEVELS, TREATS,
    create, loadBuilding, step, call, py, rnd,
    sabotage(s) { SAB = s || null; return SAB; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
