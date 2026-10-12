# Fig 1 — The Reactor That Won't Turn Cold

A nuclear reactor's first 60 seconds after SCRAM, as an interactive isometric
teaching cutaway. The point the figure makes: **SCRAM stops fission, but the
fission products already made keep decaying** — about 6.6 % of full power at
once, still 2.9 % a minute later (~100 MW). The pumps keep circulating and the
steam generator keeps boiling, which is why the plant "won't turn cold".

Open `reactor-scram.html` (dark) or `reactor-scram-light.html` (light).

## Interaction

- **Space / Enter / the SCRAM push button** — scram (press again at t > 0 to reset)
- **← →** — scrub time by 1 s (**Shift** 5 s), **Home/End** — 0/60 s, **Esc** — reset
- **Time slider** (bottom left) — scrub the 60 s window
- **Hover** any part — it highlights and the readout explains it
- The idle tour plays one scram cycle if nobody interacts

## The model (`model.mjs`, pure functions of t in seconds)

| Quantity | Model |
|---|---|
| Decay heat | Way–Wigner: P/P0 = 0.066 · t^−0.2 (held at 6.6 % below 1 s) |
| Rod travel | 2.4 s free fall, distance ∝ t² |
| Fission power | 0.934 · (1 − rod)⁴ while the rods fall, plus a delayed-neutron tail ≈ 0.6 % · (1+t)^−0.2 after insertion |
| Core outlet | 292 °C + 33 °C · P/P0 through a 4 s first-order lag (integrated, so scrubbing is deterministic) |
| Pressure | 155 bar, small −1.5 bar dip (pressurizer), cosmetic |
| P0 | 3,400 MW thermal (a typical large four-loop PWR) |

Sources / honesty: the decay-heat curve is the standard Way–Wigner teaching
correlation (handbook figures: ~6.5 % at 1 s, ~3.3 % at 1 min, ~1.3 % at 1 h for
a power reactor; this model reads 6.6 % and 2.9 %). Rod travel, the delayed
tail, the outlet-temperature lag and the pressure dip are stated teaching
simplifications. **This is an illustration of why decay heat matters, not an
accident-analysis tool, and it does not predict any real plant.**

## What is drawn

Steel pressure vessel (cutaway window into the core), 9 fuel assemblies,
3 control rods on drive housings, support skirt, flange and stud closure,
hot leg to the steam generator (with the ball tee for the surge line),
reactor coolant pump with motor and power cable, crossover leg, cold leg,
steam generator with channel head, girth ring, sight glass and steam line with
stop valve, pressurizer with spray and relief stub, source-range neutron
detector with its cable, and an instrument panel: thermal-power dial,
core-outlet dial, fission/decay bar meters and the guarded SCRAM push button.
231 audited solids; the primary loop's pipes are one continuous route each.

## Verification

- `node build.mjs --audit` — **audit passed** (clearance 0, terminals 0,
  loose ends 0, folds 0, self-overlap 0, crowding 0, support 0, stand-ins 0;
  two visually-verified allowances: the guide tubes' tops end inside the
  head's silhouette — `shots/guide-head.png` — and the far-wall water tint is
  a translucent overlay)
- `scripts/lines.mjs` — **line ends: 0** on both themes
- Shader (a single WebGL layer inside the drawing): the decay-heat glow and the
  wall tint are computed analytically in the figure's own camera (ray–cylinder
  hits, no marching); masked exactly to the cutaway window; canvas edges read
  alpha 0 in every state (`ink-hook.js`); light-theme ink over the glow region
  falls monotonically 44 → 41 as decay heat drops 6.6 % → 2.9 % (measured per
  frame); slow-motion sheet across the scram: `shots/scram-sheet.png`
- Reduced motion: one still, representative state; interactions still work
  (`shots/reduced.png`)
- No WebGL: the SVG alone reads (the model still runs; the fuel takes a live
  CSS tint from the same heat value) — `shots/fallback.png`
- 390 px: no sideways scroll; keyboard reachable; `aria-valuetext` describes
  the state in words — `shots/phone.png`
- 4× junction close-ups, both themes: `shots/zoom-*.png`, `shots/light-*.png`

The `shots/` folder holds this evidence and can be regenerated at any time
with `scripts/capture.mjs` / `scripts/drive.mjs` and the hooks
(`ink-hook.js`, `edge-hook.js`); it is not part of the deliverable.

## Files

| File | Role |
|---|---|
| `build.mjs` | geometry, static SVG, audit wiring, page assembly |
| `model.mjs` | the physics (pure, sourced above) |
| `live.js` | the runtime: loop, interaction, shader, tour |
| `style.css` | page CSS: cavity tokens, water/ember tints, slider |
| `ink-hook.js`, `edge-hook.js` | verification hooks for drive.mjs |
| `reactor-scram.html`, `reactor-scram-light.html` | the deliverables |
