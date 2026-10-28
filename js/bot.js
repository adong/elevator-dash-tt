/* TT Elevator Dash: the autopilot. It plays the title screen's demo and the headless check's whole games, through the
   same inputs a kid gives (lr, ud, duck, pillow). It finds the fewest lift rides to the next parcel (or the van), walks
   to the lift, waits for it, rides it floor by floor, steps out the right way, pillows robots in front, turns to pillow
   one coming from behind, and ducks towels. */
(function (root) {
  'use strict';
  const ED = root.ED;
  const LV = ED.levels;

  // fewest rides from every floor to floor tf
  function rides(L, tf) {
    const d = new Array(LV.NF + 1).fill(99);
    d[tf] = 0;
    for (let k = 0; k < 12; k++) {
      for (const s of L.shafts) {
        let m = 99;
        for (let f = s.lo; f <= s.hi; f++) m = Math.min(m, d[f]);
        for (let f = s.lo; f <= s.hi; f++) if (d[f] > m + 1) d[f] = m + 1;
      }
    }
    return d;
  }
  // from floor f at x: which lift to take and which floor to ride it to (null when f is the goal floor)
  function plan(L, d, f, x) {
    let best = null;
    for (const s of L.shafts) {
      if (f < s.lo || f > s.hi) continue;
      for (let g = s.lo; g <= s.hi; g++) {
        if (g === f || d[g] >= d[f]) continue;
        const cost = d[g] * 100 + Math.abs(s.x - x) + Math.abs(g - f) * 0.5;
        if (!best || cost < best.cost) best = { s, g, cost };
      }
    }
    return best;
  }
  function goal(w) {
    const pl = w.players[w.cp], L = w.L;
    const tg = L.targets[pl.done];
    return tg ? { f: tg.f, x: tg.x } : { f: 0, x: L.vanX };
  }

  function decide(w) {
    const p = w.p, L = w.L;
    const inp = { lr: 0, ud: 0, duck: false, pillow: false };
    if (w.phase !== 'play') return inp;
    const G = goal(w);
    const d = rides(L, G.f);
    if (p.mode === 'car') {
      const c = w.cars[p.car];
      if (c.to >= 0 || c.at < 0) return inp;
      // the best floor this lift can reach
      let g = c.at;
      for (let f = c.lo; f <= c.hi; f++) if (d[f] < d[g] || (d[f] === d[g] && Math.abs(f - c.at) < Math.abs(g - c.at))) g = f;
      if (g !== c.at) { inp.ud = Math.sign(g - c.at); return inp; }
      const nxt = c.at === G.f ? G.x : (plan(L, d, c.at, c.x) || { s: { x: G.x } }).s.x;
      inp.lr = nxt >= c.x ? 1 : -1;
      if (Math.abs(nxt - c.x) < 0.01) inp.lr = c.x > 0 ? -1 : 1;
      return inp;
    }
    if (p.mode !== 'walk') return inp;
    // towels coming: duck
    for (const o of w.towels) {
      if (o.f !== p.f) continue;
      const ahead = (o.x - p.x) * Math.sign(o.vx) < 0;
      if (ahead && Math.abs(o.x - p.x) < 2.6) { inp.duck = true; return inp; }
    }
    // robots: pillow the nearest one
    let near = null;
    for (const r of w.robots) {
      if (r.f !== p.f || !(r.st === 'walk' || r.st === 'throw' || r.st === 'out')) continue;
      if (!near || Math.abs(r.x - p.x) < Math.abs(near.x - p.x)) near = r;
    }
    let tx;
    if (p.f === G.f) tx = G.x;
    else {
      const pn = plan(L, d, p.f, p.x);
      tx = pn ? pn.s.x : G.x;
      if (pn && Math.abs(pn.s.x - p.x) < 0.25) {
        const c = w.cars[pn.s.i];
        if (c.at === p.f && c.to < 0 && c.door > 0.5) inp.ud = Math.sign(pn.g - p.f);
        else if (near && Math.abs(near.x - p.x) < 6) { inp.lr = 0; p.face !== Math.sign(near.x - p.x) ? (inp.lr = Math.sign(near.x - p.x)) : (inp.pillow = true); }
        return inp;
      }
    }
    if (near) {
      const dx = near.x - p.x, dist = Math.abs(dx);
      const facing = Math.sign(dx) === p.face;
      if (dist < 7 && facing) inp.pillow = true;
      else if (dist < 3.2 && !facing) { inp.lr = Math.sign(dx); inp.pillow = true; return inp; }
      if (dist < 1.6) return inp; // let the pillow fly first
    }
    const dx = tx - p.x;
    if (Math.abs(dx) > 0.12) inp.lr = Math.sign(dx);
    return inp;
  }

  ED.bot = { decide, rides, plan, goal };
})(typeof window !== 'undefined' ? window : globalThis);
