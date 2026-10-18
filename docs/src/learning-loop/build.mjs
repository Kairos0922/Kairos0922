import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./vendor/iso-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const theme = process.argv.includes("--light") ? "light" : "dark";
const WIDTH = 650;
const HEIGHT = 405;
const PLATE = { x: -155, y: -66, w: 310, d: 132, r: 10 };
const X = [-122, -73, -24, 25, 74, 123];
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
    body: "先写下可重复描述的现象，不急着解释原因。示范情境：纸飞机刚离手，就朝地面俯冲。",
    move: "暂时把「为什么飞不好」放一边，只留下能观察到的现象。",
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

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "A detailed inquiry workbench: six physical stations for noticing a phenomenon, framing a question, building a model, testing it, revising it and transferring the method. A small carriage glides along the front rail to the selected station.",
  body: [base(), guideRails(), stations(), `<g data-part="carriage" transform="${k.translateAlong(P, [X[0], 41.7, 0])}">${carriage()}</g>`],
});

const phaseData = JSON.stringify({ X, STAGES, STORY });
const live = `
const { X, STAGES, STORY } = ${phaseData};
const P = ${JSON.stringify(P)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const carriage = svg.querySelector('[data-part="carriage"]');
const buttons = [...document.querySelectorAll("[data-phase]")];
const title = document.querySelector("[data-story-title]");
const body = document.querySelector("[data-story-body]");
const move = document.querySelector("[data-story-move]");
const readout = document.querySelector("[data-readout]");
const counter = document.querySelector("[data-counter]");
const liveRegion = document.querySelector("[data-live-region]");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
let selected = 0, x = X[0], target = X[0], frame = 0, last = 0;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
function render(announce = false) {
  const s = STAGES[selected], text = STORY[selected];
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
function select(index, announce = true) { selected = clamp(index, 0, STAGES.length - 1); render(announce); }
buttons.forEach((button, index) => button.addEventListener('click', () => select(index)));
document.querySelector('[data-prev]').addEventListener('click', () => select(selected - 1));
document.querySelector('[data-next]').addEventListener('click', () => select(selected + 1));
stage.addEventListener('keydown', event => {
  let next = null;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = selected + 1;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = selected - 1;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = STAGES.length - 1;
  if (next === null) return;
  event.preventDefault(); select(next);
});
reduceMotion.addEventListener?.('change', () => { if (reduceMotion.matches) { cancelAnimationFrame(frame); frame = 0; x = target; positionCarriage(); } });
render(false);
`;

const stageButtons = STAGES.map((phase, index) => `<button type="button" class="phase-button" data-phase="${index}" aria-pressed="${index === 0}" aria-label="第 ${index + 1} 阶段：${phase.zh} ${phase.en}"><span class="phase-number">0${index + 1}</span><span class="phase-name">${phase.zh}<small>${phase.en}</small></span></button>`).join("");
const card = k.plateHtml({
  fig: "Fig 03",
  title: "The Learning Loop",
  hint: "选择阶段 · 方向键切换",
  readout: "01 · 发现 / Notice",
  keys: [
    { mark: "lit", label: "移动中的问题标记：此刻正在练习的思维动作" },
    { mark: "raised", label: "六个实体工具：从观察到迁移" },
  ],
  caption: "工作台不是答案机器。选择阶段，看一个陌生问题怎样变得可探索；按方向键或下方按钮继续。纸飞机场景是练习题，不预设结论。",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="互动学习工作台。使用方向键在六个学习阶段间移动问题标记。">${svg}</div>`,
});
const page = `
<header class="page-intro">
  <p class="eyebrow">KAIROS · LEARNING BY EXPLORING</p>
  <h1>The Learning Loop</h1>
  <p class="lead">当答案随手可得，真正值得练习的是：<strong>怎样把未知变成可解决的问题。</strong></p>
  <p class="lede-cn">学习不是囤积结论，而是发现、定义、建模、检验、修正，再把方法带到下一个未知。</p>
</header>
${card}
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
  <p class="takeaway">要带走的不是这架纸飞机的答案，而是遇到陌生问题时，仍知道怎样迈出下一步。</p>
  <p class="attribution">互动图形由 <a href="https://github.com/wheresryan22/anatomy">Anatomy</a> 开源 Skill 构建，按 MIT License 使用。<a href="../src/learning-loop/README.md">查看制作方法与源码</a>。</p>
</section>
<div class="sr-only" data-live-region aria-live="polite" aria-atomic="true"></div>
`;
const customCss = `
.page-intro{max-width:710px;margin:0 auto 26px}.eyebrow,.lesson-kicker{font:11px/1.4 var(--anatomy-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--anatomy-muted)}
.page-intro h1{margin:8px 0 12px;font-size:clamp(34px,6vw,52px);line-height:1.02;letter-spacing:-.045em;color:var(--anatomy-strong);font-weight:650}
.lead{font-size:19px;line-height:1.5;margin:0 0 8px;color:var(--anatomy-text)}.lead strong{color:var(--anatomy-strong);font-weight:600}.lede-cn{margin:0;color:var(--anatomy-muted);line-height:1.8}
.iso-figure{margin:0}.iso-plate{padding:56px 20px 50px}.iso-stage{outline:none;border-radius:4px;touch-action:pan-y}.iso-stage:focus-visible{box-shadow:0 0 0 2px var(--anatomy-lit)}.iso-stage svg{width:100%;height:auto;display:block}.iso-caption{line-height:1.75}
.lesson{max-width:710px;margin:32px auto 0;padding:24px 0 0;border-top:1px solid var(--anatomy-mid)}.lesson-kicker{margin:0 0 9px}.lesson h2{font-size:22px;line-height:1.3;margin:0 0 10px;color:var(--anatomy-strong);letter-spacing:-.02em}.lesson>p:not(.lesson-kicker):not(.next-move):not(.takeaway):not(.attribution){line-height:1.8;font-size:15px;margin:0 0 14px}
.next-move{display:grid;grid-template-columns:145px 1fr;gap:14px;margin:18px 0 24px;padding:14px 16px;border-left:2px solid var(--anatomy-lit);background:var(--anatomy-card);line-height:1.65}.next-move span:first-child{font:10px/1.5 var(--anatomy-mono);text-transform:uppercase;letter-spacing:.08em;color:var(--anatomy-muted)}
.phase-nav{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px}.phase-button,.lesson-controls button{font:inherit;color:var(--anatomy-text);background:var(--anatomy-card);border:1px solid var(--anatomy-mid);border-radius:3px;cursor:pointer;transition:background .18s ease,border-color .18s ease,color .18s ease,transform .18s ease}.phase-button{min-height:62px;padding:9px 7px;text-align:left;display:flex;flex-direction:column;justify-content:space-between}.phase-button:hover:not(.is-active),.lesson-controls button:hover:not(:disabled){border-color:var(--anatomy-text);transform:translateY(-1px)}.phase-button.is-active{border-color:var(--anatomy-lit);color:var(--anatomy-strong);background:var(--anatomy-face)}.phase-number{font:10px/1 var(--anatomy-mono);color:var(--anatomy-muted)}.phase-name{font-size:13px;line-height:1.2}.phase-name small{display:block;margin-top:3px;font:10px/1.2 var(--anatomy-mono);color:var(--anatomy-muted)}
.lesson-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:16px 0 24px}.lesson-controls button{padding:8px 12px}.lesson-controls button:disabled{opacity:.4;cursor:not-allowed}.lesson-controls span{font:11px var(--anatomy-mono);color:var(--anatomy-muted);font-variant-numeric:tabular-nums}.takeaway{font-size:17px;line-height:1.7;color:var(--anatomy-strong);margin:0 0 18px}.attribution{font-size:11px;line-height:1.7;color:var(--anatomy-muted);margin:0}.attribution a{color:inherit;text-underline-offset:3px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:620px){.iso-page{width:calc(100% - 24px);margin:32px auto 52px}.page-intro{margin-bottom:20px}.page-intro h1{font-size:38px}.lead{font-size:17px}.iso-plate{padding:50px 10px 50px}.iso-plate-corners{inset:16px 12px}.phase-nav{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.phase-button{min-height:56px;padding:8px}.next-move{grid-template-columns:1fr;gap:4px}.lesson{margin-top:24px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important}}
`;
const kitSource = readFileSync(join(HERE, "vendor", "iso-kit.mjs"), "utf8").replace(/^export /gm, "");
const html = k.pageHtml({ title: "The Learning Loop — Kairos", theme, body: page, script: kitSource + live, width: 760 });
const output = html.replace("</style>", `${customCss}</style>`).replace('<html lang="en">', '<html lang="zh-CN">');
const file = join(ROOT, theme === "light" ? "learning-loop-light.html" : "learning-loop.html");
writeFileSync(file, output);
console.log(`wrote ${file} · ${solidCount} solid calls · ${theme} theme`);
