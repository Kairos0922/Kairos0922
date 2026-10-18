# The Learning Loop

An interactive explainer for Kairos's learning goal: make difficult ideas easier to enter by teaching people how to explore, frame problems, test explanations and carry the method into new situations. The point is not to remember the paper-plane answer; the paper-plane situation is only a practice case.

The six selectable phases are **Notice → Frame → Model → Test → Revise → Transfer**. Arrow keys and the stage buttons move a physical carriage across the workbench. The copy never supplies invented experiment results: it invites the reader to make a test and revise their own explanation from evidence.

## Build

From the repository root, run:

```sh
node docs/src/learning-loop/build.mjs
node docs/src/learning-loop/build.mjs --light
```

The generated, dependency-free GitHub Pages files are `docs/learning-loop.html` (dark) and `docs/learning-loop-light.html` (light). The geometry, copy and interaction live in `build.mjs`. The six-step browser test sequence is kept in `preview-actions.json` and was run with Anatomy’s upstream `scripts/drive.mjs`.

## Craft credit

The illustration is built with the [Anatomy Agent Skill](https://github.com/wheresryan22/anatomy) and its `kit/iso-kit.mjs`. Anatomy's kit is MIT-licensed; its original copyright and permission notice are preserved in [`vendor/LICENSE`](vendor/LICENSE). The learning-loop concept, six-stage teaching copy, geometry composition, interaction and page are original to this repository. The Anatomy Skill itself is a separate upstream project, not a Kairos-authored tool.
