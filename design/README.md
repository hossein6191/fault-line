# Design hand-off

Fault Line is its own game. Nothing here should borrow from Magnitude Run: no
Rocky, no city, no shared art or sound.

## The idea

The screen is a seismogram. The player's swipe is a stroke of ink, the fault
line. Stained glass is tossed across the chart and shatters when the stroke
crosses it. Solid ink blocks with a padlock are shielded and must not be cut.

`ingame.png` is a frame of the current build.

## What can be redesigned

| thing | where | contract |
| --- | --- | --- |
| glass targets: Orb, Lens, Prism, Dart, Star | `src/targets.js` | each `draw(ctx)` paints centred on (0,0) inside the type's radius `r` (30 to 38 units); it is drawn once into a sprite, so gradients are fine |
| shielded block | `src/targets.js` `drawBlock` | must stay square, opaque and dark, with a padlock: it has to read as "do not cut" without relying on colour |
| power badges | `src/targets.js` `drawPower` | white hexagon, one icon per power (overclock, amp, stasis, quake) |
| the Core (finisher) | `src/targets.js` `drawBoss` | drawn live, about 74 units radius, takes crack lines on top |
| chart background | `src/paper.js` | static sheet from `drawPaper`, plus live pen traces |
| ink stroke and its five skins | `src/blade.js` `BLADE_SKINS` | `core` and `glow` as `r,g,b` strings |
| panels, wordmark, buttons | `styles.css`, `index.html` | class names are used by `src/ui.js`; keep them |
| share card | `src/card.js` | 1200×630 canvas |
| icon | `icon.svg`, then `npm run icons` | geometry is mirrored in `tools/make-icons.mjs` |

## Rules that should survive a redesign

- Glass is light and see-through, rounded or pointed. The block is the only
  solid, square, dark object. That difference carries the whole game.
- Targets need a dark outline: they sit on a pale, busy chart.
- Palette: Seismic Brand Kit v2. Mauve `#825A6D`, Purple `#523542`, plum
  `#3D2731`, ink `#161616`, paper `#F5F1F2`.
- Type: Instrument Sans, with IBM Plex Mono for chart annotations.
- Hit areas come from `r` in `TYPES`, not from the drawing. Keep art inside it.

## Checking a change

```bash
node serve.mjs 5174
npm test
```
