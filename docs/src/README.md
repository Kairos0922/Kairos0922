# Fig 1 — The Reactor That Won't Turn Cold

An interactive isometric teaching cutaway of a pressurised-water reactor's
first 60 seconds after SCRAM. The point the figure makes: **SCRAM quickly
suppresses the self-sustaining chain reaction, but the fission products already
made keep decaying** — about 6.6 % of full power at once, still 2.9 % (≈99 MW)
a minute later, on top of a few tenths of a percent of residual fission. The
pumps keep circulating and, on a stylised teaching curve, the loop stays near
≈292 °C through the window — the reactor won't turn cold: the decay heat must
keep being removed long after these 60 seconds. The figure shows the trend
inside its 60 s window only; it does not predict the plant's state beyond it.

**Teaching illustration — not a plant simulator, not an accident-analysis
program, not an operator aid.** The accessible “Model & assumptions” panel on
the page carries the full statement, formula, units, references and scope.

## Pages

- `../reactor-scram.html` (dark) and `../reactor-scram-light.html` (light),
  built by `node build.mjs` / `node build.mjs --light` into the `docs/` folder.
  Single self-contained files: they open from `file://` with no server, no
  external fonts, images or scripts.

## Interaction

- **Space / Enter / the SCRAM push button** — scram (press again at t > 0 to reset)
- **← →** — scrub time by 1 s (**Shift** 5 s), **Home/End** — 0/60 s, **Esc** — reset
- **Time slider** (bottom left) — scrub the 60 s window
- **Hover** any part — it highlights and the readout explains it; the fuel
  assemblies report live fission share, decay-heat share and note that the
  glow tracks the remaining heat (no fuel temperature is claimed)
- **“Model & assumptions”** (below the caption) — a keyboard-reachable `<details>`
- The idle tour plays one scram cycle if nobody interacts

## The model (`model.mjs`, pure functions of t in seconds)

| Quantity | Model |
|---|---|
| Decay heat | Way–Wigner teaching rule: P/P0 = 0.066 · t^−0.2 (held at 6.6 % below 1 s); ≈6.6 % at 1 s, ≈2.9 % (≈99 MW) at 60 s |
| Rod travel | 2.4 s free fall, distance ∝ t² |
| Residual fission | 0.934 · (1 − rod)⁴ while the rods fall, plus ≈0.006 · (1+t)^−0.2 after insertion — a phenomenological teaching placeholder, not computed from delayed-neutron kinetics (precursor concentrations, group decay constants and reactivity are not modelled) |
| Loop average | stylised: Tavg = 291.5 + 17 · e^−t/25 °C — teaching curve showing a trend inside the 60 s window; not a plant prediction, and not a simulation of the transition to hot standby |
| Core outlet | targets Tavg + 16.5 °C × P_total/P0 through a 4 s transport lag; assumes constant mass flow, constant cp, ΔT ∝ power; integrated from t = 0, so readings depend only on t (path-independent) |
| Fuel heat state | no temperature computed; the glow is a relative heat-intensity cue driven by the remaining heat power; rough sensible-heat estimate ≈100 t UO₂ × ~0.3 J/(g·K) × ~390 K ≈ 12 GJ ≈ 3.4 s of rated power (assumed mass/cp/ΔT; not a validated fuel-temperature model, and not a claim that all of it leaves within 60 s) |
| Sight glass | fixed schematic level — feedwater, boiling and level control are not modelled |
| Pressure | fixed nominal 155 bar (absolute), schematic — no pressurizer model |
| P0 | 3,400 MW thermal, a representative large four-loop PWR — teaching setting |

Sources / honesty: the decay-heat curve is the classic Way–Wigner teaching
power law, **not** an implementation of the ANSI/ANS-5.1-2014 (R2023) standard
(which sums many nuclide groups and reads slightly higher at short times);
citing the standard here implies no conformance or validation. Verified
bibliography (checked online via Crossref): K. Way & E. P. Wigner, “The Rate
of Decay of Fission Products”, Phys. Rev. 73, 1318–1330 (1948),
doi:10.1103/PhysRev.73.1318. ANSI/ANS-5.1-2014 (R2023), “Decay Heat Power in
Light Water Reactors” (American Nuclear Society): version and title per the
official ANSI webstore catalogue; the standard's full text was not purchased
or read here. The residual-fission term is a phenomenological teaching
placeholder, not derived from delayed-neutron kinetics. The 291.5 °C / 17 °C /
25 s loop figures, the 2.4 s rod fall, the 0.006 residual-fission coefficient,
the 4 s transport lag and the 155 bar nominal are stated teaching
simplifications, disclosed in the page's assumptions panel as well. **This
figure is an illustration of why decay heat matters; it does not predict any
real plant or its state beyond the 60 s window.**

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

All commands run from this `docs/src/` folder; the Anatomy skill's scripts live
outside the repo (paths below use `$SKILL` = the local skill checkout).

- `node build.mjs --audit` and `node build.mjs --light --audit` — **audit
  passed** (clearance 0, terminals 0, loose ends 0, folds 0, self-overlap 0,
  crowding 0, support 0, stand-ins 0; two visually-verified allowances: the
  guide tubes' tops end inside the head's silhouette — `shots/guide-head.png` —
  and the far-wall water tint is a translucent overlay)
- `$SKILL/scripts/lines.mjs ../reactor-scram.html` (and the `-light` page) —
  **line ends: 0**, console clean
- Model–figure consistency (drive.mjs probe at t = 0, 1, 2.4, 10, 30, 60):
  rod drop 0 / 10.4 / 60 px matches rodFrac; fission and decay bar heights
  match fissionFrac/decayFrac (18.68/16.50 → 0.05/7.28); power needle 100 % →
  3.2 %; outlet needle and readout 325 → 324 → 320 → 307 → 298 → 294 °C;
  sight-glass path byte-identical at every t; readout separates decay MW from
  total MW (99 vs 108 at t = 60) — `shots/check-t*.png`,
  `shots/check-light-t*.png`
- Determinism: t = 30 reached directly vs via 30 → 0 → 60 → 30 gives
  byte-identical readout, needles and bars (only the glow's ease-in-out spring
  is still converging, to the same target)
- Shader (a single WebGL layer inside the drawing): the glow and wall tint are
  computed analytically in the figure's own camera (ray–cylinder hits, no
  marching); masked exactly to the cutaway window; canvas edges read alpha 0 in
  every state (`ink-hook.js`); light-theme ink over the glow region falls
  monotonically 40 → 36 as the decaying power drops 6.0 % → 3.2 % (measured per
  frame over the decay regime, 100 × 70 px window region, 4 s settle per step;
  full-power ink is not comparable — the ramp saturates there);
  slow-motion sheet: `shots/scram-sheet.png`
- Reduced motion: one still, representative state; interactions still work
  (`shots/reduced.png`)
- No WebGL: the SVG alone reads (the model still runs; the fuel takes a live
  CSS tint from the same heat value) — `shots/fallback.png`
- 390 px: no sideways scroll; keyboard reachable; `aria-valuetext` describes
  the state in words — `shots/phone.png`
- Standalone: the built pages reference no external resources (the only
  outbound link is the DOI in the assumptions panel)
- “Model & assumptions” `<details>` open, both themes: `shots/check-notes.png`,
  `shots/check-light-notes.png`
- 4× junction close-ups, both themes: `shots/zoom-*.png`, `shots/light-*.png`

The `shots/` folder holds this evidence and can be regenerated at any time
with the Anatomy skill's `scripts/capture.mjs` / `scripts/drive.mjs` and the
hooks (`ink-hook.js`, `edge-hook.js`); it is not part of the deliverable.

## Files

| File | Role |
|---|---|
| `build.mjs` | geometry, static SVG, audit wiring, page assembly (writes the pages to `docs/`) |
| `model.mjs` | the physics (pure, sourced above) |
| `live.js` | the runtime: loop, interaction, shader, tour |
| `style.css` | page CSS: cavity tokens, water/ember tints, slider, assumptions panel |
| `ink-hook.js`, `edge-hook.js` | verification hooks for drive.mjs |
| `../../README.md` | project-level overview |
