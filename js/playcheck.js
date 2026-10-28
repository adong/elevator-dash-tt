/* TT Elevator Dash: the play check with real keys and taps, in the page: game.playCheck().
   Everything here presses keys with real keydown/keyup events on window and taps the touch buttons with pointer
   events, so it goes through the same input code a kid's fingers do (never the autopilot). Time moves with
   game.step, which runs the same frame code as the browser's own frames. Positions are read on the screen, from where
   the courier is drawn; up and down are measured against a fixed point (the garage floor), since the camera glides.
   - direction: → moves right and ← moves left on screen in all 5 hotels (roof, a hotel floor, the garage), for Teddy,
     Tommy and 2 players, with keys and with the touch arrows; ↑ ↓ in a lift ride it up and down the screen; ← → step
     out of a lift the way they point; Z and 🙇 duck (and towels fly over); Space and ☁️ toss a pillow the way he faces.
   - nothing leaves him stuck: letting go mid-ride, a lift at the end of its run, ducking, a bump, a key held through
     pause, the brother's visit, the turn passing in 2 players, and a "keyboard kid" mashing keys in every hotel.
   - ↓ never goes up: every lift on every hotel, keys and touch, standing or walking in (Alan's bug report).
   game.playCheck('mirror'), ('flipUD'), ('stuckCar') and ('stuckDuck') prove the check fails when the controls are wrong. */
(function () {
  'use strict';
  const LV = ED.levels, S = ED.sim, FH = S.FH, NF = S.NF;
  const NAMES = { ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', Space: ' ', KeyZ: 'z', KeyT: 't', KeyP: 'p', KeyA: 'a', KeyD: 'd', KeyW: 'w', KeyS: 's' };
  const key = (code, down) => dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: NAMES[code] || code, bubbles: true, cancelable: true }));
  const step = (s) => game.step(s, { draw: false });
  const st = () => game.state();
  function press(code, secs) {
    key(code, true);
    step(secs);
    key(code, false);
    step(1 / 60);
  }
  function touchEl(k) { return document.querySelector(`#touch [data-k="${k}"]`); }
  function tdown(k, id) { touchEl(k).dispatchEvent(new PointerEvent('pointerdown', { pointerId: id || 11, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true })); }
  function tup(k, id) { touchEl(k).dispatchEvent(new PointerEvent('pointerup', { pointerId: id || 11, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true })); }
  function tap(k, secs) { tdown(k); step(secs); tup(k); step(1 / 60); }
  const KEYS = { r: 'ArrowRight', l: 'ArrowLeft', u: 'ArrowUp', d: 'ArrowDown', duck: 'KeyZ', pillow: 'Space' };
  const act = (how, k, secs) => (how === 'keys' ? press(KEYS[k], secs) : tap(k, secs));
  function fresh(b, o) {
    game.start(Object.assign({ building: b, go: true, level: 'easy', players: 1, who: 'teddy' }, o || {}));
    game.quiet();
    return st();
  }
  // a spot on floor f with room both ways: no lift, no parcel door, no van close by
  function roomy(f) {
    const w = game.world(), L = w.L;
    for (const x of [-1.5, 1.5, -4.5, 4.5, -7.5, 7.5, 0]) {
      if (LV.shaftAt(L, f, x, 1.6)) continue;
      if (L.targets.some((t) => t.f === f && Math.abs(t.x - x) < 1.6)) continue;
      if (f === 0 && Math.abs(L.vanX - x) < 3) continue;
      return x;
    }
    return 0;
  }
  const shaftOn = (f) => game.world().L.shafts.find((s) => f >= s.lo && f <= s.hi && f > s.lo);

  function run(sab) {
    const results = [];
    const ok = (name, pass, info) => results.push({ name, ok: !!pass, info });
    const wasHold = game.G.hold;
    game.hold(true);
    const hadTouch = document.body.classList.contains('touch');
    game.sabotage(sab || null);
    try {
      // ---------- → right and ← left on screen, everywhere ----------
      const setups = [['teddy', 1], ['tommy', 1], ['teddy', 2]];
      for (let b = 0; b < LV.COUNT; b++) {
        for (const [who, players] of setups) {
          for (const how of ['keys', 'touch']) {
            document.body.classList.toggle('touch', how === 'touch');
            fresh(b, { who, players });
            for (const f of [NF, 6, 0]) {
              const x = roomy(f);
              game.put(f, x);
              step(0.1);
              let a = st().p;
              act(how, 'r', 0.45);
              let c = st().p;
              const right = c.sx - a.sx > 25 && c.x > a.x;
              game.put(f, x);
              step(0.1);
              a = st().p;
              act(how, 'l', 0.45);
              c = st().p;
              const left = c.sx - a.sx < -25 && c.x < a.x;
              ok(`walk hotel ${b + 1} floor ${f} ${who}${players === 2 ? ' 2P' : ''} ${how}`, right && left, `→ ${right ? 'right' : 'WRONG'}, ← ${left ? 'left' : 'WRONG'}`);
            }
          }
        }
      }

      // ---------- lifts: ↓ rides down the screen, ↑ up, ← → step out that way ----------
      for (let b = 0; b < LV.COUNT; b++) {
        for (const how of ['keys', 'touch']) {
          document.body.classList.toggle('touch', how === 'touch');
          fresh(b);
          const s = game.world().L.shafts.find((q) => q.hi - q.lo >= 3);
          const f = s.lo + 2;
          game.put(f, s.x);
          game.park(s.i, f);
          step(0.1);
          const a = st().p;
          act(how, 'd', 0.12);
          step(2.4);
          const c = st().p;
          act(how, 'u', 0.12);
          step(2.4);
          const e = st().p;
          const down = c.mode === 'car' && c.f === f - 1 && c.ry - a.ry > 40;
          const up = e.mode === 'car' && e.f === f && e.ry - c.ry < -40;
          ok(`ride hotel ${b + 1} ${how}`, down && up, `↓ floor ${a.f}→${c.f} (${c.ry - a.ry} px), ↑ →${e.f} (${e.ry - c.ry} px)`);
          // step out: → goes right on screen, and so does ← go left from a lift
          act(how, s.x > 0 ? 'l' : 'r', 0.4);
          const g = st().p;
          const outWay = s.x > 0 ? g.sx < e.sx - 20 : g.sx > e.sx + 20;
          ok(`step out hotel ${b + 1} ${how}`, g.mode === 'walk' && g.f === f && outWay, `${s.x > 0 ? '←' : '→'}: ${g.mode} on ${g.f}, ${e.sx}→${g.sx} px`);
        }
      }

      // ---------- ↓ never goes up (Alan: "when i reach down, and press down, it goes up") ----------
      // Every hotel, every lift, its lowest, middle and top floor, the car parked low, high or right there, with ArrowDown,
      // KeyS and the touch ▼, standing at the lift or walking into it with ↓ already held. While ↓ is held: the courier is
      // never drawn higher, never rises on the screen (the viewport, camera and all, 1 px allowed for rounding), and no
      // ride goes up. A car below may come up to fetch him, but only because he stands there: the same happens with no key.
      {
        const V = () => game.G.views[game.world().L.index];
        let cases = 0;
        const bad = { higher: [], screen: [], rideUp: [], keyFetch: [] };
        for (let b = 0; b < LV.COUNT; b++) {
          for (const s of LV.build(b).shafts) {
            for (const f of [...new Set([s.lo, Math.round((s.lo + s.hi) / 2), s.hi])]) {
              for (const start of [...new Set([s.lo, f, s.hi])]) {
                for (const how of ['ArrowDown', 'KeyS', 'touch']) {
                  for (const walkIn of [false, true]) {
                    const tag = `hotel ${b + 1} lift [${s.lo}-${s.hi}] floor ${f} car on ${start} ${how}${walkIn ? ' walking in' : ''}`;
                    const trace = (down) => {
                      fresh(b);
                      game.put(f, walkIn ? s.x - 2.2 : s.x);
                      game.park(s.i, start);
                      step(1 / 60);
                      const w = game.world();
                      let a = st().p, wy = a.drawnY, sy = a.sy;
                      const carY = [];
                      const hold = (v) => {
                        if (how === 'touch') { document.body.classList.add('touch'); if (down) (v ? tdown : tup)('d', 31); if (walkIn) (v ? tdown : tup)('r', 32); }
                        else { if (down) key(how, v); if (walkIn) key('ArrowRight', v); }
                      };
                      hold(true);
                      let walking = walkIn;
                      for (let i = 0; i < 60 * 6; i++) {
                        if (walking && (w.p.mode !== 'walk' || w.p.x >= s.x - 0.05)) { if (how === 'touch') tup('r', 32); else key('ArrowRight', false); walking = false; }
                        const evs = [];
                        step(1 / 60);
                        const p = st().p;
                        carY.push(V().cars[s.i].position.y);
                        if (down && !walking) {
                          if (p.drawnY > wy + 1e-6) bad.higher.push(`${tag}: drawn ${wy.toFixed(2)}→${p.drawnY.toFixed(2)} m (${p.mode})`);
                          if (p.sy < sy - 1) bad.screen.push(`${tag}: ${sy}→${p.sy} px on screen (${p.mode})`);
                          if (p.mode === 'car' && carY.length > 1 && carY[carY.length - 1] > carY[carY.length - 2] + 1e-6) bad.rideUp.push(`${tag}: rode up`);
                        }
                        wy = p.drawnY;
                        sy = p.sy;
                      }
                      if (how === 'touch') { if (down) tup('d', 31); document.body.classList.remove('touch'); } else if (down) key(how, false);
                      return carY;
                    };
                    const withDown = trace(true);
                    cases++;
                    if (start < f && how === 'ArrowDown' && !walkIn) {
                      // the fetch from below: identical with no key held, so ↓ isn't what sends the car up
                      const noKey = trace(false);
                      const upTo = withDown.findIndex((y, i) => i > 0 && y < withDown[i - 1] - 1e-6); // until it first starts down with him
                      const n = upTo < 0 ? withDown.length : upTo;
                      for (let i = 0; i < n; i++) if (Math.abs(withDown[i] - noKey[i]) > 1e-6) { bad.keyFetch.push(`${tag}: ↓ changed how the car came up`); break; }
                    }
                  }
                }
              }
            }
          }
        }
        const first = (a) => (a.length ? ` e.g. ${a[0]}` : '');
        ok('↓ never draws him higher', !bad.higher.length, `${cases} cases, ${bad.higher.length} ticks drawn higher${first(bad.higher)}`);
        ok('↓ never moves him up the screen', !bad.screen.length, `${cases} cases, ${bad.screen.length} ticks rising on screen${first(bad.screen)}`);
        ok('↓ never rides up', !bad.rideUp.length, `${bad.rideUp.length} up rides${first(bad.rideUp)}`);
        ok('↓ does not send a car up', !bad.keyFetch.length, `${bad.keyFetch.length} differences${first(bad.keyFetch)}`);
      }

      // ---------- duck and pillow, keys and touch ----------
      for (const how of ['keys', 'touch']) {
        document.body.classList.toggle('touch', how === 'touch');
        fresh(2, { level: 'normal' });
        game.put(5, 0);
        step(0.1);
        // a towel flies over a ducking courier
        if (how === 'keys') key('KeyZ', true); else tdown('duck');
        step(0.1);
        const d0 = st().p;
        game.world().towels.push({ x: 4, f: 5, vx: -5.2, t: 0, y: 1.05, dodged: false });
        step(1.4);
        const d1 = st().p, lives = st().players[0].lives;
        if (how === 'keys') key('KeyZ', false); else tup('duck');
        step(0.1);
        const d2 = st().p;
        act(how, 'r', 0.4);
        const d3 = st().p;
        ok(`duck ${how}`, d0.duck && d1.duck && lives === 3 && !d2.duck && d3.sx > d2.sx + 20, `ducked ${d0.duck}, towel over (lives ${lives}), stood up ${!d2.duck}, walks ${d3.sx - d2.sx} px`);
        // a pillow flies the way he faces, on screen
        for (const dir of ['r', 'l']) {
          game.put(5, 0);
          act(how, dir, 0.05);
          step(0.05);
          game.world().pillows = []; // follow this pillow, not one still flying from before
          act(how, 'pillow', 0.05);
          const q = game.world().pillows[0];
          const a = q ? game.toScreen(q.x, q.f * FH + q.y, 0.25)[0] : null;
          step(0.15);
          const b2 = q ? game.toScreen(q.x, q.f * FH + q.y, 0.25)[0] : null;
          ok(`pillow ${dir === 'r' ? '→' : '←'} ${how}`, q && (dir === 'r' ? b2 > a + 20 : b2 < a - 20), q ? `${Math.round(a)}→${Math.round(b2)} px` : 'no pillow');
        }
      }
      document.body.classList.toggle('touch', hadTouch);

      // ---------- nothing leaves him stuck ----------
      // let go of ↓ halfway between floors: the lift finishes the floor; → steps out
      for (let b = 0; b < LV.COUNT; b++) {
        fresh(b);
        const s = game.world().L.shafts[0];
        game.put(s.hi, s.x);
        game.park(s.i, s.hi);
        key('ArrowDown', true);
        step(0.75);
        key('ArrowDown', false);
        const mid = st();
        step(2.5);
        const a = st().p;
        press('ArrowRight', 0.4);
        const c = st().p;
        const car = st().cars[s.i];
        ok(`let go mid-ride hotel ${b + 1}`, mid.p.mode === 'car' && car.to < 0 && a.f === car.at && c.mode === 'walk' && c.sx > a.sx + 15, `${mid.p.mode} at y ${mid.p.y}, then floor ${a.f}, → ${c.mode} ${c.sx - a.sx} px`);
      }
      // ↓ at the bottom of a lift's run and ↑ at the top: nothing happens, then → still steps out
      {
        fresh(0);
        const s = game.world().L.shafts[0];
        game.put(s.hi, s.x);
        game.park(s.i, s.hi);
        press('ArrowUp', 0.6);
        const a = st().p;
        press('ArrowRight', 0.4);
        const c = st().p;
        ok('↑ at the top of a lift', a.f === s.hi && c.mode === 'walk' && c.sx > a.sx + 15, `${a.mode} on ${a.f}, → ${c.mode}`);
      }
      // a bump: dizzy, then the keys work again
      {
        fresh(1);
        game.put(7, 0);
        game.world().robots.push({ id: 900, f: 7, x: 0.3, home: 3, face: -1, st: 'walk', t: 0, throwCd: 9, thrower: false });
        step(0.1);
        const a = st().p;
        step(1.8);
        const m = st().p;
        press('ArrowRight', 0.4);
        const c = st().p;
        ok('after a bump', a.mode === 'dizzy' && m.mode === 'walk' && c.sx > m.sx + 20, `${a.mode} → ${m.mode}, → ${c.sx - m.sx} px`);
      }
      // a key held through pause, and Z held through pause
      {
        fresh(1);
        game.put(7, 0);
        key('ArrowRight', true);
        step(0.2);
        key('KeyP', true); key('KeyP', false);
        key('ArrowRight', false);
        step(0.2);
        key('KeyP', true); key('KeyP', false);
        step(0.1);
        const a = st().p;
        step(0.5);
        const c = st().p;
        key('KeyZ', true);
        step(0.1);
        key('Escape', true); key('Escape', false);
        key('KeyZ', false);
        key('Escape', true); key('Escape', false);
        step(0.2);
        const d = st().p;
        press('ArrowLeft', 0.4);
        const e = st().p;
        ok('keys held through pause', Math.abs(c.sx - a.sx) < 2 && !d.duck && e.sx < d.sx - 20, `after resume: drift ${c.sx - a.sx} px, duck ${d.duck}, ← ${e.sx - d.sx} px`);
      }
      // the brother's visit: walking and riding still work while he's here
      {
        fresh(1);
        game.put(7, 0);
        press('KeyT', 0.05);
        step(0.3);
        const a = st().p;
        press('ArrowRight', 0.4);
        const c = st().p;
        ok('during the brother', st().buddy && c.sx > a.sx + 20, `buddy ${st().buddy && st().buddy.kind}, → ${c.sx - a.sx} px`);
      }
      // 2 players: after the turn passes, the keys move the other brother
      {
        fresh(1, { players: 2 });
        game.put(7, 0);
        game.world().robots.push({ id: 901, f: 7, x: 0.3, home: 3, face: -1, st: 'walk', t: 0, throwCd: 9, thrower: false });
        step(2 + S.TURN_T + 1.2);
        const s1 = st();
        game.quiet();
        const a = s1.p;
        press('ArrowLeft', 0.4);
        const c = st().p;
        ok('2P turn passes', s1.cp === 1 && s1.who === 'tommy' && s1.phase === 'play' && c.sx < a.sx - 20, `cp ${s1.cp} ${s1.who} ${s1.phase}, ← ${c.sx - a.sx} px`);
      }
      // the keyboard kid: mashing keys in every hotel, then let go: he can always walk (or step out of a lift)
      for (let b = 0; b < LV.COUNT; b++) {
        fresh(b);
        let seed = 99 + b;
        const r = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        const codes = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyZ', 'Space'];
        const down = new Set();
        let bad = 0;
        for (let i = 0; i < 160; i++) {
          const c = codes[Math.floor(r() * codes.length)];
          if (down.has(c)) { key(c, false); down.delete(c); } else { key(c, true); down.add(c); }
          step(0.05 + r() * 0.25);
          const w = game.world();
          w.robots = [];
          w.towels = [];
        }
        for (const c of down) key(c, false);
        step(2.6);
        let a = st().p;
        if (a.mode === 'car') { press('ArrowRight', 0.3); press('ArrowLeft', 0.3); a = st().p; }
        const x0 = a.x;
        const dir = x0 > 0 ? 'ArrowLeft' : 'ArrowRight';
        press(dir, 0.5);
        const c = st().p;
        if (!(c.mode === 'walk' && Math.abs(c.x - x0) > 0.8)) bad++;
        ok(`keyboard kid hotel ${b + 1}`, !bad, `${a.mode} on floor ${a.f}, then ${dir === 'ArrowLeft' ? '←' : '→'} moved ${(c.x - x0).toFixed(2)} m`);
      }
    } finally {
      game.sabotage(null);
      document.body.classList.toggle('touch', hadTouch);
      for (const c of Object.keys(KEYS).map((k) => KEYS[k])) key(c, false);
      game.showTitle();
      game.hold(wasHold);
    }
    const failed = results.filter((r) => !r.ok);
    return { ok: !failed.length, total: results.length, failed: failed.map((r) => `${r.name}: ${r.info}`), results };
  }
  game.playCheck = run;
})();
