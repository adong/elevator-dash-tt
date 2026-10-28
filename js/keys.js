/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button.
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: ED.TITLE, // the name lives in js/title.js
  keys: [
    ['walk', '← → or A D'],
    ['ride a lift: stand in it, then up or down', '↑ ↓ or W S'],
    ['toss a pillow', 'Space'],
    ['duck under towels', 'Z'],
    ['call your brother: he delivers the next parcel (2 players: high five)', 'T'],
    ['pause · sound', 'P or Esc · M'],
    ['title: 1 or 2 players · easy · normal · courier', '1 2 · E · N · C'],
  ],
  note: 'Start on the roof and work your way down. Take each parcel to the door with the glowing light, in order (1, 2, 3...). Stand at a lift and it comes to you; it stops at every floor. A pillow makes a bellhop robot dizzy. When every parcel is delivered, ride down to the van in the garage!',
  touch: '◀ ▶ walk, ▲ ▼ ride the lifts, ☁️ tosses a pillow, 🙇 ducks, and your brother\'s face calls him.',
});
