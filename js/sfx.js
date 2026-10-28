/* TT Elevator Dash: sound effects, all synth through Kit.sound (so the page's one mute switch covers them).
   ED.sfx.log counts every effect played, so tests can check sound in code while muted. */
(function () {
  'use strict';
  const S = Kit.sound;
  const log = {};
  const note = (name, fn) => (...a) => { log[name] = (log[name] || 0) + 1; fn(...a); };
  ED.sfx = {
    log,
    step: note('step', () => S.tone({ type: 'triangle', f: 300, to: 240, dur: 0.04, vol: 0.04 })),
    ding: note('ding', () => { S.tone({ type: 'sine', f: 1319, dur: 0.5, vol: 0.12 }); S.tone({ type: 'sine', f: 1047, dur: 0.6, vol: 0.1, at: 0.16 }); }),
    doors: note('doors', () => S.hiss({ filter: 'bandpass', f: 900, to: 500, dur: 0.25, vol: 0.06, q: 2 })),
    hum: note('hum', (up) => S.tone({ type: 'triangle', f: up ? 220 : 260, to: up ? 260 : 220, dur: 0.5, vol: 0.05, lp: 900 })),
    call: note('call', () => S.tone({ type: 'square', f: 880, dur: 0.06, vol: 0.05 })),
    pillow: note('pillow', () => S.swish()),
    puff: note('puff', () => { S.hiss({ f: 1500, to: 4000, dur: 0.3, vol: 0.12 }); S.tone({ type: 'triangle', f: 700, to: 1500, dur: 0.18, vol: 0.08 }); }),
    feathers: note('feathers', () => S.hiss({ filter: 'highpass', f: 3000, to: 6000, dur: 0.25, vol: 0.05 })),
    dizzy: note('dizzy', () => { for (let i = 0; i < 3; i++) S.tone({ type: 'sine', f: 900 + i * 200, to: 700 + i * 200, dur: 0.15, vol: 0.06, at: i * 0.1 }); }),
    float: note('float', () => S.tone({ type: 'sine', f: 500, to: 1200, dur: 0.6, vol: 0.06 })),
    robot: note('robot', () => { S.tone({ type: 'square', f: 600, to: 800, dur: 0.08, vol: 0.05 }); S.tone({ type: 'square', f: 800, to: 600, dur: 0.08, vol: 0.05, at: 0.09 }); }),
    towel: note('towel', () => S.swish()),
    dodge: note('dodge', () => S.tone({ type: 'triangle', f: 500, to: 900, dur: 0.12, vol: 0.08 })),
    bump: note('bump', () => { S.bump(); S.tone({ f: 600, to: 180, dur: 0.35, vol: 0.14, type: 'triangle' }); for (let i = 0; i < 4; i++) S.tone({ f: 900 - i * 120, to: 1000 - i * 120, dur: 0.12, vol: 0.05, at: 0.35 + i * 0.13, type: 'sine' }); }),
    deliver: note('deliver', () => { S.tone({ type: 'triangle', f: 784, dur: 0.12, vol: 0.12 }); S.tone({ type: 'triangle', f: 1047, dur: 0.12, vol: 0.12, at: 0.1 }); S.tone({ type: 'triangle', f: 1319, dur: 0.22, vol: 0.12, at: 0.2 }); }),
    knock: note('knock', () => { S.tone({ type: 'square', f: 180, to: 120, dur: 0.05, vol: 0.08, lp: 600 }); S.tone({ type: 'square', f: 180, to: 120, dur: 0.05, vol: 0.08, lp: 600, at: 0.12 }); }),
    nope: note('nope', () => S.tone({ type: 'triangle', f: 300, to: 220, dur: 0.18, vol: 0.08 })),
    allDone: note('allDone', () => [659, 784, 988, 1319].forEach((f, i) => S.tone({ type: 'triangle', f, dur: 0.18, vol: 0.11, at: i * 0.1 }))),
    honk: note('honk', () => S.horn(0.12)),
    clear: note('clear', () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => S.tone({ type: 'triangle', f, dur: 0.26, vol: 0.13, at: i * 0.14 }))),
    buddy: note('buddy', () => { S.tone({ f: 400, to: 900, dur: 0.15, vol: 0.12 }); S.hiss({ f: 2000, to: 500, dur: 0.25, vol: 0.08 }); }),
    treat: note('treat', () => S.coin(4)),
    zoom: note('zoom', () => S.tone({ type: 'sawtooth', f: 300, to: 1200, dur: 0.5, vol: 0.06, lp: 2000 })),
    hi5: note('hi5', () => { S.hiss({ filter: 'bandpass', f: 1800, dur: 0.08, vol: 0.25, q: 1 }); S.tone({ f: 880, to: 1320, dur: 0.15, vol: 0.08, at: 0.05 }); }),
    life: note('life', () => [784, 988, 1175, 1568].forEach((f, i) => S.tone({ type: 'square', f, dur: 0.1, vol: 0.06, at: i * 0.09 }))),
    go: note('go', () => { S.tone({ type: 'square', f: 660, dur: 0.1, vol: 0.07 }); S.tone({ type: 'square', f: 990, dur: 0.18, vol: 0.07, at: 0.12 }); }),
    turn: note('turn', () => S.horn(0.1)),
    gameOver: note('gameOver', () => [523, 440, 392, 523].forEach((f, i) => S.tone({ type: 'triangle', f, dur: 0.25, vol: 0.12, at: i * 0.2 }))),
    won: note('won', () => [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => S.tone({ type: 'triangle', f, dur: 0.3, vol: 0.13, at: i * 0.13 }))),
    click: note('click', () => S.click()),
  };
})();
