/* TT Elevator Dash: the five toy hotels. Each is 12 floors tall: the roof (floor 12) at the top, hotel floors 11 to 1,
   and the garage (floor 0) at the bottom. Lifts run in three columns (x = -6, 0, 6); each lift serves a run of floors,
   one starts on the roof, one reaches the garage, and together they cover every floor, so every floor can be reached
   from every other. Two lifts in one column never share a floor. Doors sit at four places on every hotel floor; the
   parcels go to doors from the top down, in order. js/sim.js runs the rules. */
(function (root) {
  'use strict';
  const ED = (root.ED = root.ED || {});
  const NF = 12, FH = 3;
  const COLS = [-6, 0, 6];
  const DOORS = [-8.6, -3, 3, 8.6];
  // [x, lowest floor, highest floor] for each lift
  const SHAFTS = [
    [[-6, 8, 12], [6, 4, 8], [-6, 0, 4], [0, 6, 10]],
    [[0, 9, 12], [-6, 5, 9], [6, 0, 5], [6, 7, 11], [0, 2, 7]],
    [[6, 9, 12], [-6, 6, 9], [0, 3, 6], [6, 0, 3], [-6, 1, 4]],
    [[-6, 10, 12], [6, 7, 10], [-6, 4, 7], [6, 1, 4], [0, 0, 2], [0, 5, 9]],
    [[0, 10, 12], [-6, 8, 10], [6, 6, 8], [-6, 3, 6], [6, 0, 3], [0, 1, 7]],
  ];
  const START_X = [7, 7, -7, 7, -7]; // where the blimp drops you on the roof, away from the roof's lift
  const VAN_X = [8.2, -8.2, -8.2, 8.2, -8.2]; // the delivery van in the garage, away from the garage's lift
  const PARCELS = [5, 6, 7, 7, 8];
  const NAMES = ['HOTEL CUPCAKE', 'HOTEL BANANA', 'HOTEL PANDA', 'HOTEL ROCKET', 'HOTEL RAINBOW'];
  const EMOJI = ['🧁', '🍌', '🐼', '🚀', '🌈'];
  const GUESTS = ['🐰', '🐻', '🐨', '🦁', '🐷', '🐮', '🐵', '🐯', '🐧', '🦄', '🐹', '🐶'];
  // wallpaper, its pattern colour, the floor, the doors, door frames, lift frames, the outside walls, the lift cars
  const PAL = [
    { wall: '#ffd6e7', dot: '#ffb3cf', floor: '#c2185b', door: '#ff8fb8', frame: '#ffffff', lift: '#ff4d8d', outer: '#ff7aa8', car: '#ffe066' },
    { wall: '#fff3b0', dot: '#ffe066', floor: '#e09f00', door: '#ffd23f', frame: '#7a4f00', lift: '#ffb000', outer: '#ffd23f', car: '#7fdcff' },
    { wall: '#e6f7e9', dot: '#c3ebc9', floor: '#2e7d32', door: '#ffffff', frame: '#14121f', lift: '#4caf50', outer: '#8bd99a', car: '#ffb3d1' },
    { wall: '#dceaff', dot: '#bcd5ff', floor: '#2b4fd1', door: '#ff7043', frame: '#ffffff', lift: '#3d7bff', outer: '#8fb4ff', car: '#ffe066' },
    { wall: '#f1e4ff', dot: '#ddc4ff', floor: '#7b3fe4', door: '#4dd0e1', frame: '#ffffff', lift: '#b05cff', outer: '#c79bff', car: '#7dff9a' },
  ];

  // a fixed little random generator per building, so each hotel is the same every game (kids learn the way)
  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function build(b) {
    b = ((b % SHAFTS.length) + SHAFTS.length) % SHAFTS.length;
    const shafts = SHAFTS[b].map(([x, lo, hi], i) => ({ i, x, lo, hi }));
    const r = rng(b * 7919 + 17);
    // parcel floors: spread down the hotel, one per floor, top first
    const floors = [];
    const pool = [];
    for (let f = NF - 1; f >= 1; f--) pool.push(f);
    while (floors.length < PARCELS[b]) {
      const f = pool.splice(Math.floor(r() * pool.length), 1)[0];
      floors.push(f);
    }
    floors.sort((a, c) => c - a);
    let lastD = -1;
    const targets = floors.map((f, i) => {
      let d = Math.floor(r() * DOORS.length);
      if (d === lastD) d = (d + 1 + Math.floor(r() * 3)) % DOORS.length;
      lastD = d;
      return { i, f, d, x: DOORS[d], guest: GUESTS[(b * 5 + i) % GUESTS.length] };
    });
    return { index: b, id: 'b' + (b + 1), name: NAMES[b], emoji: EMOJI[b], pal: PAL[b], shafts, targets, startX: START_X[b], vanX: VAN_X[b] };
  }
  // the lift (if any) that stops on floor f at x
  function shaftAt(L, f, x, r) {
    for (const s of L.shafts) if (f >= s.lo && f <= s.hi && Math.abs(x - s.x) < (r || 0.6)) return s;
    return null;
  }
  ED.levels = { NF, FH, COLS, DOORS, COUNT: SHAFTS.length, NAMES, EMOJI, PAL, GUESTS, build, shaftAt };
})(typeof window !== 'undefined' ? window : globalThis);
