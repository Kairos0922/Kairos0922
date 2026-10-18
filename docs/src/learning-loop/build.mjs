import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./vendor/iso-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const theme = process.argv.includes("--light") ? "light" : "dark";
const WIDTH = 650;
const HEIGHT = 450;
const PLATE = { x: -155, y: -66, w: 310, d: 132, r: 10 };
const X = [-122, -73, -24, 25, 74, 123];
const FLIGHT = [
  [[78, 48], [145, 22], [232, 24], [304, 47]],
  [[304, 47], [375, 71], [412, 145], [420, 174]],
];
const STAGES = [
  { en: "Notice", zh: "发现", short: "先描述现象" },
  { en: "Frame", zh: "定义", short: "把问题变具体" },
  { en: "Model", zh: "建模", short: "提出可检验解释" },
  { en: "Test", zh: "检验", short: "寻找能区分解释的证据" },
  { en: "Revise", zh: "修正", short: "让结果改变模型" },
  { en: "Transfer", zh: "迁移", short: "把方法带到新问题" },
];
const STORY = [
  {
    title: "先看见发生了什么",
    body: "现象：纸飞机离手后先滑翔，随后机头朝下俯冲。先记录发生了什么，暂时不猜原因。",
    move: "先描述看得见的变化：离手、滑翔、机头下坠。原因留到下一步再查。",
  },
  {
    title: "把模糊的困惑缩小",
    body: "把「为什么飞不好」改成能检验的问题：机头配重会不会改变它俯冲的趋势？",
    move: "一个好问题不必很大，但要指出可以改变或观察的东西。",
  },
  {
    title: "先搭一个可以被推翻的模型",
    body: "提出一条待检验的解释：在相同折法和投掷方式下，机头配重可能影响俯冲。它是暂时的模型，不是要背的定律。",
    move: "让解释说清「什么条件会带来什么可观察变化」。",
  },
  {
    title: "让证据有机会回答问题",
    body: "设计公平比较：保持折法和投掷方式一致，只改变机头配重，再观察俯冲是否变化。",
    move: "一次只改一个关键条件，才能知道观察结果对应什么。",
  },
  {
    title: "用结果修正，而不是护住答案",
    body: "若结果不符合预测，就检查假设、控制条件和观察方法；更新解释，或提出下一项测试。",
    move: "与预测不符不是学习失败，而是模型获得了新的边界。",
  },
  {
    title: "把方法带到陌生问题",
    body: "换一个情境，继续问：我观察到什么？怎样把问题缩小？哪条证据能区分解释？",
    move: "要带走的是提问、检验和修正的能力，不是这个案例的标准答案。",
  },
];

let solidCount = 0;
const S = (paths, style) => { solidCount++; return k.solidSvg(paths, style); };
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const at = (point) => k.iso(point, P);
const byDepth = (items) => [...items].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const P = k.fitProjection(
  [...k.boxCorners(PLATE, -14, 0), [-139, 0, 58], [139, 0, 58], [-139, 0, 0], [139, 0, 0]],
  WIDTH,
  HEIGHT,
  { pad: 30, azimuth: 48, elevation: 30 },
);

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -14, 14, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7.2, -14, 1.8, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.6, -12.2, 4.2, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -10, 10, P, 8, 1.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5, tone: "mid" }));
  const plate = { x: -24, y: 50, w: 48, d: 9, r: 1.2 };
  out.push(S(k.slabOf(plate, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L([15, 22, 29].map((x) => k.lineOnTop([plate.x + 5, plate.y + 2 + (x % 5),], [plate.x + x, plate.y + 2 + (x % 5)], 0.8, P)).join(""), { tone: "faint", free: true }));
  return out.join("");
}

function guideRails() {
  const out = [];
  for (const y of [31, 48]) {
    const rail = { x: -139, y, w: 278, d: 4.4, r: 1.4 };
    out.push(S(k.slabOf(rail, 0, 4.5, P, 4, 0.5), { tone: "mid" }));
    out.push(L(k.lineOnTop([rail.x + 4, y + rail.d / 2], [rail.x + rail.w - 4, y + rail.d / 2], 4.5, P), { tone: "lo" }));
    for (const x of [-136, 136]) {
      out.push(S(k.slabOf({ x: x - 2, y: y - 2, w: 4, d: 8, r: 1 }, 0, 8, P, 3, 0.5), { tone: "hi" }));
      out.push(D([at([x, y + 2, 8])], { size: 0.5, tone: "lo" }));
    }
  }
  for (const x of [-132, -77, -22, 33, 88, 132]) {
    out.push(S(k.slabOf({ x: x - 2.4, y: 31, w: 4.8, d: 21.4, r: 1 }, 0, 2.2, P, 3), { tone: "lo", crease: "none" }));
  }
  return out.join("");
}

function stationBase(x, index) {
  const plan = { x: x - 18, y: -24, w: 36, d: 48, r: 3 };
  const inset = { x: x - 15, y: -21, w: 30, d: 42, r: 2.2 };
  const out = [S(k.slabOf(plan, 0, 5, P, 6, 0.6), { tone: "mid" })];
  out.push(L(k.planOutline(inset, 5, P, 6), { tone: "faint" }));
  const screws = k.corners(plan, 4.5);
  out.push(L(screws.map(([sx, sy]) => k.ring(sx, sy, 1.15, 5, P, 12)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([sx, sy]) => at([sx, sy, 5])), { size: 0.38, tone: "mid" }));
  // A shallow index well gives each station a real mounting point for the travelling question-carriage.
  out.push(S(k.slabOf({ x: x - 5, y: 16, w: 10, d: 4, r: 1 }, 5, 1.2, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.lineOnTop([x - 2.2, 18], [x + 2.2, 18], 6.2, P), { tone: "faint", free: true }));
  return out.join("");
}

function notice(x) {
  const out = [];
  // A magnifying instrument above a small, deliberately unresolved observation.
  out.push(S(k.slabOf({ x: x - 12, y: -14, w: 12, d: 10, r: 1.2 }, 5, 3, P, 4, 0.4), { tone: "hi" }));
  out.push(L(k.lineOnTop([x - 10, -12], [x - 2, -12], 8, P) + k.lineOnTop([x - 10, -10], [x - 5, -10], 8, P), { tone: "lo" }));
  out.push(S(k.cylinder(x + 7, -1, 2.4, 5, 17, P, 20, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(x + 7, -1, 6.3, 22, 2.2, P, 32, 0.5), { tone: "hi" }));
  out.push(L(k.ring(x + 7, -1, 4.7, 24.2, P, 32), { tone: "lo" }));
  out.push(S(k.slabOf({ x: x + 3, y: 6, w: 8, d: 2.6, r: 1 }, 6, 2, P, 3), { tone: "mid" }));
  out.push(D([at([x + 7, -1, 24.2])], { size: 1.2, tone: "faint" }));
  return out.join("");
}

function frameQuestion(x) {
  const out = [];
  for (const dx of [-10, 10]) {
    out.push(S(k.slabOf({ x: x + dx - 1.8, y: -5, w: 3.6, d: 5, r: 0.8 }, 5, 20, P, 4, 0.5), { tone: "hi" }));
    out.push(S(k.slabOf({ x: x + dx - 2.4, y: -6, w: 4.8, d: 8, r: 1 }, 5, 2, P, 4), { tone: "mid" }));
  }
  out.push(S(k.slabOf({ x: x - 11, y: -5, w: 22, d: 5, r: 1 }, 25, 3, P, 4, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x - 5.4, y: -4, w: 10.8, d: 3, r: 1 }, 15, 3, P, 4), { tone: "hi" }));
  out.push(L(k.planOutline({ x: x - 4, y: -3, w: 8, d: 2, r: 1 }, 18, P, 4), { tone: "lo" }));
  out.push(D([-1.5, 1.5].map((y) => at([x, y, 17])), { size: 0.45 }));
  return out.join("");
}

function modelBlocks(x) {
  const out = [];
  const blocks = [
    { dx: -10, y: -13, w: 8, d: 11, h: 9 },
    { dx: 1, y: -13, w: 8, d: 11, h: 14 },
    { dx: -5, y: 2, w: 12, d: 10, h: 18 },
  ];
  for (const b of blocks) {
    const plan = { x: x + b.dx, y: b.y, w: b.w, d: b.d, r: 1.5 };
    out.push(S(k.slabOf(plan, 5, b.h, P, 4, 0.6), { tone: "hi" }));
    out.push(L(k.planOutline(k.insetPlan(plan, 1.5), 5 + b.h, P, 4), { tone: "faint" }));
    out.push(D(k.corners(plan, 2.1).map(([sx, sy]) => at([sx, sy, 5 + b.h])), { size: 0.32 }));
  }
  const tray = { x: x - 14, y: 12, w: 28, d: 3.4, r: 1 };
  out.push(S(k.slabOf(tray, 5, 2.2, P, 3), { tone: "mid" }));
  out.push(L(k.lineOnTop([x - 11, 13.7], [x + 11, 13.7], 7.2, P), { tone: "lo" }));
  return out.join("");
}

function testRig(x) {
  const out = [];
  const pivot = [x - 7, -1];
  out.push(S(k.cylinder(pivot[0], pivot[1], 4.2, 5, 3, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(pivot[0], pivot[1], 2, 8, 3.2, P, 20), { tone: "hi" }));
  out.push(S(k.slabOf({ x: x - 9, y: -3, w: 17, d: 2.4, r: 1 }, 10, 2.2, P, 4), { tone: "hi" }));
  out.push(S(k.cylinder(x + 8, -1, 6.4, 5, 6, P, 32, 0.7), { tone: "hi" }));
  out.push(L(k.ring(x + 8, -1, 4.7, 11, P, 32), { tone: "lo" }));
  out.push(L(k.radialTicks(x + 8, -1, 3.8, 12, 3, 11, [0.8, 1.4], P).minor, { tone: "lo" }));
  out.push(L(k.lineOnTop([x + 8, -1], [x + 10.8, -3.1], 11.2, P), { tone: "mid", free: true }));
  out.push(S(k.slabOf({ x: x - 4, y: -7, w: 8, d: 3, r: 1 }, 5, 2, P, 3), { tone: "mid" }));
  return out.join("");
}

function reviseWheel(x) {
  const out = [];
  out.push(S(k.cylinder(x, -1, 8, 5, 4, P, 40, 0.6), { tone: "mid" }));
  out.push(L(k.knurl(x, -1, 8, 7, 9, 32, P, 0.35), { tone: "lo" }));
  out.push(L(k.ring(x, -1, 6, 9, P, 36), { tone: "hi" }));
  out.push(S(k.cylinder(x, -1, 2.2, 9, 4, P, 20), { tone: "hi" }));
  out.push(L(k.lineOnTop([x, -1], [x + 4.2, -4], 13, P), { tone: "mid", free: true }));
  out.push(S(k.slabOf({ x: x - 12, y: 10, w: 24, d: 4, r: 1 }, 5, 2.2, P, 3), { tone: "mid" }));
  out.push(D([-7, 0, 7].map((dx) => at([x + dx, 12, 7.2])), { size: 0.45 }));
  return out.join("");
}

function transferTable(x) {
  const out = [];
  out.push(S(k.cylinder(x, -1, 13, 5, 3.4, P, 56, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(x, -1, 9, 8.4, 1.4, P, 48), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(x, -1, 10.6, 8.4, P, 48), { tone: "lo" }));
  const specimenA = { x: x - 8, y: -5, w: 6, d: 7, r: 0.8 };
  out.push(S(k.slabOf(specimenA, 9.8, 8, P, 4, 0.5), { tone: "hi" }));
  out.push(S(k.cylinder(x + 6, -1, 3.2, 9.8, 8, P, 24, 0.5), { tone: "hi" }));
  out.push(L(k.radialTicks(x, -1, 11.7, 16, 4, 8.6, [0.6, 1.3], P).major, { tone: "lo" }));
  out.push(D([at([x, -1, 9.8])], { size: 0.65, tone: "mid" }));
  return out.join("");
}

function stations() {
  const builders = [notice, frameQuestion, modelBlocks, testRig, reviseWheel, transferTable];
  return X.map((x, index) => {
    const content = stationBase(x, index) + builders[index](x);
    return { x, index, depth: k.depthOf([x, 0, 0], P), svg: `<g data-station="${index}">${content}</g>` };
  }).sort((a, b) => a.depth - b.depth).map((station) => station.svg).join("");
}

function carriage() {
  const out = [];
  const chassis = { x: -8, y: -7.6, w: 16, d: 15.2, r: 3 };
  out.push(S(k.slabOf(chassis, 3.6, 4, P, 6, 0.8), { tone: "mid" }));
  for (const y of [-8.5, 8.5]) {
    for (const x of [-5.3, 5.3]) {
      out.push(S(k.cylinder(x, y, 2.1, 1.2, 2.4, P, 18, 0.3), { tone: "lo" }));
      out.push(L(k.sideArc(x, y, 1.3, 2.1, P, 12), { tone: "faint" }));
    }
  }
  out.push(S(k.slabOf({ x: -2.2, y: -1.4, w: 4.4, d: 2.8, r: 1 }, 7.6, 8, P, 4, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(0, 0, 3.1, 15.6, 2.2, P, 24, 0.5), { tone: "hi", lit: true }));
  out.push(D([at([0, 0, 17.8])], { size: 1.2, tone: "lit" }));
  return out.join("");
}

const flightD = `M${FLIGHT[0][0].join(" ")} C${FLIGHT[0].slice(1).map((point) => point.join(" ")).join(" ")} C${FLIGHT[1].slice(1).map((point) => point.join(" ")).join(" ")}`;
function flightGuide() {
  return `<g class="flight-guide" aria-hidden="true"><path class="flight-path" d="${flightD}"/><circle class="flight-start" cx="78" cy="48" r="3"/><circle class="flight-impact" cx="420" cy="174" r="4"/><text class="flight-note" x="78" y="101">离手 · 平稳滑翔</text><text class="flight-note flight-note-end" x="466" y="208">机头下坠</text></g>`;
}
function paperPlane() {
  return `<g data-part="paper-plane" class="paper-plane" transform="translate(78 48)">
    <path class="plane-shadow" d="M48 2 -34 -28 -13 2 -34 32Z"/>
    <path class="plane-wing plane-wing-a" d="M48 0 -34 -30 -13 0Z"/>
    <path class="plane-wing plane-wing-b" d="M48 0 -13 0 -34 30Z"/>
    <path class="plane-outline" d="M48 0 -34 -30 -13 0 -34 30Z"/>
    <path class="plane-fold" d="M48 0 -13 0 -34 -30 M-13 0 -34 30"/>
    <path class="plane-nose" d="M48 0 25 -2.4 30 0 25 2.4Z"/>
    <circle class="plane-rivet" cx="-13" cy="0" r="1.6"/>
  </g>`;
}

function planeGlyph(transform, weighted = false) {
  return `<g class="mini-plane" transform="${transform}">
    <path class="plane-wing plane-wing-a" d="M48 0 -34 -30 -13 0Z"/>
    <path class="plane-wing plane-wing-b" d="M48 0 -13 0 -34 30Z"/>
    <path class="plane-outline" d="M48 0 -34 -30 -13 0 -34 30Z"/>
    <path class="plane-fold" d="M48 0 -13 0 -34 -30 M-13 0 -34 30"/>
    ${weighted ? '<path class="nose-weight" d="M42 -6 49 -6 49 6 42 6Z"/>' : ""}
  </g>`;
}

function learningScenes() {
  return `
  <g class="process-scene" data-scene="1" aria-hidden="true">
    <path class="focus-bracket" d="M425 190h-10v-10 M444 190h10v-10 M425 227h-10v10 M444 227h10v10"/>
    <circle class="focus-ring" cx="434" cy="208" r="12"/>
    <path class="focus-leader" d="M447 207 Q468 196 488 197"/>
    <circle class="focus-pulse" cx="434" cy="208" r="3"/>
  </g>
  <g class="process-scene" data-scene="2" aria-hidden="true">
    <path class="model-link" d="M435 220 C470 178 506 151 542 151"/>
    <circle class="model-node model-cause" cx="435" cy="220" r="5"/>
    <circle class="model-node model-effect" cx="542" cy="151" r="7"/>
    <path class="model-arrow" d="M514 151h18m0 0-6-5m6 5-6 5"/>
    <path class="nose-weight model-weight" d="M427 211 435 211 435 227 427 227Z"/>
    <circle class="model-question" cx="504" cy="167" r="5"/>
    <path class="model-question-mark" d="M502 165q2-3 4-1 2 2-1 4l-1 1m0 2v.2"/>
  </g>
  <g class="process-scene test-scene" data-scene="3" aria-hidden="true">
    <path class="test-rail" d="M90 40H556 M90 91H556"/>
    <path class="test-rail-inner" d="M90 47H556 M90 98H556"/>
    <path class="release-gate" d="M156 29v27 M156 80v27 M150 29h12 M150 80h12"/>
    <path class="release-arrow" d="M105 33h26m-7-5 7 5-7 5 M105 84h26m-7-5 7 5-7 5"/>
    <g class="test-plane test-plane-a">${planeGlyph("translate(171 39) scale(.42)")}</g>
    <g class="test-plane test-plane-b">${planeGlyph("translate(171 90) scale(.42)", true)}</g>
    <path class="same-condition" d="M117 58v20m0-10h28m-28 0h-7m35-10v20"/>
    <circle class="test-signal test-signal-a" cx="522" cy="40" r="2.6"/>
    <circle class="test-signal test-signal-b" cx="522" cy="91" r="2.6"/>
  </g>
  <g class="process-scene evidence-scene" data-scene="4" aria-hidden="true">
    <rect class="evidence-card" x="179" y="21" width="294" height="94" rx="4"/>
    <path class="evidence-spine" d="M211 66h76m0 0 61-25m-61 25 61 25"/>
    <circle class="evidence-source" cx="211" cy="66" r="8"/>
    <circle class="evidence-branch evidence-branch-a" cx="348" cy="41" r="7"/>
    <circle class="evidence-branch evidence-branch-b" cx="348" cy="91" r="7"/>
    <path class="evidence-return" d="M365 41h46v-12m-46 62h46v12"/>
    <rect class="evidence-option evidence-option-a" x="427" y="31" width="29" height="20" rx="2"/>
    <rect class="evidence-option evidence-option-b" x="427" y="81" width="29" height="20" rx="2"/>
    <circle class="evidence-token evidence-token-a" cx="282" cy="66" r="3.2"/>
    <circle class="evidence-token evidence-token-b" cx="282" cy="66" r="3.2"/>
  </g>
  <g class="process-scene transfer-scene" data-scene="5" aria-hidden="true">
    <rect class="method-card" x="68" y="31" width="190" height="67" rx="3"/>
    <path class="method-line" d="M89 64h143"/>
    <circle class="method-step" cx="91" cy="64" r="4"/><circle class="method-step" cx="119" cy="64" r="4"/>
    <circle class="method-step" cx="147" cy="64" r="4"/><circle class="method-step" cx="175" cy="64" r="4"/>
    <circle class="method-step" cx="203" cy="64" r="4"/><circle class="method-step" cx="231" cy="64" r="4"/>
    <path class="transfer-route" d="M258 64 C300 64 317 64 354 64"/>
    <circle class="transfer-token" cx="258" cy="64" r="4"/>
    <g class="bridge-case">
      <path class="bridge-book" d="M397 82v-21h31v21z M487 82v-21h31v21z"/>
      <path class="bridge-deck" d="M405 61 Q457 89 510 61"/>
      <path class="bridge-fold" d="M414 66 423 72 432 75 441 78 450 79 459 80 468 79 477 78 486 75 495 72 503 66"/>
      <path class="bridge-load" d="M451 41h16v19h-16z M454 35h10v6h-10z"/>
      <circle class="bridge-mark" cx="459" cy="39" r="2"/>
    </g>
  </g>`;
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "A six-step inquiry becomes a sequence of linked motions: observe a paper plane dive, focus the question, build a testable model, compare controlled trials, revise from evidence, and transfer the method to a paper bridge problem.",
  body: [`<g class="workbench" data-part="workbench">${base()}${guideRails()}${stations()}<g data-part="carriage" transform="${k.translateAlong(P, [X[0], 41.7, 0])}">${carriage()}</g></g>`, flightGuide(), paperPlane(), learningScenes()],
}).replace("<svg ", '<svg data-phase="0" ');

const phaseData = JSON.stringify({ X, STAGES, STORY, FLIGHT });
const live = `
const { X, STAGES, STORY, FLIGHT } = ${phaseData};
const P = ${JSON.stringify(P)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const carriage = svg.querySelector('[data-part="carriage"]');
const plane = svg.querySelector('[data-part="paper-plane"]');
const scenes = [...svg.querySelectorAll('[data-scene]')];
const stations = [...svg.querySelectorAll('[data-station]')];
const buttons = [...document.querySelectorAll(".phase-button[data-phase]")];
const replay = document.querySelector("[data-replay]");
const tour = document.querySelector("[data-tour]");
const title = document.querySelector("[data-story-title]");
const body = document.querySelector("[data-story-body]");
const move = document.querySelector("[data-story-move]");
const readout = document.querySelector("[data-readout]");
const counter = document.querySelector("[data-counter]");
const liveRegion = document.querySelector("[data-live-region]");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
let selected = 0, x = X[0], target = X[0], frame = 0, last = 0;
let flightFrame = 0, flightStart = 0, tourTimer = 0, touring = false;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
function curveAt(segment, t) {
  const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]] = segment, u = 1 - t;
  const x = u*u*u*x0 + 3*u*u*t*x1 + 3*u*t*t*x2 + t*t*t*x3;
  const y = u*u*u*y0 + 3*u*u*t*y1 + 3*u*t*t*y2 + t*t*t*y3;
  const dx = 3*u*u*(x1-x0) + 6*u*t*(x2-x1) + 3*t*t*(x3-x2);
  const dy = 3*u*u*(y1-y0) + 6*u*t*(y2-y1) + 3*t*t*(y3-y2);
  return { x, y, angle: Math.atan2(dy, dx) * 180 / Math.PI };
}
function positionPlane(progress) {
  const split = 0.62;
  const pose = progress <= split ? curveAt(FLIGHT[0], progress / split) : curveAt(FLIGHT[1], (progress - split) / (1 - split));
  plane.setAttribute('transform', 'translate(' + pose.x.toFixed(2) + ' ' + pose.y.toFixed(2) + ') rotate(' + pose.angle.toFixed(2) + ')');
}
function fly(now) {
  if (!flightStart) flightStart = now;
  const raw = Math.min(1, (now - flightStart) / 2300);
  positionPlane(raw);
  if (raw < 1) flightFrame = requestAnimationFrame(fly);
  else { flightFrame = 0; flightStart = 0; replay.textContent = '↻ 重播纸飞机俯冲'; }
}
function replayFlight() {
  cancelAnimationFrame(flightFrame); flightFrame = 0; flightStart = 0;
  if (reduceMotion.matches) { positionPlane(1); return; }
  replay.textContent = '纸飞机正在俯冲…';
  flightFrame = requestAnimationFrame(fly);
}
function render(announce = false) {
  const s = STAGES[selected], text = STORY[selected];
  svg.setAttribute('data-phase', String(selected));
  scenes.forEach((scene) => scene.classList.toggle('is-current', Number(scene.dataset.scene) === selected));
  stations.forEach((station) => station.classList.toggle('is-selected', Number(station.dataset.station) === selected));
  buttons.forEach((button, index) => {
    const active = index === selected;
    button.setAttribute('aria-pressed', String(active));
    button.classList.toggle('is-active', active);
  });
  title.textContent = text.title;
  body.textContent = text.body;
  move.textContent = text.move;
  readout.textContent = String(selected + 1).padStart(2, '0') + ' · ' + s.zh + ' / ' + s.en;
  counter.textContent = String(selected + 1).padStart(2, '0') + ' / ' + String(STAGES.length).padStart(2, '0');
  document.querySelector('[data-prev]').disabled = selected === 0;
  document.querySelector('[data-next]').disabled = selected === STAGES.length - 1;
  if (announce) liveRegion.textContent = s.zh + '，' + text.title + '。' + text.body;
  target = X[selected];
  if (reduceMotion.matches) { x = target; positionCarriage(); } else run();
}
function positionCarriage() { carriage.setAttribute('transform', translateAlong(P, [x, 41.7, 0])); }
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
  x += (target - x) * (1 - Math.exp(-dt / 0.32));
  if (Math.abs(target - x) < 0.025) x = target;
  positionCarriage();
  if (x !== target) frame = requestAnimationFrame(tick); else { frame = 0; last = 0; }
}
function run() { if (!frame) { last = 0; frame = requestAnimationFrame(tick); } }
function select(index, announce = true) {
  const next = clamp(index, 0, STAGES.length - 1);
  if (next === selected) { if (next === 0) replayFlight(); return; }
  selected = next;
  cancelAnimationFrame(flightFrame); flightFrame = 0; flightStart = 0;
  render(announce);
  if (selected === 0) replayFlight();
  else { positionPlane(1); replay.textContent = '↻ 重播纸飞机俯冲'; }
}
function stopTour() {
  touring = false; clearTimeout(tourTimer); tourTimer = 0;
  tour.textContent = '▶ 播放完整流程'; tour.setAttribute('aria-pressed', 'false');
}
function scheduleTour() {
  clearTimeout(tourTimer);
  tourTimer = setTimeout(() => {
    if (!touring) return;
    select((selected + 1) % STAGES.length);
    scheduleTour();
  }, selected === 0 ? 2700 : 1900);
}
function toggleTour() {
  if (reduceMotion.matches) return;
  if (touring) { stopTour(); return; }
  touring = true; tour.textContent = 'Ⅱ 暂停演示'; tour.setAttribute('aria-pressed', 'true');
  if (selected === 0) replayFlight(); else select(0);
  scheduleTour();
}
function manualSelect(index) { if (touring) stopTour(); select(index); }
const syncTourMotion = () => { if (reduceMotion.matches && touring) stopTour(); tour.disabled = reduceMotion.matches; };
syncTourMotion(); reduceMotion.addEventListener?.('change', syncTourMotion);
buttons.forEach((button, index) => button.addEventListener('click', () => manualSelect(index)));
tour.addEventListener('click', toggleTour);
replay.addEventListener('click', () => { if (touring) stopTour(); selected === 0 ? replayFlight() : select(0); });
document.querySelector('[data-prev]').addEventListener('click', () => manualSelect(selected - 1));
document.querySelector('[data-next]').addEventListener('click', () => manualSelect(selected + 1));
stage.addEventListener('keydown', event => {
  let next = null;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = selected + 1;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = selected - 1;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = STAGES.length - 1;
  if (next === null) return;
  event.preventDefault(); manualSelect(next);
});
reduceMotion.addEventListener?.('change', () => { if (reduceMotion.matches) { cancelAnimationFrame(frame); frame = 0; x = target; positionCarriage(); cancelAnimationFrame(flightFrame); flightFrame = 0; positionPlane(1); } });
render(false);
if (reduceMotion.matches) positionPlane(1); else flightFrame = requestAnimationFrame(fly);
`;

const stageButtons = STAGES.map((phase, index) => `<button type="button" class="phase-button" data-phase="${index}" aria-pressed="${index === 0}" aria-label="第 ${index + 1} 阶段：${phase.zh} ${phase.en}"><span class="phase-number">0${index + 1}</span><span class="phase-name">${phase.zh}<small>${phase.en}</small></span></button>`).join("");
const card = k.plateHtml({
  fig: "Fig 03",
  title: "The Learning Loop",
  hint: "选择阶段 · 方向键切换",
  readout: "01 · 发现 / Notice",
  keys: [
    { mark: "blue", label: "观察飞机俯冲，并沿六步查明问题" },
    { mark: "raised", label: "切换阶段，查看每一步怎样改变调查" },
  ],
  caption: "从纸飞机俯冲开始，六个阶段会依次聚焦问题、搭建假设、比较条件、依据证据修正，再把方法带到纸桥的新问题。实验结果留给真正的观察，不在图中预设。",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="六个相连的学习场景：观察纸飞机俯冲，定义问题，建立可检验模型，做公平比较，依据证据修正，并把方法迁移到纸桥问题。使用方向键切换阶段。">${svg}</div>`,
});
const page = `
<header class="page-intro">
  <p class="eyebrow">KAIROS · LEARNING BY EXPLORING</p>
  <h1>The Learning Loop</h1>
  <p class="lead">当答案随手可得，真正值得练习的是：<strong>怎样把未知变成可解决的问题。</strong></p>
  <p class="lede-cn">答案越来越容易获得；提出问题、验证想法、把方法用到新情境，才是更值得练习的能力。</p>
</header>
${card}
<div class="flight-control"><div class="flight-actions"><button type="button" data-tour aria-pressed="false">▶ 播放完整流程</button><button type="button" data-replay aria-label="回到观察阶段并重播纸飞机飞行">↻ 重播第一步</button></div><span>六幕依次展示从观察到迁移的思考过程。</span></div>
<section class="lesson" aria-live="off">
  <p class="lesson-kicker">一题练习 · 纸飞机刚离手就俯冲</p>
  <h2 data-story-title>${STORY[0].title}</h2>
  <p data-story-body>${STORY[0].body}</p>
  <p class="next-move"><span>这一阶段要做的事</span><span data-story-move>${STORY[0].move}</span></p>
  <nav class="phase-nav" aria-label="学习回路六阶段">${stageButtons}</nav>
  <div class="lesson-controls">
    <button type="button" data-prev disabled>← 上一阶段</button>
    <span data-counter aria-live="off">01 / 06</span>
    <button type="button" data-next>下一阶段 →</button>
  </div>
  <p class="takeaway">这次练习不要求记住一个固定答案。学会提问、找证据、检验解释，遇到新问题时就知道从哪里开始。</p>
  <p class="attribution">互动图形由 <a href="https://github.com/wheresryan22/anatomy">Anatomy</a> 开源 Skill 构建，按 MIT License 使用。<a href="../src/learning-loop/README.md">查看制作方法与源码</a>。</p>
</section>
<div class="sr-only" data-live-region aria-live="polite" aria-atomic="true"></div>
`;
const customCss = `
.page-intro{max-width:710px;margin:0 auto 26px}.eyebrow,.lesson-kicker{font:11px/1.4 var(--anatomy-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--anatomy-muted)}
.page-intro h1{margin:8px 0 12px;font-size:clamp(34px,6vw,52px);line-height:1.02;letter-spacing:-.045em;color:var(--anatomy-strong);font-weight:650}
.lead{font-size:19px;line-height:1.5;margin:0 0 8px;color:var(--anatomy-text)}.lead strong{color:var(--anatomy-strong);font-weight:600}.lede-cn{margin:0;color:var(--anatomy-muted);line-height:1.8}
.iso-figure{margin:0}.iso-plate{padding:50px 20px 50px}.iso-stage{outline:none;border-radius:4px;touch-action:pan-y}.iso-stage:focus-visible{box-shadow:0 0 0 2px var(--anatomy-lit)}.iso-stage svg{width:100%;height:auto;display:block}.iso-caption{line-height:1.75}
.flight-path{fill:none;stroke:var(--anatomy-blue);stroke-width:1.7;stroke-dasharray:3 5;stroke-linecap:round;opacity:.8}.flight-start{fill:var(--anatomy-blue);stroke:var(--anatomy-paper);stroke-width:1.5}.flight-impact{fill:var(--anatomy-red);stroke:var(--anatomy-paper);stroke-width:1.5}.flight-note{fill:var(--anatomy-muted);font:9px var(--anatomy-mono);letter-spacing:.03em}.flight-note-end{fill:var(--anatomy-red)}.paper-plane{filter:drop-shadow(0 3px 3px rgba(0,0,0,.2))}.plane-shadow{fill:var(--anatomy-lo);opacity:.12}.plane-wing{stroke:none}.plane-wing-a{fill:var(--anatomy-paper)}.plane-wing-b{fill:var(--anatomy-face)}.plane-outline{fill:none;stroke:var(--anatomy-strong);stroke-width:1.8;stroke-linejoin:round;stroke-linecap:round}.plane-fold{fill:none;stroke:var(--anatomy-blue);stroke-width:1.3;stroke-linejoin:round;stroke-linecap:round}.plane-nose{fill:var(--anatomy-red)}.plane-rivet{fill:var(--anatomy-blue)}
.workbench{transition:opacity .45s ease}.process-scene{display:none;pointer-events:none}.process-scene.is-current{display:inline}.process-scene path,.process-scene circle,.process-scene rect{vector-effect:non-scaling-stroke}
svg[data-phase="3"] .workbench,svg[data-phase="4"] .workbench,svg[data-phase="5"] .workbench{opacity:.05}svg[data-phase="3"] .flight-guide,svg[data-phase="4"] .flight-guide,svg[data-phase="5"] .flight-guide,svg[data-phase="3"] .paper-plane,svg[data-phase="4"] .paper-plane,svg[data-phase="5"] .paper-plane{opacity:0;transition:opacity .3s}
.process-scene[data-scene="3"],.process-scene[data-scene="4"],.process-scene[data-scene="5"]{translate:0 96px;scale:1.15;transform-box:view-box;transform-origin:center}
.focus-bracket,.focus-leader,.model-link,.model-arrow,.test-rail,.test-rail-inner,.release-gate,.release-arrow,.same-condition,.evidence-spine,.evidence-return,.method-line,.transfer-route,.bridge-deck,.bridge-fold,.bridge-book,.bridge-load{fill:none;stroke:var(--anatomy-strong);stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}.focus-bracket,.focus-ring,.model-link,.model-arrow,.test-rail-inner,.release-arrow,.transfer-route{stroke:var(--anatomy-blue)}.focus-ring,.model-link,.transfer-route{stroke-dasharray:3 3}.focus-pulse,.test-signal,.evidence-source,.evidence-branch,.method-step,.transfer-token,.bridge-mark{fill:var(--anatomy-lit);stroke:var(--anatomy-paper);stroke-width:1}.focus-bracket{stroke-width:2}.focus-ring{fill:none;stroke-width:1.4}.focus-pulse{animation:focus-ping 1.6s ease-out infinite}.nose-weight{fill:var(--anatomy-red);stroke:var(--anatomy-strong);stroke-width:1.1;stroke-linejoin:round}.model-node{fill:var(--anatomy-blue);stroke:var(--anatomy-paper);stroke-width:1}.model-effect{fill:var(--anatomy-lit)}.model-weight{transform-box:fill-box;transform-origin:center;animation:weight-set 1.1s cubic-bezier(.2,.7,.2,1) both}.model-link{stroke-dasharray:80;stroke-dashoffset:80;animation:draw-link .8s .2s ease-out forwards}.model-question{fill:var(--anatomy-card);stroke:var(--anatomy-red);stroke-width:1.2}.model-question-mark{fill:none;stroke:var(--anatomy-red);stroke-width:1.2;stroke-linecap:round}
.test-rail{stroke:var(--anatomy-mid);stroke-width:2}.release-gate{stroke:var(--anatomy-muted)}.same-condition{stroke:var(--anatomy-lit);stroke-width:1.5}.mini-plane .plane-outline{stroke-width:2.4}.mini-plane .plane-fold{stroke-width:1.8}.test-plane{transform-box:fill-box;animation:controlled-launch 1.7s .2s ease-in-out infinite alternate}.test-plane-b{animation-delay:.35s}.test-signal{animation:paired-pulse 1.7s ease-in-out infinite alternate}.test-signal-b{animation-delay:.35s}
.evidence-card,.evidence-option,.method-card{fill:var(--anatomy-card);stroke:var(--anatomy-mid);stroke-width:1}.evidence-spine,.evidence-return{stroke:var(--anatomy-muted)}.evidence-branch{fill:var(--anatomy-card);stroke:var(--anatomy-blue);stroke-width:1.5}.evidence-option{stroke:var(--anatomy-mid);stroke-dasharray:2 2}.evidence-token{fill:var(--anatomy-lit);stroke:none}.evidence-token-a{animation:branch-a 1.8s ease-in-out infinite alternate}.evidence-token-b{animation:branch-b 1.8s ease-in-out infinite alternate}.method-card{stroke:var(--anatomy-mid)}.method-line{stroke:var(--anatomy-mid)}.method-step{stroke:var(--anatomy-paper);stroke-width:1.3}.method-step:nth-of-type(odd){fill:var(--anatomy-blue)}.transfer-route{stroke-dasharray:4 4}.transfer-token{animation:transfer-token 1.7s .2s ease-in-out infinite alternate}.bridge-book{fill:var(--anatomy-face);stroke:var(--anatomy-muted)}.bridge-deck{stroke:var(--anatomy-strong);stroke-width:3;animation:bridge-bend 1.7s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 0}.bridge-fold{stroke:var(--anatomy-blue);stroke-width:1.2}.bridge-load{fill:var(--anatomy-paper);stroke:var(--anatomy-strong)}
@keyframes focus-ping{0%{opacity:0;translate:0 0;scale:.5}40%{opacity:.95}100%{opacity:0;translate:0 0;scale:2.2}}@keyframes draw-link{to{stroke-dashoffset:0}}@keyframes weight-set{0%{translate:-22px -13px;opacity:0}75%{translate:2px 1px;opacity:1}100%{translate:0 0;opacity:1}}@keyframes controlled-launch{0%{translate:0 0}45%{translate:30px 0}100%{translate:34px 0}}@keyframes paired-pulse{0%,20%{opacity:.3}55%,100%{opacity:1}}@keyframes branch-a{0%,18%{translate:0 0}80%,100%{translate:66px -25px}}@keyframes branch-b{0%,18%{translate:0 0}80%,100%{translate:66px 25px}}@keyframes transfer-token{0%{translate:0 0}80%,100%{translate:96px 0}}@keyframes bridge-bend{0%{scale:1 1}100%{scale:1 1.1}}
.flight-control{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:10px 0 0 8px;color:var(--anatomy-muted);font-size:12px}.flight-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.flight-control button{border:1px solid var(--anatomy-mid);border-radius:3px;padding:8px 12px;background:var(--anatomy-card);color:var(--anatomy-strong);font:inherit;cursor:pointer}.flight-control button:hover:not(:disabled){border-color:var(--anatomy-blue)}.flight-control button:focus-visible{outline:2px solid var(--anatomy-blue);outline-offset:2px}.flight-control button:disabled{opacity:.45;cursor:not-allowed}
.lesson{max-width:710px;margin:32px auto 0;padding:24px 0 0;border-top:1px solid var(--anatomy-mid)}.lesson-kicker{margin:0 0 9px}.lesson h2{font-size:22px;line-height:1.3;margin:0 0 10px;color:var(--anatomy-strong);letter-spacing:-.02em}.lesson>p:not(.lesson-kicker):not(.next-move):not(.takeaway):not(.attribution){line-height:1.8;font-size:15px;margin:0 0 14px}
.next-move{display:grid;grid-template-columns:145px 1fr;gap:14px;margin:18px 0 24px;padding:14px 16px;border-left:2px solid var(--anatomy-lit);background:var(--anatomy-card);line-height:1.65}.next-move span:first-child{font:10px/1.5 var(--anatomy-mono);text-transform:uppercase;letter-spacing:.08em;color:var(--anatomy-muted)}
.phase-nav{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px}.phase-button,.lesson-controls button{font:inherit;color:var(--anatomy-text);background:var(--anatomy-card);border:1px solid var(--anatomy-mid);border-radius:3px;cursor:pointer;transition:background .18s ease,border-color .18s ease,color .18s ease,transform .18s ease}.phase-button{min-height:62px;padding:9px 7px;text-align:left;display:flex;flex-direction:column;justify-content:space-between}.phase-button:hover:not(.is-active),.lesson-controls button:hover:not(:disabled){border-color:var(--anatomy-text);transform:translateY(-1px)}.phase-button.is-active{border-color:var(--anatomy-lit);color:var(--anatomy-strong);background:var(--anatomy-face)}.phase-number{font:10px/1 var(--anatomy-mono);color:var(--anatomy-muted)}.phase-name{font-size:13px;line-height:1.2}.phase-name small{display:block;margin-top:3px;font:10px/1.2 var(--anatomy-mono);color:var(--anatomy-muted)}
.lesson-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:16px 0 24px}.lesson-controls button{padding:8px 12px}.lesson-controls button:disabled{opacity:.4;cursor:not-allowed}.lesson-controls span{font:11px var(--anatomy-mono);color:var(--anatomy-muted);font-variant-numeric:tabular-nums}.takeaway{font-size:17px;line-height:1.7;color:var(--anatomy-strong);margin:0 0 18px}.attribution{font-size:11px;line-height:1.7;color:var(--anatomy-muted);margin:0}.attribution a{color:inherit;text-underline-offset:3px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:620px){.iso-page{width:calc(100% - 24px);margin:32px auto 52px}.page-intro{margin-bottom:20px}.page-intro h1{font-size:38px}.lead{font-size:17px}.iso-plate{padding:48px 10px 46px}.iso-plate-corners{inset:16px 12px}.flight-control{margin-left:0}.phase-nav{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.phase-button{min-height:56px;padding:8px}.next-move{grid-template-columns:1fr;gap:4px}.lesson{margin-top:24px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`;
const kitSource = readFileSync(join(HERE, "vendor", "iso-kit.mjs"), "utf8").replace(/^export /gm, "");
const html = k.pageHtml({ title: "The Learning Loop — Kairos", theme, body: page, script: kitSource + live, width: 760 });
const output = html.replace("</style>", `${customCss}</style>`).replace('<html lang="en">', '<html lang="zh-CN">').replace(/^[ \t]+$/gm, "");
const file = join(ROOT, theme === "light" ? "learning-loop-light.html" : "learning-loop.html");
writeFileSync(file, output);
console.log(`wrote ${file} · ${solidCount} solid calls · ${theme} theme`);
