# The Learning Loop

An interactive explainer for Kairos's goal: make complex knowledge easier to learn. A clearly drawn paper airplane follows a visible path from a steady glide into a nose-down dive; the replay button lets the reader watch the full flight. The plane is a practice case for learning how to ask questions, look for evidence, test explanations and use a method in new situations—not an answer to memorize.

The six selectable phases are **Notice → Frame → Model → Test → Revise → Transfer**. Arrow keys and stage buttons move a physical carriage across the workbench. The flight animation shows the observed glide and dive; it does not claim why the plane dives. The copy asks the reader to design a fair test and revise an explanation from evidence, without inventing experimental results. `preview-actions.json` replays the flight, captures eight animation frames and checks the final learning phase.

## Build

From the repository root, run:

```sh
node docs/src/learning-loop/build.mjs
node docs/src/learning-loop/build.mjs --light
```

The generated, dependency-free GitHub Pages files are `docs/learning-loop.html` (dark) and `docs/learning-loop-light.html` (light). The geometry, copy, flight path and replay interaction live in `build.mjs`. The browser test sequence is kept in `preview-actions.json` and was run with Anatomy’s upstream `scripts/drive.mjs`.

## Craft credit

The illustration is built with the [Anatomy Agent Skill](https://github.com/wheresryan22/anatomy) and its `kit/iso-kit.mjs`. Anatomy's kit is MIT-licensed; its original copyright and permission notice are preserved in [`vendor/LICENSE`](vendor/LICENSE). The learning-loop concept, six-stage teaching copy, geometry composition, interaction and page are original to this repository. The Anatomy Skill itself is a separate upstream project, not a Kairos-authored tool.
