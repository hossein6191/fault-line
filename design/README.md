# Design files

| file | what it is |
| --- | --- |
| `halloween-wide.png` | poster, 1600×900, for X and banners |
| `halloween-square.png` | poster, 1080×1080 |
| `halloween.html` | redraws both posters from the game's own code (night sheet, treats, Jack-o'-Rocky) |

To redraw: run `node serve.mjs 5174`, open `/design/halloween.html`, and call
`window.__saveAll()` in the console. The files land in this folder.

## Rules the art keeps

- Treats are bright and rounded or pointed. The cursed potion is the one dark
  purple flask with a skull label: it has to read as "do not cut" without
  relying on colour alone.
- Hit areas come from `r` in `TYPES` (`src/targets.js`), not from the drawing.
  Keep art inside it.
- Rocky is drawn in code (`src/rocky.js`): his look changes there, and the
  game, the share card and the posters all follow.
- Type: Instrument Sans, with IBM Plex Mono for the chart labels.

Fault Line is a fan-made community build, not an official Seismic product.
