# The Learning Loop

A six-scene interactive explainer for a method of learning through inquiry. A paper airplane that glides and then dives supplies the opening observation; it is the case study, not the whole message. Choosing a phase changes both the scene and the motion, so the reader can see the method advance. The page also offers a pausable **Play full sequence** tour; manual phase selection stops the tour.

## What each scene means

1. **Notice:** the plane glides and dives; its path records only what can be observed.
2. **Frame:** a focus reticle narrows attention to one variable, the plane's nose weight, turning “Why did it fly badly?” into a question that can be tested.
3. **Model:** a small weight joins the nose and a causal link appears. This is a provisional explanation, not a law or a claimed cause.
4. **Test:** two matching planes leave identical release points; only one has a nose weight. The animation shows a controlled comparison, not a measured outcome.
5. **Revise:** an evidence marker reaches two equally open branches. The page deliberately does not choose which is true; a real observation must decide whether to keep, change or replace the model.
6. **Transfer:** a method card moves from the airplane case to a new paper-bridge loading problem, showing what can carry over when the subject changes.

The six motions make the inquiry visible: observation → question → provisional model → fair test → evidence-led revision → transfer. The only asserted flight fact is the depicted glide followed by a nose-down dive; the cause and test result remain open.

## Build and verify

From the repository root:

```sh
node docs/src/learning-loop/build.mjs
node docs/src/learning-loop/build.mjs --light
node /path/to/anatomy/scripts/drive.mjs docs/learning-loop-light.html --actions docs/src/learning-loop/preview-actions.json --width 1100 --height 1200 --scale 1
```

The generated, dependency-free Pages files are `docs/learning-loop.html` (dark) and `docs/learning-loop-light.html` (light). The build script contains the geometry, story copy, scene-specific motion, the pausable tour and reduced-motion behavior. The browser test captures the flight and each phase, checks the transfer scene, confirms replay returns to observation, and verifies that the full tour advances and pauses.

## Craft credit

The figure is built with the [Anatomy Skill](https://github.com/wheresryan22/anatomy) and its `kit/iso-kit.mjs`. The kit is MIT-licensed; its original notice is preserved in [`vendor/LICENSE`](vendor/LICENSE). The learning-loop concept, teaching copy, geometry composition, interactions and page are original to this repository. Anatomy is a separate upstream project.
