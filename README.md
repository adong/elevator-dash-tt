# TT Elevator Dash

[![TT Elevator Dash title screen](docs/screenshot.jpg)](https://adong.github.io/elevator-dash-tt/)

Press **?** any time (or tap the round **?** button on the left edge) to see the keys. The game waits while you look.
Tap the language button under it (the A文 icon) to switch between English and 中文; the dashboard and every game remember the choice.

A side-view delivery game in a toy hotel, starring Teddy and Tommy. A delivery blimp lowers you onto the roof with a back full of parcels. Work your way down the hotel, riding the lifts and walking the corridors, and take each parcel to the door with the glowing light. Silly bellhop robots roll out of the doors to bump into you; a soft pillow makes them dizzy and they float away in a bubble. With every parcel delivered, ride down to the delivery van in the garage. Five hotels, 12 floors each.

**中文：** 电梯快递：从楼顶出发，坐电梯一层一层往下走，把包裹按顺序送到亮灯的门口。门童机器人会滚出来撞你，扔个软枕头就能把它砸晕，它会坐着泡泡飘走。包裹全送完，就下到车库跳上快递车！一共 5 家酒店，每家 12 层楼。

A 3D game for the boys, built with Claude Code from plain JavaScript and Three.js on the shared Claude Games kit. The couriers are the kit's blocky Teddy and Tommy; the bellhop robots, the hotels, the van and the blimp are made here. There are no image, model or audio files: every texture is painted on a canvas and every sound is synthesised. The name, the characters, the hotels and the sounds are our own. Nobody gets hurt: a bump makes you dizzy, and the robots say sorry and float away.

## Play

- **Double-click `index.html`.** It works offline because Three.js and the kit are copied into `kit/`. Without internet the title font falls back to Arial Black.
- **Send one file:** `dist/elevator-dash-tt.html` is the whole game in one page, about 850 KB. AirDrop or email it, then open it in a browser.
- Rebuild that file after any edit: `python3 kit/tools/bundle.py . --name elevator-dash-tt`

On the title screen pick **1 PLAYER** (then the courier: Teddy or Tommy) or **2 PLAYERS** (Teddy and Tommy take turns), the level, and press **▶ DELIVER!** Behind the menu the autopilot plays a demo.

**Levels:**

- **🐣 EASY** (the default, for Tommy, 5): slower robots (0.95 m/s, a little faster in each hotel), fewer of them, they pop out at least 5.5 m away from you, they never throw anything, and 5 lives.
- **🔥 NORMAL** (for Teddy, 8): faster robots (1.55 m/s and up), more of them, they pop out at least 4.5 m away, half of them toss rolled-up towels at head height (duck!), and 3 lives.

An extra life comes every 20,000 points.

## The hotel

- **Floors:** the roof (12) at the top, hotel floors 11 to 1, and the garage at the bottom. Every floor has its number on both walls, and the HUD shows the hotel and the floor.
- **The camera** looks at the hotel from the side, its eye level with the courier's feet, and moves with him floor for floor without lagging. Riding down, the hotel slides up past him and he never drifts back up the screen when the lift stops.
- **Lifts:** they sit in the back wall behind glass doors, so the corridor floor is solid all the way across and **you can never fall down a shaft**. Each lift serves a run of floors; to get all the way down you change lifts on the way. **Walk up to a lift and it comes to you**, so it's usually waiting when you get there. When its doors open, press ↑ or ↓ and you step in and ride one floor; ↓ only ever takes you down. On a lift's lowest floor ↓ does nothing but a bubble ("THIS LIFT ONLY GOES UP!", and a ⬆️ over your head), and ↑ on its top floor likewise. Hold the key and it keeps going, **stopping at every floor** (ding!). Let go any time: it always finishes the floor it started, so **it never stops between floors**. ← or → steps out.
- **Parcels:** the doors waiting for a parcel have a number on them (1, 2, 3 ...) and a lamp; the next one glows. Deliver them **in order**, top floor first: a later door says "PARCEL 2 FIRST!". The door opens, a guest (a bunny, a bear, a koala ...) bounces out and says THANK YOU (+500), and a 💖 goes on the door. The HUD's 📦 box says how many are done and where the next one is (NEXT: FLOOR 7 ⬇).
- **The garage:** with every parcel delivered, ride down and walk to the van. The courier does his signature move with confetti, hops in, and the van drives off: **HOTEL DONE!** and a time bonus. The next hotel starts on the roof. Before that, the van just honks "2 PARCELS LEFT!".
- **Robots:** bellhop robots in red jackets roll out of the doors on your floor (never close to you, and never while you're in a lift) and roll toward you. **Toss a pillow** (Space) the way you face: BOING! The robot gets dizzy (+100) and floats away in a bubble. Ride away and they roll back into their doors. On NORMAL some stop and toss a towel at head height: **duck** (Z) and it flies over (WHOOSH! +50).
- **A bump** (a robot or a towel) costs a life: you're dizzy for a moment, every robot on the floor says SORRY! and floats away, and you blink safely for 2½ seconds.
- **The five hotels:** Hotel Cupcake 🧁, Hotel Banana 🍌, Hotel Panda 🐼, Hotel Rocket 🚀 and Hotel Rainbow 🌈, each with its own colours, lifts and 5 to 8 parcels. They're the same every game, so the boys can learn the way.

**HI-SCORE:** the HUD shows the best score for the level. The **TOP COURIERS** board keeps the best five for each level, with 🦊 Foxy and 🐸 Froggy's scores to beat (they cheer on the pavement by the garage in 1 player).

## Controls

| | Keys | Touch |
|---|---|---|
| walk | ← → or A D | ◀ ▶ |
| ride a lift (stand in it) | ↑ ↓ or W S | ▲ ▼ |
| toss a pillow | Space | ☁️ PILLOW |
| duck (hold) | Z | 🙇 DUCK (hold) |
| call your brother (2 players: high five) | T | tap his face |
| pause · sound | P or Esc · M | ❚❚ · 🔊 |

- You can't walk while you duck; let go and you stand up.
- **Touch:** the arrows and buttons show up on phones and tablets, clear of the kit's buttons on the left edge and of the hotel.
- **Menus:** on the title screen 1 and 2 pick the players, E and N the level, C (or ← →) swaps the courier, Enter or Space starts. Paused: P, Esc or Space go on, Q goes to the menu. Results: Enter plays again, Esc goes to the menu.

## Call your brother (companion mode)

Call the other brother (`Kit.roster.buddyFor`: Tommy for Teddy, Teddy for Tommy) with **T**, by tapping his face button, or by clicking his face under your score, **as often as you like**: there's no waiting once he's gone.

- **He pops in on a little cloud** next to you at his roster `buddyScale`.
- **He does his signature move:** Tommy's Y with peace fingers ✌️; Teddy's boxing, or (on the next call) his jump shot with a 🏀.
- **He tosses you a treat** (🍦 💧 🧃 🍪 🍉 🍌, a different one each call): +100.
- **Then the game's helper:** "TOMMY SAYS: I'LL TAKE PARCEL 3!" He flies off with the next parcel to its door (even on another floor) and delivers it for you, in order (+500). With everything delivered he says "GO TO THE GARAGE!" instead. While he's there the robots stand still and nothing can bump you.
- **2 players:** both brothers are playing (taking turns), so T is a **HIGH FIVE! ✋** from the one who's waiting (+50 and confetti).

## 2 players

Teddy and Tommy take turns, arcade style: a bump passes the turn ("TOMMY'S TURN!"). Each keeps his own hotel, parcels, floor, lives and score, and comes back where he was. A brother who runs out of lives is skipped; when both are out, the game ends. The one waiting cheers on the pavement.

## The end

When the lives run out, or after the fifth hotel (**ALL 5 HOTELS! SUPER COURIER!**), the winner (in 2 players, the higher score) does his signature move in front of the garage with confetti, and the results show the score, the **TOP COURIERS** board (**⭐ NEW HI-SCORE!** or **⭐ ON THE BOARD!**) and **↻ PLAY AGAIN**.

## How it works, and how it's tested

- `js/levels.js`: the five hotels as plain data (lifts, the parcel doors, where the blimp drops you and where the van waits). `js/sim.js`: the rules, in fixed 1/60 s steps: walking, the lifts, parcels, robots, pillows, towels, lives, turns and the brother's visit. `js/bot.js`: the autopilot (fewest lift rides to the next parcel, pillows robots, ducks towels). None of them uses Three.js, so node runs them.
- `js/art.js` builds the hotels, the robots, the van and the blimp, `js/sfx.js` the sounds (all through `Kit.sound`, so the mute switch covers them; counted in `ED.sfx.log`), `js/game.js` the camera, screens, keys, touch, HUD, celebrations and the test hooks. `js/friends.js` adds 🦊 Foxy and 🐸 Froggy to the roster (copied from TT Barrel Climb). The name lives in `js/title.js`.
- **The headless check:** `node tools/check.js` (or `game.check()` in the page), 13 checks in about 1.5 seconds:
  - *liftsCarry* (the brief): in all 5 hotels one tap of ↓ rides exactly one floor and stops on it; holding ↓ stops at every floor on the way (and really stands still there); ↑ rides up; ← → step out walking.
  - *downNeverUp* (Alan's bug report): at every stop of every lift, ↓ never moves you up and ↑ never down; on a lift's end floor the key leaves you walking with the bubble.
  - *liftComes:* every lift comes to every floor it serves when you stand at it, doors open.
  - *neverFall* (the brief): 226 walks across lift doors with the car away leave you on your floor; a kid mashing keys in all 5 hotels on both levels is never off a floor except in a lift car, and never outside the walls.
  - *neverStuck* (the brief): 260 rides let go at all sorts of moments (mid-floor, during a stop) always finish on a floor, and → steps out; ↑ at the top of a lift does nothing and → still steps out.
  - *parcelsInOrder* (the brief): parcels go top floor first; a later door says "not yet"; the autopilot and key mashing deliver 1, 2, 3 ... with nothing skipped, in all 5 hotels.
  - *buildingEnds* (the brief): the van waits while parcels are left, then ends the hotel; the next hotel starts on the roof; after the fifth the game is won. The autopilot wins all 5 hotels on EASY and NORMAL, 1 and 2 players.
  - *spawnSafe* (the brief): about 200 robots popped out across both levels and all hotels, with the autopilot and with key mashing: never closer than 5.5 m (EASY) or 4.5 m (NORMAL), never while you ride.
  - plus pillows and bumps, ducking towels (and none on EASY), EASY vs NORMAL, the brother delivering every parcel in order on repeated calls, and 2-player turns.
  - **It can fail:** `node tools/check.js --fail` (or `game.checkFail()`) switches on seven sabotages one at a time (↓ on a lift's lowest floor still steps you in, held ↓ skips the stops, an empty shaft is a hole, letting go stops the car between floors, any parcel door takes a parcel, the van ends the hotel early, robots pop out of the nearest door) and every one is caught.
- **The play check with real keys:** `game.playCheck()` (run by `node tools/shoot.js tools/keys.json`), 135 checks with real `keydown`/`keyup` events on `window` and pointer events on the touch buttons, reading where the courier is drawn on screen (up and down against a fixed point, since the camera glides):
  - → moves right and ← moves left on screen in all 5 hotels, on the roof, a hotel floor and in the garage, for Teddy, Tommy and 2 players, with keys and with touch (90 checks);
  - ↓ in a lift rides down the screen and ↑ up, in every hotel, keys and touch; ← → step out the way they point;
  - Z and 🙇 duck under a towel and stand up again; Space and ☁️ toss a pillow the way he faces;
  - **↓ never goes up** (Alan: "when i reach down, and press down, it goes up"): every lift in every hotel, its lowest, middle and top floor, the car parked low, high or right there, with ArrowDown, KeyS and the touch ▼, standing at the lift or walking into it with ↓ held (1,092 cases). While ↓ is held he is never drawn higher, never rises on the screen (camera and all), and never rides up. A car below may come up to fetch him, but only because he walked up to it: the same happens with no key held. This check failed on the old code (he hopped up into a car on its lowest floor, and floated up the screen as the camera caught up after each stop).
  - nothing leaves him stuck: letting go mid-ride, ↑ at the top of a lift, a bump, keys held through pause, the brother's visit, the turn passing in 2 players, and a "keyboard kid" mashing keys in every hotel.
  - `game.playCheck('mirror')`, `('flipUD')`, `('stuckCar')` and `('stuckDuck')` prove it catches wrong controls.
- **中文:** `node tools/shoot.js tools/zh.json` visits every screen and moment (title, ? panel, roof, the brother, pops, pause, all delivered, the van waiting, hotel done, the next hotel, towels and bumps, 2-player turn and high five, both results screens): `Kit.lang.untranslated()` is `[]` on each. In English the page has no Chinese except the kit's own 中文 switch label.
- **Layout:** `tools/layout.json` with touch at 390×844, 740×360, 844×390, 1024×768 and 820×1180: no overlaps between the kit's buttons, the HUD, the touch buttons and the hotel.
- `docs/screenshot.jpg`: `node tools/shoot.js tools/shots.json docs 1200 750` (headless Chrome).

## Not verified

- Sound by ear: everything was tested muted; sounds were checked in code (`ED.sfx.log`).
- Real phones and iPads, and iOS Safari: touch was tested with emulated touch and pointer events in desktop Chrome.
- Frame rate on an older iPad.
- How hard it really is for a 5- and an 8-year-old: tuned with the autopilot, which almost never gets bumped.
- Double-clicking `index.html` in Finder, and the home-screen icon on an iPad.
