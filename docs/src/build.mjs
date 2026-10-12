import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../.agents/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../../../../.agents/skills/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg, crossingsOf } from "../../../../../.agents/skills/anatomy/kit/tube.mjs";
import * as A from "../../../../../.agents/skills/anatomy/kit/audit.mjs";
import { glCamera } from "../../../../../.agents/skills/anatomy/kit/gl.mjs";
import { glScript, kitScript } from "../../../../../.agents/skills/anatomy/scripts/inline-kit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";
const DEG = Math.PI / 180;

// ---------------------------------------------------------------- camera
const W = 1000;
const H = 640;
const AZIMUTH = 45;
const ELEVATION = 28;
const FLOOR = { x: -262, y: -128, w: 530, d: 272, r: 10 };

const RPV = { x: -155, y: -15 };
const R_OUT = 46, R_IN = 41;
const Z_WIN = [60, 124];
const Z_PLATE = [50, 60];
const Z_BARREL = [60, 118];
const Z_FLANGE = [128, 142];
const NOZ_Z = 94;
const VIEW = 45 * DEG;
const WIN_HALF = 50 * DEG;
const WIN_B = R_OUT * Math.sin(WIN_HALF);
const ASM_HALF = 6;
const ASM_Z = [60, 114];
const ROD_TIP_REST = 118, ROD_TIP_IN = 72, ROD_STROKE = ROD_TIP_REST - ROD_TIP_IN;
const GLAND_Z = 128;

const cs = Math.cos(VIEW), sn = Math.sin(VIEW);
const vd = [cs, sn];
const pd = [cs, -sn];
const rpvAt = (d, p) => [RPV.x + d * vd[0] + p * pd[0], RPV.y + d * vd[1] + p * pd[1]];
const polarR = (deg, r, z) => [RPV.x + r * Math.cos(deg * DEG), RPV.y + r * Math.sin(deg * DEG), z];

const ASM = [];
for (const gx of [-13.5, 0, 13.5]) for (const gy of [-13.5, 0, 13.5]) ASM.push({ gx, gy, at: [RPV.x + gx, RPV.y + gy] });
const RODS = [[-13.5, 0], [0, 0], [13.5, 0]].map(([gx, gy]) => [RPV.x + gx, RPV.y + gy]);
const GUIDES = [rpvAt(-14, -20), rpvAt(-14, 20)];

const SG = { x: 150, y: 25 };
const SG_R = 30;
const PUMP = { x: 25, y: 75 };
const PZR = { x: -238, y: 35 };
const PANEL = { x: 44, y: 84, w: 96, d: 40, r: 3 };
const PANEL_H = 8;
const BOARD = { x: 52, y: 86, w: 72, d: 6, r: 2 };
const BOARD_TOP = 40;

const FIT_PTS = [
  ...k.boxCorners(FLOOR, -24, 0),
  [RPV.x, RPV.y, 214],
  [SG.x + SG_R, SG.y + SG_R, 259],
  [241, 25, 259],
  [PZR.x, PZR.y, 156],
  [PUMP.x, PUMP.y, 146],
];
const _unit = { origin: [0, 0], scale: 1, azimuth: AZIMUTH, elevation: ELEVATION };
for (const pt of FIT_PTS) { const f = k.iso(pt, _unit); if (!Number.isFinite(f[0]) || !Number.isFinite(f[1])) console.error('BAD PT', JSON.stringify(pt), JSON.stringify(f)); }
const P = k.fitProjection(FIT_PTS, W, H, { pad: 22, azimuth: AZIMUTH, elevation: ELEVATION });

const V = G.viewOf(P);
const KS = G.scaleOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const Faded = (list, style) => k.fadedSvg(list, style);
const FADE = [0.04, 0.42];

// ---------------------------------------------------------------- recorder + helpers
const CABLE_SHELLS = [];
const R = A.recorder(P);
const { items, nameFor } = R;
const record = R.solid;
function put(piece, ref, svg, { bias = 0, name, shapes = [], front = false, move, ...extra } = {}) {
  R.put({ piece, at: ref, bias, svg, move: move ?? [0, 0, 0], shapes, front, name: name ?? nameFor(`${piece}.item`), ...extra });
}
function turned(piece, F, profile, style = {}, { inner = "", extra = "", bias = 0, name, smooth, steps, bevel = 0, front = false } = {}) {
  const paths = G.solidOf(profile, F, P, { bevel, ...(smooth ? { smooth } : {}), ...(steps ? { steps } : {}) });
  const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
  const id = nameFor(name ?? `${piece}.turned`);
  const shape = record(A.solid(F, profile, { name: id }));
  put(piece, G.add3(F.o, G.mul3(F.a, mid)), S(paths, { tone: "hi", ...style, inner: inner ? Ln(inner, { tone: "faint" }) : "" }) + extra, { bias, name: id, shapes: [shape], front });
  return shape;
}
function band(piece, F, s0, s1, r, style = {}, options = {}) {
  return turned(piece, F, [[s0, r], [s1, r]], style, options);
}
function ringBand(piece, F, s0, s1, rIn, rOut, style = {}, { name, bias = 0 } = {}) {
  const id = nameFor(name ?? `${piece}.ringband`);
  const { extra = "", ...rest } = style;
  put(piece, G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), S(G.ringBand(s0, s1, rIn, rOut, F, P), { tone: "hi", ...rest }) + extra, { bias, name: id, shapes: [record(A.ring(F, s0, s1, rIn, rOut, { name: id }))] });
}
function flangeAt(piece, centre, axis, r, thick, { bolts = 8, tone = "hi", bias = 0, name } = {}) {
  const F = G.frameAlong(centre, axis);
  const id = nameFor(name ?? `${piece}.flange`);
  const faces = [];
  const towards = G.dot3(F.a, V) > 0 ? thick / 2 : -thick / 2;
  if (Math.abs(G.dot3(F.a, V)) > 0.12 && bolts) faces.push(Dots(G.dotsOf(F, towards, r * 0.72, bolts, P, { all: true }), { size: 0.42, tone: "mid" }));
  const shape = record(A.disc(F, -thick / 2, thick / 2, r, { name: id }));
  put(piece, centre, S(G.disc(-thick / 2, thick / 2, r, F, P), { tone }) + faces.join(""), { bias, name: id, shapes: [shape] });
  return shape;
}
function boxAt(piece, plan, z, h, style = {}, { extra = "", bias = 0, bevel = 0.5, steps = 3, name } = {}) {
  const centre = [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2];
  const id = nameFor(name ?? `${piece}.box`);
  const shape = record(A.slab(plan, z, h, { name: id }, steps));
  put(piece, centre, S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "hi", ...style }) + extra, { bias, name: id, shapes: [shape] });
  return shape;
}
function valveBody(piece, F, poly, { name, bias = 0, tone = "mid" } = {}) {
  const id = nameFor(name ?? `${piece}.valvebody`);
  const shape = record(A.body(F, poly, { name: id }));
  put(piece, G.add3(F.o, G.mul3(F.a, (poly[0][0] + poly[poly.length - 1][0]) / 2)), S(G.lathe(poly, F, P, { steps: 28 }), { tone }), { bias, name: id, shapes: [shape] });
  return shape;
}
function ballAt(piece, centre, r, { tone = "hi", bias = 0, name, owner } = {}) {
  const id = nameFor(name ?? `${piece}.ball`);
  put(piece, centre, S(G.sphereOf(centre, r, P, { steps: G.stepsFor(r, 32) }), { tone }), { bias, name: id, shapes: [record(A.ball(centre, r, { name: id, owner }))] });
}
function bossAt(piece, centre, outward, r, length, { tone = "hi", bias = 0.1, name, ring = true } = {}) {
  const F = G.frameAlong(centre, outward);
  const id = nameFor(name ?? `${piece}.boss`);
  const shape = record(A.disc(F, 0, length, r, { name: id }));
  put(piece, G.add3(centre, G.mul3(F.a, length / 2)), S(G.disc(0, length, r, F, P), { tone }) +
    (ring && G.dot3(F.a, V) > 0.15 ? Ln(G.circleOf(F, length, r * 0.55, P, 16), { tone: "faint" }) : ""),
    { bias, name: id, shapes: [shape] });
  shape.point = G.add3(centre, G.mul3(F.a, length));
  return shape;
}
function cableAt(piece, points, { r = 0.62, bend = 5, name, shells = [false, false], clamps = [], touch } = {}) {
  const route = G.fillet(points, bend, 12, { P, tube: r });
  const total = G.pathLength(route);
  const SHELL = 2.0;
  const gaps = [
    ...clamps.flatMap(({ centre, axis, radius }) => crossingsOf(route, centre, axis, radius).map((hit) => [hit - 0.95, hit + 0.95])),
    ...(shells[0] ? [[0, SHELL]] : []),
    ...(shells[1] ? [[total - SHELL, total]] : []),
  ];
  const id = nameFor(name ?? `${piece}.cable`);
  const cableShape = { seated: [], cut: [] };
  R.route(id, route, r, { owner: id, touch, gaps, limp: true, piece, rims: shells.map((on) => (on ? r * 2 : r)) });
  tubePieces(route, r, P, { maxLength: 14, spacing: 1, gaps }).forEach((part, index) =>
    put(piece, part.mid, tubeSvg(part, { tone: "mid" }), { bias: 0.2, name: `${id}:${index}`, shapes: [record(A.tube(part.points, part.radii, { name: `${id}:${index}`, owner: id, limp: true }))], chunk: index, route: id }));
  [0, 1].forEach((endIndex) => {
    const end = endIndex ? route[route.length - 1] : route[0];
    if (!shells[endIndex]) {
      put(piece, end, Dots([at(end)], { size: 0.5, tone: "hi" }), { bias: 0.35, name: `${id}.end`, shapes: [record(A.ball(end, 0.5 / KS, { name: `${id}.end` }))] });
      return;
    }
    const tangent = G.tangentAlong(route, endIndex ? total : 0);
    const F = G.frameAlong(end, tangent);
    const [s0, s1] = endIndex ? [-SHELL, 0] : [0, SHELL];
    const centre = G.add3(end, G.mul3(tangent, (s0 + s1) / 2));
    const shellShape = record(A.disc(F, s0, s1, r * 2, { name: `${id}.shell`, owner: id, piece: "panel" }));
    put(piece, centre, S(G.disc(s0, s1, r * 2, F, P, { bevel: 0.25 }), { tone: "mid" }), { bias: 0.3, name: `${id}.shell`, shapes: [shellShape] });
    cableShape.seated.push(shellShape);
  });
  CABLE_SHELLS.push(...cableShape.seated);
  return route;
}
function clampAt(piece, centre, axis, r, name) {
  const F = G.frameAlong(centre, axis);
  const id = nameFor(name ?? `${piece}.clamp`);
  put(piece, centre, S(G.disc(-0.9, 0.9, r, F, P), { tone: "mid" }), { bias: 0.3, name: id, shapes: [record(A.disc(F, -0.9, 0.9, r, { name: id, anchor: false, fitting: true }))] });
}
function tubeItems(piece, route, r, { name, tone = "hi", bias = 0, maxLength = 24, spacing, closed = false, breaks = [], gaps = [], caps = true, ends = [true, true], rims, flow = false } = {}) {
  const id = nameFor(name ?? `${piece}.tube`);
  R.route(id, route, r, { owner: id, gaps, closed, ends, rims, piece });
  const pieces = tubePieces(route, r, P, { maxLength, spacing: spacing ?? Math.max(0.8, Math.min(2.4, r * 0.18)), closed, breaks, gaps, caps });
  pieces.forEach((part, index) => {
    let svg = tubeSvg(part, { tone });
    if (flow) {
      const d = part.points.map((p) => at(p)).map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
      svg += `<path class="iso-line" data-tone="hi" data-flow="" d="${d}" style="stroke-dasharray:2 6;animation-delay:${(-part.from / 5).toFixed(2)}s"/>`;
    }
    put(piece, part.mid, svg, { bias, name: `${id}:${index}`, shapes: [record(A.tube(part.points, part.radii, { name: `${id}:${index}`, owner: id }))], chunk: index, route: id });
  });
  return { id, route, pieces, total: G.pathLength(route) };
}
function valveOn(piece, line, along, r, { owner, tone = "hi" } = {}) {
  const centre = G.pointAlong(line, along);
  const tangent = G.tangentAlong(line, along);
  const F = G.frameAlong(centre, tangent);
  const body = r * 1.85;
  const crown = body * 1.08;
  const bulge = (x) => r * 1.45 + (crown - r * 1.45) * Math.sqrt(Math.max(0, 1 - (x / (r * 1.6)) ** 2));
  const bulgeSlope = (x) => {
    if (Math.abs(x) >= r * 1.6 - 1e-9) return 0;
    const t = Math.max(-0.995, Math.min(0.995, x / (r * 1.6)));
    return (-(crown - r * 1.45) * t) / (r * 1.6 * Math.sqrt(1 - t * t));
  };
  const meridian = [
    [-r * 2.4, 0], [-r * 2.4, r * 1.45],
    ...Array.from({ length: 17 }, (_, i) => { const x = r * 1.6 * Math.sin(((i - 8) / 8) * (Math.PI / 2)); return [x, bulge(x), i && i < 16 ? 1 : 0]; }),
    [r * 2.4, r * 1.45], [r * 2.4, 0],
  ];
  const id = nameFor(`${owner}.valve`);
  put(piece, centre, S(G.lathe(meridian, F, P, { steps: 36, smooth: { slope: bulgeSlope, rows: 3 } }), { tone }) +
    Dots([...G.dotsOf(F, -r * 2.4, r * 1.2, 8, P, { all: true }), ...G.dotsOf(F, r * 2.4, r * 1.2, 8, P, { all: true })].filter((_, i) => i % 2 === 0), { size: 0.4, tone: "mid" }),
    { name: id, shapes: [record(A.body(F, meridian, { name: id, owner }))] });
  const NF = G.frameAlong(centre, [0, 0, 1]);
  const s0 = body * 1.08 - 0.25, s1 = body * 1.08 + body * 0.45;
  put(piece, G.add3(centre, [0, 0, (s0 + s1) / 2]), S(G.disc(s0, s1, r * 0.5, NF, P), { tone }), { bias: 0.2, name: `${id}.neck`, shapes: [record(A.disc(NF, s0, s1, r * 0.5, { name: `${id}.neck`, owner }))] });
  const top = G.add3(centre, [0, 0, s1]);
  const plan = { x: top[0] - r * 1.5, y: top[1] - r * 1.5, w: r * 3, d: r * 3, r: 0.8 };
  const lid = top[2] + r * 2.2;
  boxAt(piece, plan, top[2], r * 2.2, { tone }, {
    bias: 0.3, name: `${id}.actuator`,
    extra: Ln(k.planOutline(k.insetPlan(plan, 0.8), lid, P, 2), { tone: "faint" }) + Dots([at([plan.x + 1.2, plan.y + 1.2, lid]), at([plan.x + plan.w - 1.2, plan.y + plan.d - 1.2, lid])], { size: 0.4 }),
  });
}
function pipe(piece, control, r, { bend = 2.4, tone = "hi", flanges = [true, true], flangeR = 1.55, bands = [], valve = null, maxLength = 24, name, flow = false, extraGaps = [], tee = null } = {}) {
  const line = G.fillet(control, Math.max(r * bend, 3), r > 3 ? 24 : 12, { P, tube: r });
  const total = G.pathLength(line);
  const collars = [];
  [[0, -1], [total, 1]].forEach(([along, sign], index) => {
    if (!flanges[index]) return;
    const thick = Math.max(0.9, r * 0.55);
    const tangent = G.tangentAlong(line, along);
    collars.push({ centre: G.add3(G.pointAlong(line, along), G.mul3(tangent, (-sign * thick) / 2)), tangent, radius: r * (Array.isArray(flangeR) ? flangeR[index] : flangeR), thick, gap: sign < 0 ? [0, thick] : [total - thick, total] });
  });
  const ring = (along, radius, thick) => collars.push({ centre: G.pointAlong(line, along), tangent: G.tangentAlong(line, along), radius, thick, gap: [along - thick / 2, along + thick / 2] });
  for (const share of bands) ring(total * share, r * 1.18, Math.max(0.8, r * 0.7));
  const gaps = [...collars.map(({ gap }) => gap), ...extraGaps];
  if (valve) {
    const along = typeof valve.near === "object" ? nearestAlong(line, valve.near).along : (valve[0] > 1 ? valve[0] : total * valve[0]);
    const vr = valve[1] ?? valve.r;
    gaps.push([along - vr * 2.4, along + vr * 2.4]);
  }
  const flanged = flanges.map((f, i) => (f ? r * (Array.isArray(flangeR) ? flangeR[i] : flangeR) : 0));
  const owner = tubeItems(piece, line, r, { name: name ?? `${piece}.pipe`, tone, bias: 0.15, maxLength, gaps, flow, rims: flanged.map((fr, i) => fr || r) });
  for (const { centre, tangent, radius, thick } of collars)
    flangeAt(piece, centre, tangent, radius, thick, { bolts: r > 3 ? 8 : 0, tone, bias: 0.2, name: `${owner.id}.flange` });
  if (valve) {
    const along = typeof valve.near === "object" ? nearestAlong(line, valve.near).along : (valve[0] > 1 ? valve[0] : total * valve[0]);
    valveOn(piece, line, along, valve[1] ?? valve.r, { owner: owner.id });
  }
  if (tee) ballAt(piece, tee.centre, tee.ball, { name: `${owner.id}.tee`, owner: owner.id, bias: -14 });
  return owner;
}
const nearestAlong = (line, point) => {
  let best = { along: 0, dist: 1e9 };
  const total = G.pathLength(line);
  for (let s = 0; s <= total; s += 0.4) {
    const d = G.len3(G.sub3(G.pointAlong(line, s), point));
    if (d < best.dist) best = { along: s, dist: d };
  }
  return best;
};
const arcAround = (centre, r, a0, a1, z, step = 13) => {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (a0 + ((a1 - a0) * i) / n) * DEG;
    return [centre[0] + r * Math.cos(a), centre[1] + r * Math.sin(a), z];
  });
};

// ================================================================= STAND
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(FLOOR, -24, 24, P)}"/>`);
const FEET = [...k.corners(FLOOR, 26), [FLOOR.x + FLOOR.w / 2, FLOOR.y + 16], [FLOOR.x + FLOOR.w / 2, FLOOR.y + FLOOR.d - 16]]
  .sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
for (const [x, y] of FEET) {
  back.push(S(k.cylinder(x, y, 9, -24, 2, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 6.8, -22, 10, P, 28), { tone: "mid" }));
}
back.push(S(k.slabOf(FLOOR, -12, 12, P, 8, 1.6), { tone: "mid" }));
record(A.slab(FLOOR, -12, 12, { name: "stand.floor", ground: true }, 8));
back.push(Ln(k.planOutline(k.insetPlan(FLOOR, 7), 0, P), { tone: "lo" }));
const FSCREWS = k.corners(FLOOR, 13);
back.push(Ln(FSCREWS.map(([x, y]) => k.ring(x, y, 2.6, 0, P, 16)).join(""), { tone: "lo" }));
back.push(Dots(FSCREWS.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

const LABEL = { x: -256, y: 112, w: 42, d: 18, r: 1.5 };
back.push(S(k.slabOf(LABEL, 0, 1, P, 3), { tone: "mid" }));
back.push(Ln(k.planOutline(k.insetPlan(LABEL, 1.8), 1, P), { tone: "faint" }));
back.push(k.faceTextSvg(k.topMatrix([LABEL.x + LABEL.w / 2, LABEL.y + 6.8], 1, P, "x"), "PWR TEACHING RIG", { size: 3.2, tone: "lo", anchor: "middle" }));
back.push(Ln([0, 1].map((row) => k.onTop([[LABEL.x + 6, LABEL.y + 11.6 + row * 2.6], [LABEL.x + (row ? 25 : 36), LABEL.y + 11.6 + row * 2.6]], 1, P)).join(""), { tone: "lo", free: true }));
back.push(Dots([at([LABEL.x + 2.6, LABEL.y + 2.6, 1]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d - 2.6, 1])], { size: 0.45 }));

const STRIP = { x: -215, y: 130, w: 465, d: 8, r: 1 };
const S0X = -210, S_PER_X = 450 / 60;
const tX = (t) => S0X + t * S_PER_X;
back.push(S(k.slabOf(STRIP, 0, 1.4, P, 3, 0.4), { tone: "mid", crease: "lo" }));
{
  const minor = [], major = [];
  for (let t = 0; t <= 60; t += 2) {
    const tick = k.topTicks(tX(t) - 0.01, tX(t) + 0.01, 0.02, 1, STRIP.y + 1, 0.8, t % 10 ? [2.2, 2.2] : [3.8, 3.8], P, "y");
    (t % 10 ? minor : major).push(tick.minor);
  }
  back.push(Ln(minor.join(""), { tone: "mid" }), Ln(major.join(""), { tone: "hi" }));
  back.push(k.faceTextSvg(k.topMatrix([tX(0) + 8, STRIP.y + 6.2], 0.8, P, "x"), "0 s", { size: 2.6, tone: "lo" }));
  back.push(k.faceTextSvg(k.topMatrix([tX(30), STRIP.y + 6.8], 0.8, P, "x"), "seconds after SCRAM", { size: 2.8, tone: "lo", anchor: "middle" }));
  back.push(Dots([at([STRIP.x + 2.2, STRIP.y + 4, 0.8]), at([STRIP.x + STRIP.w - 2.2, STRIP.y + 4, 0.8])], { size: 0.45 }));
}
const CURSOR = { w: 7, d: 5, h: 3 };
const cursorPlan = { x: tX(0) - CURSOR.w / 2, y: STRIP.y + STRIP.d + 1.5, w: CURSOR.w, d: CURSOR.d, r: 1 };
put("panel", [tX(0), STRIP.y + STRIP.d + 4, 1.5],
  `<g data-live="cursor">` + S(k.slabOf(cursorPlan, 0, CURSOR.h, P, 2, 0.4), { tone: "hi", lit: true }) +
  Ln(k.lineOnTop([tX(0), STRIP.y + STRIP.d + 1.5], [tX(0), STRIP.y + STRIP.d + 1.5 + CURSOR.d], CURSOR.h, P), { tone: "hi", free: true }) + `</g>`,
  { name: nameFor("panel.cursor"), shapes: [record(A.slab(cursorPlan, 0, CURSOR.h, { name: "panel.cursor" }, 2))] });

// ================================================================= RPV
const RF = G.frameOf([RPV.x, RPV.y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const farRef = (z) => [RPV.x - vd[0] * 30, RPV.y - vd[1] * 30, z];

const bh = (s) => 46 * Math.sin(((s - 34) / 22) * (Math.PI / 2));
const bhSlope = (s) => ((46 * Math.PI) / 44) * Math.cos(((s - 34) / 22) * (Math.PI / 2));
const SKIRT_SHAPE = turned("rpv", RF, [[0, 18], [8, 19, 1], [30, 27, 1], [40, 27], [40, 0]], { tone: "mid" }, { name: "rpv.skirt", inner: G.arcOf(RF, 8, 19, P) + G.arcOf(RF, 26, 26, P) });
turned("rpv", RF, [[34, 0], [40, bh(40), 1], [48, bh(48), 1], [54, bh(54), 1], [56, 46]], { smooth: { slope: bhSlope, rows: 4 } }, { name: "rpv.headbot", inner: G.arcOf(RF, 45, bh(45), P, { slope: bhSlope(45) }) + G.arcOf(RF, 51, bh(51), P, { slope: bhSlope(51) }) + G.arcOf(RF, 49, bh(49), P, { slope: bhSlope(49) }) });
ringBand("rpv", RF, 56, 60, R_IN, R_OUT, { tone: "mid" }, { name: "rpv.shell-low" });

const wallArc = (rIn, rOut, a0, a1, steps = 40) => {
  const ring = [];
  for (let i = 0; i <= steps; i++) { const a = a0 + ((a1 - a0) * i) / steps; ring.push([RPV.x + Math.cos(a) * rOut, RPV.y + Math.sin(a) * rOut]); }
  for (let i = steps; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / steps; ring.push([RPV.x + Math.cos(a) * rIn, RPV.y + Math.sin(a) * rIn]); }
  return ring;
};
const A0 = (VIEW + WIN_HALF) / DEG;
const A1 = (VIEW - WIN_HALF) / DEG + 360;
{
  const z0 = Z_WIN[0], h = Z_WIN[1] - Z_WIN[0];
  const ring = wallArc(R_IN, R_OUT, 130 * DEG, 320 * DEG);
  const paths = k.extrude(ring, z0, h, P, { convex: false });
  const seam = [80, 104].map((z) => k.onTop(arcAround([RPV.x, RPV.y], R_IN, 130, 320, z, 10), z, P)).join("");
  const water = k.onTop(
    [...arcAround([RPV.x, RPV.y], R_IN - 0.6, 130, 320, Z_WIN[1], 14), ...arcAround([RPV.x, RPV.y], R_IN - 0.6, 320, 130, Z_WIN[0] + 0.5, 14)],
    Z_WIN[0] + 0.5, P, true);
  const id = nameFor("rpv.farwall");
  put("rpv", farRef(92), S(paths, { tone: "mid", className: "rx-cavity" }) + Ln(seam, { tone: "faint" }) + `<path class="rx-water" d="${water}"/>`, {
    name: id, shapes: [record(A.extruded(ring, z0, h, { name: id }))],
  });
  const armA2 = wallArc(R_IN, R_OUT, A0 * DEG, 130 * DEG);
  const armB2 = wallArc(R_IN, R_OUT, 320 * DEG, A1 * DEG);
  const id4 = nameFor("rpv.farwall-arm");
  put("rpv", farRef(92), S(k.extrude(armA2, z0, h, P, { convex: false })) + S(k.extrude(armB2, z0, h, P, { convex: false }), { tone: "mid", className: "rx-cavity" }), {
    bias: 5, name: id4, shapes: [record(A.extruded(armA2, z0, h, { name: id4 })), record(A.extruded(armB2, z0, h, { name: `${id4}b` }))],
  });
  for (const deg of [135, 315]) {
    const [x, y] = polarR(deg, R_OUT, 0).slice(0, 2);
    put("rpv", [x, y, 92], Ln(k.segment([x, y, Z_WIN[0]], [x, y, Z_WIN[1]], P), { tone: "mid" }), { bias: 3, name: nameFor("rpv.sil"), shapes: [record(A.box([x - 0.3, y - 0.3, Z_WIN[0]], [x + 0.3, y + 0.3, Z_WIN[1]], { name: "rpv.sil" }))] });
  }
  for (const deg of [A0, A1 - 360]) {
    const a = deg * DEG;
    const radial = [Math.cos(a), Math.sin(a), 0];
    const corners = [Z_WIN[0], Z_WIN[1]].flatMap((z) => [R_IN, R_OUT].map((r) => [RPV.x + r * Math.cos(a), RPV.y + r * Math.sin(a), z]));
    const quad = [corners[0], corners[1], corners[3], corners[2]];
    const pts = quad.map((p) => at(p));
    const centre = [(quad[0][0] + quad[3][0]) / 2, (quad[0][1] + quad[3][1]) / 2, (Z_WIN[0] + Z_WIN[1]) / 2];
    const id2 = nameFor("rpv.cutface");
    put("rpv", centre, `<path class="iso-fill rx-cutface" d="${pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("")}Z"/>` +
      Ln(k.segment(quad[0], quad[2], P) + k.segment(quad[1], quad[3], P), { tone: "lo" }), {
      bias: 0.5, name: id2, front: true,
      shapes: [record(A.orientedBox(centre, [radial, [-Math.sin(a), Math.cos(a), 0], [0, 0, 1]], [(R_OUT - R_IN) / 2, 0.06, (Z_WIN[1] - Z_WIN[0]) / 2], { name: id2 }))],
    });
  }
}
ringBand("rpv", RF, 124, 128, 41, 48.5, {}, { name: "rpv.flange-seat" });
ringBand("rpv", RF, Z_FLANGE[0], Z_FLANGE[1], 41, 52, { extra: Dots(G.dotsOf(RF, Z_FLANGE[1], 49, 20, P, { all: true, fade: FADE }), { size: 0.4, tone: "mid" }) }, { name: "rpv.flange", bias: 0.1 });
const dome = (s) => 46 * Math.cos(((s - 142) / 22) * (Math.PI / 2));
const domeSlope = (s) => (-(46 * Math.PI) / 44) * Math.sin(((s - 142) / 22) * (Math.PI / 2));
turned("rpv", RF, [[142, 46], [145.5, dome(145.5), 1], [149, dome(149), 1], [152.5, dome(152.5), 1], [156, dome(156), 1], [159.5, dome(159.5), 1], [162.5, dome(162.5), 1], [164, 0]], { smooth: { slope: domeSlope, rows: 4 } }, { name: "rpv.head", inner: G.arcOf(RF, 150, dome(150), P, { slope: domeSlope(150) }) + G.arcOf(RF, 158, dome(158), P, { slope: domeSlope(158) }) });
for (let i = 0; i < 14; i++) {
  const deg = (i / 14) * 360 + 12;
  const rel = (((deg - 45) % 360) + 540) % 360 - 180;
  if (Math.abs(rel) < 52) continue;
  const [x, y] = polarR(deg, 49.5, 0).slice(0, 2);
  turned("rpv", G.frameAlong([x, y, Z_FLANGE[1]], [0, 0, 1]), [[0, 2.1], [10, 2.1]], { tone: "mid", crease: "lo" }, { name: "rpv.stud", bias: 0.3 });
  turned("rpv", G.frameAlong([x, y, Z_FLANGE[1] + 10], [0, 0, 1]), [[0, 3.1], [2.6, 3.1], [2.6, 0]], { tone: "mid" }, { name: "rpv.stud-nut", bias: 0.4 });
}
for (const [deg, who] of [[205, "hot"], [-15, "cold"]]) {
  const a = deg * DEG;
  bossAt("rpv", polarR(deg, R_OUT, NOZ_Z), [Math.cos(a), Math.sin(a), 0], 7.2, 6, { name: `rpv.nozzle-${who}` }).owner = "rpv";
  flangeAt("rpv", polarR(deg, 52 + 1.3, NOZ_Z), [Math.cos(a), Math.sin(a), 0], 8.6, 2.6, { name: `rpv.nozzle-flange-${who}`, bias: 0.2 }).owner = "rpv";
}

// ================================================================= core internals
const PLATE_SHAPE = turned("rpv", RF, [[Z_PLATE[0], 0], [52, 20, 1], [57, 34, 1], [60, 41], [60, 0]], { tone: "mid", className: "rx-cavity" }, { name: "rpv.plate" });
const HEADBOT_SHAPE = R.solids.find((s) => s.name === "rpv.headbot");
PLATE_SHAPE.seated = true; PLATE_SHAPE.cut = [HEADBOT_SHAPE];
HEADBOT_SHAPE.seated = true; HEADBOT_SHAPE.cut = [SKIRT_SHAPE];
{
  const z0 = Z_BARREL[0], h = Z_BARREL[1] - Z_BARREL[0];
  const backRing = wallArc(34, 36.5, 130 * DEG, 320 * DEG);
  const id = nameFor("rpv.barrel");
  put("rpv", farRef(89), S(k.extrude(backRing, z0, h, P, { convex: false }), { tone: "mid", className: "rx-cavity" }), { bias: 2.5, name: id, shapes: [record(A.extruded(backRing, z0, h, { name: id }))] });
  const armA = wallArc(34, 36.5, A0 * DEG, 130 * DEG);
  const armB = wallArc(34, 36.5, 320 * DEG, A1 * DEG);
  const id2 = nameFor("rpv.barrel-arm");
  put("rpv", farRef(89), S(k.extrude(armA, z0, h, P, { convex: false })) + S(k.extrude(armB, z0, h, P, { convex: false }), { tone: "mid", className: "rx-cavity" }), { bias: -2, name: id2, shapes: [record(A.extruded(armA, z0, h, { name: id2 })), record(A.extruded(armB, z0, h, { name: `${id2}b` }))] });
  for (const deg of [135, 315]) {
    const [x, y] = polarR(deg, 36.5, 0).slice(0, 2);
    put("rpv", [x, y, 89], Ln(k.segment([x, y, Z_BARREL[0]], [x, y, Z_BARREL[1]], P), { tone: "mid" }), { bias: 3.2, name: nameFor("rpv.barrel-sil"), shapes: [record(A.box([x - 0.3, y - 0.3, Z_BARREL[0]], [x + 0.3, y + 0.3, Z_BARREL[1]], { name: "rpv.barrel-sil" }))] });
  }
  for (const deg of [A0, A1 - 360]) {
    const a = deg * DEG;
    const radial = [Math.cos(a), Math.sin(a), 0];
    const corners = [Z_BARREL[0], Z_BARREL[1]].flatMap((z) => [34, 36.5].map((r) => [RPV.x + r * Math.cos(a), RPV.y + r * Math.sin(a), z]));
    const quad = [corners[0], corners[1], corners[3], corners[2]];
    const pts = quad.map((p) => at(p));
    const centre = [(quad[0][0] + quad[3][0]) / 2, (quad[0][1] + quad[3][1]) / 2, (Z_BARREL[0] + Z_BARREL[1]) / 2];
    const id2 = nameFor("rpv.barrel-cut");
    put("rpv", centre, `<path class="iso-fill rx-cutface" d="${pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("")}Z"/>` +
      Ln(k.segment(quad[0], quad[2], P) + k.segment(quad[1], quad[3], P), { tone: "lo" }), {
      bias: 0.55, name: id2, front: true,
      shapes: [record(A.orientedBox(centre, [radial, [-Math.sin(a), Math.cos(a), 0], [0, 0, 1]], [1.25, 0.05, (Z_BARREL[1] - Z_BARREL[0]) / 2], { name: id2 }))],
    });
  }
}
for (const { gx, at: c } of ASM) {
  const plan = { x: c[0] - ASM_HALF, y: c[1] - ASM_HALF, w: ASM_HALF * 2, d: ASM_HALF * 2, r: 1.5 };
  boxAt("core", plan, ASM_Z[0], ASM_Z[1] - ASM_Z[0], { tone: "mid", className: "rx-cavity rx-asm" }, {
    bias: gx > 0 ? 0.4 : 0,
    extra: Ln(k.planOutline(k.insetPlan(plan, 1.6), ASM_Z[1], P, 2), { tone: "lo" }) +
      Dots(k.dotGrid(c[0] - 3.9, c[1] - 3.9, 4, 4, 2.6, ASM_Z[1], P), { size: 0.5, tone: "lo" }),
    name: nameFor("core.assembly"),
  });
}
for (const [x, y] of RODS) {
  put("core", [x, y, ASM_Z[1]], Ln(k.ring(x, y, 2.6, ASM_Z[1], P, 16), { tone: "lo" }), { bias: 0.2, name: nameFor("core.thimble"), shapes: [record(A.cylinder(x, y, 2.6, ASM_Z[1], 0.4, { name: "core.thimble" }))] });
}
for (const [x, y] of GUIDES) {
  const GF = G.frameAlong([x, y, Z_PLATE[1]], [0, 0, 1]);
  turned("core", GF, [[0, 3.2], [2, 3.2], [62, 3.2], [64, 2.6], [64, 0]], { tone: "mid", className: "rx-cavity" }, { name: "core.guide", bias: 0.1, inner: [30, 60].map((z) => G.arcOf(GF, z, 3.2, P)).join(""), front: true });
  const upShape = turned("core", G.frameAlong([x, y, Z_WIN[1]], [0, 0, 1]), [[0, 2.6], [2, 3.2], [30, 3.2], [32, 2.6], [32, 0]], { tone: "mid", className: "rx-cavity" }, { name: "core.guide-upper", bias: -1, inner: [14, 26].map((z) => G.arcOf(G.frameAlong([x, y, Z_WIN[1]], [0, 0, 1]), z, 3.2, P)).join("") });
  upShape.seated = true; upShape.cut = R.solids.filter((s) => s.name === "rpv.head");
}
const rodEls = [];
RODS.forEach(([x, y], index) => {
  const F = G.frameOf([x, y, GLAND_Z], [0, 0, -1], [1, 0, 0], [0, 1, 0]);
  const rod = G.rodOut(F, 0, GLAND_Z - ROD_TIP_REST, 2.1, P, { stroke: ROD_STROKE });
  const id = nameFor("rods.rod");
  const clipId = `rx-rodclip-${index}`;
  const svg = `<clipPath id="${clipId}"><path data-hold d="${rod.clip}"/></clipPath>` +
    `<g clip-path="url(#${clipId})">${S(rod.paths, { tone: "hi", lit: true })}</g>` +
    Ln(G.circleOf(F, 0, 2.6, P, 16), { tone: "lo" });
  put("rods", [x, y, (GLAND_Z + ROD_TIP_REST) / 2], svg, { bias: 0.6, name: id, front: true, shapes: [record(A.slide(F, 0, GLAND_Z - ROD_TIP_REST, 2.1, { name: id }))], move: [0, 0, -ROD_STROKE] });
  rodEls.push(id);
});
const HEAD_SHAPE = R.solids.find((s) => s.name === "rpv.head");
for (const [x, y] of [...RODS, [RPV.x + 7, RPV.y + 13]]) {
  const domeZ = 142 + 22 * Math.sqrt(Math.max(0, 1 - (Math.hypot(x - RPV.x, y - RPV.y) / 46) ** 2));
  const HF = G.frameAlong([x, y, domeZ - 3], [0, 0, 1]);
  const shape = turned("rpv", HF, [[0, 6], [0.5, 6.4], [4.5, 6.4], [4.5, 4.5], [40.5, 4.5], [40.5, 4.8], [43, 4.8], [43, 0]], { tone: "mid" }, { name: "rpv.crdm", bias: 0.8 });
  shape.seated = true; shape.cut = [HEAD_SHAPE];
}

// ================================================================= primary loop
const HOT_START = polarR(205, 54.6, NOZ_Z);
const ARC94 = arcAround([RPV.x, RPV.y], 66, 205, 245, NOZ_Z);
const ARC76 = arcAround([RPV.x, RPV.y], 66, 245, 270, 76).slice(1);
const SG_HOT_FACE = [SG.x + 36.6 * Math.cos(210 * DEG), SG.y + 36.6 * Math.sin(210 * DEG), 76];
const TEE_AT = polarR(225, 66, NOZ_Z);
const TEE_BALL = 8.2;
{
  const pre = G.fillet([HOT_START, ...ARC94, ...ARC76, [-80, -81, 76], [-80, 1.5, 76], [SG.x + 48.6 * Math.cos(210 * DEG), SG.y + 48.6 * Math.sin(210 * DEG), 76], SG_HOT_FACE], 12.1, 24, { P, tube: 5.5 });
  const hit = nearestAlong(pre, TEE_AT);
  const half = Math.sqrt(Math.max(0, TEE_BALL ** 2 - 5.5 ** 2)) + 0.5;
  var HOT = pipe("hotleg", [HOT_START, ...ARC94, ...ARC76, [-80, -81, 76], [-80, 1.5, 76], [SG.x + 48.6 * Math.cos(210 * DEG), SG.y + 48.6 * Math.sin(210 * DEG), 76], SG_HOT_FACE], 5.5, {
    bend: 2.2, flanges: [false, false], maxLength: 20, name: "loop.hotleg", flow: true, rims: [8.6, 7.4],
    extraGaps: [[hit.along - half, hit.along + half]], tee: { centre: TEE_AT, ball: TEE_BALL },
  });
}
// surge line: PZR -> tee ball on the hot leg
{
  const end = [TEE_AT[0], TEE_AT[1], TEE_AT[2] + Math.sqrt(TEE_BALL ** 2 - 1.6 ** 2)];
  var SURGE = pipe("pzr", [[-219.7, 35, 83], [-211, 35, 83], [-211, -40, 104.5], [-201.7, -61.7, 104], end], 1.6, {
    bend: 3, flanges: [false, false], maxLength: 16, name: "loop.surge", rims: [2.6, 2.2], free: [false, true],
  });
}
// cold leg: RPV cold nozzle (-15 deg) -> pump discharge
const COLD_START = polarR(-15, 54.6, NOZ_Z);
pipe("coldleg", [COLD_START, polarR(-15, 66, NOZ_Z), [-30, -32.1, 94], [-30, 75, 94], [-30, 75, 76], [-3.8, 75, 76]], 5.5, {
  bend: 2.2, flanges: [false, false], maxLength: 20, name: "loop.coldleg", flow: true, rims: [8.6, 7],
});
// crossover: SG suction nozzle (160 deg) -> pump suction
pipe("crossover", [[SG.x + 36.6 * Math.cos(160 * DEG), SG.y + 36.6 * Math.sin(160 * DEG), 76], [SG.x + 48.6 * Math.cos(160 * DEG), SG.y + 48.6 * Math.sin(160 * DEG), 76], [72, 41.1, 76], [72, 75, 76], [53.6, 75, 76]], 5.5, {
  bend: 2.2, flanges: [false, false], maxLength: 20, name: "loop.crossover", flow: true, rims: [7.4, 7],
});

// ================================================================= steam generator
const SF = G.frameOf([SG.x, SG.y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
turned("sg", SF, [[0, 10], [6, 10.5, 1], [54, 15, 1], [62.2, 16], [62.2, 0]], { tone: "mid" }, { name: "sg.skirt" });
const sh = (s) => 30 * Math.sin(((s - 62) / 26) * (Math.PI / 2));
const shSlope = (s) => ((30 * Math.PI) / 52) * Math.cos(((s - 62) / 26) * (Math.PI / 2));
turned("sg", SF, [[62, 0], [68, sh(68), 1], [76, sh(76), 1], [83, sh(83), 1], [88, 30], [88, 0]], { smooth: { slope: shSlope, rows: 4 } }, { name: "sg.chanhead", inner: G.arcOf(SF, 72, sh(72), P, { slope: shSlope(72) }) + G.arcOf(SF, 80, sh(80), P, { slope: shSlope(80) }) });
ringBand("sg", SF, 88, 90.4, 30, 33, {}, { name: "sg.headflange" });
band("sg", SF, 90.4, 98, 30, {}, { name: "sg.tubesheet", extra: Dots(G.dotsOf(SF, 90.4, 28.4, 24, P, { all: true, fade: FADE }), { size: 0.4, tone: "mid" }) });
band("sg", SF, 98, 138, 30, {}, { name: "sg.shell-a", inner: G.arcOf(SF, 118, 30, P) });
ringBand("sg", SF, 138, 142, 30, 31.2, {}, { name: "sg.girth" });
band("sg", SF, 142, 208, 30, {}, { name: "sg.shell-b", inner: [170, 195].map((z) => G.arcOf(SF, z, 30, P)).join("") });
turned("sg", SF, [[208, 30], [214, 28.5, 1], [221, 24, 1], [227, 14, 1], [232, 0]], { smooth: true }, { name: "sg.dome", inner: G.arcOf(SF, 219, 23.5, P) });
// steam nozzle + flange
turned("sg", G.frameAlong([SG.x, SG.y, 232], [0, 0, 1]), [[0, 8], [6, 8]], { tone: "hi" }, { name: "sg.steam-nozzle" }); flangeAt("sg", [SG.x, SG.y, 239.3], [0, 0, 1], 10.2, 2.6, { name: "sg.steam-flange", bolts: 0 }).owner = "sg";
ringBand("sg", G.frameOf([SG.x, SG.y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]), 238, 240.6, 4.5, 10.2, {}, { name: "sg.steam-flange" });
// channel-head nozzles (hot 210, suction 160)
for (const [deg, who] of [[210, "hot"], [160, "suction"]]) {
  const a = deg * DEG;
  const surface = 30 * Math.sqrt(Math.max(0, 1 - ((76 - 88) / 30) ** 2));
  bossAt("sg", [SG.x + surface * Math.cos(a), SG.y + surface * Math.sin(a), 76], [Math.cos(a), Math.sin(a), 0], 5.6, 6.5, { name: `sg.nozzle-${who}` }).owner = "sg";
  flangeAt("sg", [SG.x + (34 + 1.3) * Math.cos(a), SG.y + (34 + 1.3) * Math.sin(a), 76], [Math.cos(a), Math.sin(a), 0], 7.4, 2.6, { name: `sg.nozzle-flange-${who}`, bias: 0.2 }).owner = "sg";
}
// sight glass on the near side (theta 45)
{
  const a = 45 * DEG;
  const glassC = [SG.x + 33.5 * Math.cos(a), SG.y + 33.5 * Math.sin(a)];
  for (const z of [100, 168]) {
    valveBody("sg", G.frameAlong([glassC[0], glassC[1], z - 3.4], [0, 0, 1]), [[0, 2.2], [0.6, 3.6], [5.4, 3.8], [6.8, 3.2], [6.8, 2.2]], { name: "sg.glass-valve", bias: 0.2 });
  }
  const GLF = G.frameAlong([glassC[0], glassC[1], 103], [0, 0, 1]);
  turned("sg", GLF, [[0, 2.2], [62, 2.2], [63.5, 1.9], [63.5, 0]], { tone: "hi" }, { name: "sg.glass", bias: 0.3, inner: [20, 40].map((s) => G.arcOf(GLF, s, 2.2, P)).join("") });
  const waterPts = [[glassC[0] - 1.5, glassC[1], 103], [glassC[0] + 1.5, glassC[1], 103], [glassC[0] + 1.5, glassC[1], 164], [glassC[0] - 1.5, glassC[1], 164]].map((p) => at(p));
  const waterD = waterPts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("") + "Z";
  const waterShape = record(A.tube([[glassC[0], glassC[1], 103], [glassC[0], glassC[1], 164]], 1.4, { name: "sg.watercol", limp: true }));
  put("sg", [glassC[0], glassC[1], 133], `<path class="rx-water" d="${waterD}"/>`, {
    name: nameFor("sg.watercol"),
    shapes: [waterShape],
  });
}
// steam line
pipe("steam", [[SG.x, SG.y, 240.6], [SG.x, SG.y, 256], [172, 3.4, 256], [201, -24.6, 256]], 4.5, {
  bend: 2.4, flanges: [false, true], flangeR: 1.5, maxLength: 20, name: "loop.steam", flow: true, free: [false, true],
  valve: { near: [181, -5.4, 256], r: 4.5 },
});

// ================================================================= reactor coolant pump
boxAt("pump", { x: 13, y: 63, w: 24, d: 24, r: 2 }, 0, 56, { tone: "mid" }, { name: "pump.pedestal", bevel: 0.8 });
{
  const PF = G.frameOf([PUMP.x, PUMP.y, 56], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  turned("pump", PF, [[0, 16], [2, 16.4, 1], [24, 16.4, 1], [27, 13, 1], [30, 10.4], [30, 0]], { tone: "hi" }, { name: "pump.casing", inner: [8, 18].map((s) => G.arcOf(PF, s, 16.4, P)).join("") });
  // suction boss (east) and discharge boss (west) with flanges
  bossAt("pump", [PUMP.x + 16, PUMP.y, 76], [1, 0, 0], 7, 9.8, { name: "pump.suction-boss" }).owner = "pump";
  flangeAt("pump", [PUMP.x + 27.4, PUMP.y, 76], [1, 0, 0], 7.4, 2.4, { name: "pump.suction-flange", bias: 0.2 }).owner = "pump";
  bossAt("pump", [PUMP.x - 16, PUMP.y, 76], [-1, 0, 0], 7, 10, { name: "pump.discharge-boss" }).owner = "pump";
  flangeAt("pump", [PUMP.x - 27.6, PUMP.y, 76], [-1, 0, 0], 7.4, 2.4, { name: "pump.discharge-flange", bias: 0.2 }).owner = "pump";
  turned("pump", G.frameAlong([PUMP.x, PUMP.y, 86], [0, 0, 1]), [[0, 10], [2, 10.4, 1], [46, 10.4, 1], [48, 9], [50, 9], [50, 0]], { tone: "mid" }, {
    name: "pump.motor", bias: 0.2,
    extra: Faded(G.ribsOf(G.frameAlong([PUMP.x, PUMP.y, 88], [0, 0, 1]), 2, 44, 10.4, 22, P, { fade: [0.1, 0.55], seams: true }), { tone: "faint" }),
    inner: [16, 30].map((s) => G.arcOf(PF, s + 2, 10.4, P)).join(""),
  });
  turned("pump", G.frameAlong([PUMP.x, PUMP.y, 136], [0, 0, 1]), [[0, 9], [2, 8.6, 1], [5, 5.4, 1], [6.4, 0]], { tone: "mid", smooth: true }, { name: "pump.motor-cap", bias: 0.3 });
  const jboxPlan = { x: PUMP.x + 9, y: PUMP.y - 4, w: 7, d: 8, r: 1 };
  const jbox = boxAt("pump", jboxPlan, 118, 10, { tone: "mid" }, { name: "pump.jbox", bias: 0.3, extra: Ln(k.planOutline(k.insetPlan(jboxPlan, 1), 128, P, 2), { tone: "faint" }) });
  const motorShape = R.solids.find((s) => s.name === "pump.motor");
  jbox.seated = true; jbox.cut = [motorShape];
}
// pump power cable down to the panel
cableAt("pump", [
  [37.5, 75, 128],
  [37.5, 75, 146],
  [10, 79, 146],
  [6, 84, 66],
  [6, 92, 14],
  [78.5, 96.5, 14],
  [78.5, 96.5, 13],
], { name: "pump.cable", shells: [true, true], r: 0.66, bend: 7 });
const connPlan = { x: 76, y: 94, w: 5, d: 5, r: 0.8 };
const conn = boxAt("panel", connPlan, 8, 5, { tone: "mid" }, { name: "panel.connector-pump", bias: 0.3, extra: Ln(k.planOutline(k.insetPlan(connPlan, 0.8), 13, P, 2), { tone: "faint" }) });
// wired after the board exists


// ================================================================= pressurizer
const PF2 = G.frameOf([PZR.x, PZR.y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
turned("pzr", PF2, [[0, 8], [6, 9, 1], [34, 11, 1], [40, 11.5], [40, 0]], { tone: "mid" }, { name: "pzr.skirt" });
turned("pzr", PF2, [[40, 0], [43, 6.5, 1], [46, 10.5, 1], [48, 13], [48, 0]], { smooth: true }, { name: "pzr.headbot" });
band("pzr", PF2, 48, 90, 13, {}, { name: "pzr.shell-a", inner: G.arcOf(PF2, 70, 13, P) });
band("pzr", PF2, 90, 130, 13, {}, { name: "pzr.shell-b", inner: [108, 122].map((z) => G.arcOf(PF2, z, 13, P)).join("") });
turned("pzr", PF2, [[130, 13], [133, 12, 1], [137, 8, 1], [140, 0]], { smooth: true }, { name: "pzr.headtop" });
bossAt("pzr", [PZR.x, PZR.y, 140], [0, 0, 1], 3, 4, { name: "pzr.spray" });
turned("pzr", G.frameAlong([PZR.x, PZR.y, 144], [0, 0, 1]), [[0, 3.4], [1, 3.8], [5, 3.8], [6.2, 2.6], [6.2, 0]], { tone: "hi" }, { name: "pzr.relief", bias: 0.2, inner: G.arcOf(G.frameAlong([PZR.x, PZR.y, 144], [0, 0, 1]), 3, 3.8, P) });
pipe("pzr", [[PZR.x, PZR.y, 150.2], [PZR.x, PZR.y, 162], [PZR.x + 12, PZR.y - 12, 162], [PZR.x + 24, PZR.y - 12, 162]], 1.4, { bend: 3, flanges: [false, true], flangeR: 2, maxLength: 16, name: "loop.relief", rims: [2.6, 2.8], free: [false, true] });
bossAt("pzr", [PZR.x + 13 - 0.4, PZR.y, 83], [1, 0, 0], 2.4, 3.5, { name: "pzr.surge-boss" });
flangeAt("pzr", [PZR.x + 17.2, PZR.y, 83], [1, 0, 0], 3, 2.2, { name: "pzr.surge-flange", bias: 0.2 });

// ================================================================= instrument panel
boxAt("panel", PANEL, 0, PANEL_H, { tone: "mid" }, { name: "panel.slab", bevel: 0.8, extra: Ln(k.planOutline(k.insetPlan(PANEL, 4), PANEL_H, P), { tone: "lo" }) + Dots(k.corners(PANEL, 6).map(([x, y]) => at([x, y, PANEL_H])), { size: 0.45 }) });
boxAt("panel", BOARD, PANEL_H, BOARD_TOP - PANEL_H, { tone: "mid" }, {
  name: "panel.board", bevel: 0.6, bias: 0.1,
  extra: Dots([[BOARD.x + 3, BOARD.y + BOARD.d - 3], [BOARD.x + BOARD.w - 3, BOARD.y + BOARD.d - 3]].map(([x, y]) => at([x, y, BOARD_TOP])), { size: 0.45 }),
});
// bar meters engraved on the board face (y = 86 + 6 = 92)
{
  const faceY = BOARD.y + BOARD.d;
  const bars = [
    { x: 58, key: "fission", lo: 0, hi: 100, ticks: [0, 20, 40, 60, 80, 100] },
    { x: 76, key: "decay", lo: 0, hi: 8, ticks: [0, 2, 4, 6, 8] },
  ];
  const slotZ0 = 14, slotZ1 = 34;
  let svg = "";
  const SM = k.sideMatrix([0, faceY], 0, P, "left");
  svg += `<g transform="${SM}">`;
  for (const bar of bars) {
    svg += `<rect class="rx-slot" x="${bar.x}" y="${-slotZ1}" width="9" height="${slotZ1 - slotZ0}" rx="1.6"/>`;
    for (const tv of bar.ticks) {
      const z = slotZ0 + ((slotZ1 - slotZ0) * (tv - bar.lo)) / (bar.hi - bar.lo);
      svg += `<path class="iso-line" data-tone="lo" d="M${bar.x + 9} ${-z}L${bar.x + 12.2} ${-z}"/>`;
    }
    svg += `<rect class="rx-barfill" data-bar="${bar.key}" x="${bar.x + 1.2}" y="${-slotZ0}" width="6.6" height="0"/>`;
  }
  svg += `</g>`;
  svg += k.faceTextSvg(k.sideMatrix([94, faceY], 37.6, P, "left"), "% FULL POWER", { size: 2.8, tone: "lo" });
  const boardShape = R.solids.find((s) => s.name === "panel.board");
  conn.seated = true; conn.cut = [boardShape];
  const barsShape = record(A.box([57, faceY - 0.6, 13], [89, faceY + 0.3, 35], { name: "panel.bars" }));
  barsShape.seated = true; barsShape.cut = [boardShape];
  put("panel", [82, faceY, 24], svg, { bias: 0.2, name: nameFor("panel.bars"), shapes: [barsShape] });
}
// two dial gauges
const GAUGES = [
  { x: 66, y: 108, r: 12, from: 135, span: 270, key: "power", max: 100, label: "thermal power" },
  { x: 94, y: 108, r: 12, from: 135, span: 270, key: "temp", lo: 280, hi: 340, label: "core outlet" },
];
const needleBase = {};
for (const g of GAUGES) {
  const out = [];
  out.push(S(k.cylinder(g.x, g.y, g.r, PANEL_H, 4.6, P, 56, 0.8), { tone: "hi", crease: "lo" }));
  out.push(Ln(k.knurl(g.x, g.y, g.r, PANEL_H + 1.6, PANEL_H + 4.6, 72, P, 0.3), { tone: "lo" }));
  out.push(Ln(k.sideArc(g.x, g.y, g.r, PANEL_H + 1.6, P, 40), { tone: "faint" }));
  out.push(Ln(k.ring(g.x, g.y, g.r - 2, PANEL_H + 4.6, P, 56), { tone: "lo" }));
  const ticks = k.radialTicks(g.x, g.y, g.r - 3, 42, 7, PANEL_H + 4.6, [1.2, 2.6], P, g.from * DEG, g.span * DEG);
  out.push(Ln(ticks.minor, { tone: "lo" }), Ln(ticks.major, { tone: "mid" }));
  out.push(Ln(k.ring(g.x, g.y, 1.6, PANEL_H + 4.6, P, 16), { tone: "mid" }));
  put(g.key === "power" ? "panel" : "panel", [g.x, g.y, PANEL_H + 2.3], out.join(""), { name: nameFor(`panel.gauge-${g.key}`), shapes: [record(A.cylinder(g.x, g.y, g.r, PANEL_H, 4.6, { name: `panel.gauge-${g.key}` }))] });
  needleBase[g.key] = { x: g.x, y: g.y, top: PANEL_H + 4.6, r: g.r, from: g.from, span: g.span, lo: g.lo ?? 0, hi: g.max ?? g.hi };
  const angle = g.from * DEG;
  const d = k.lineOnTop([g.x - Math.sin(angle) * 3.2, g.y + Math.cos(angle) * 3.2], [g.x + Math.sin(angle) * (g.r - 3.6), g.y - Math.cos(angle) * (g.r - 3.6)], PANEL_H + 4.8, P);
  put("panel", [g.x, g.y, PANEL_H + 4.8], `<path class="iso-line" data-tone="lit" data-free="" data-live="needle-${g.key}" d="${d}" style="stroke-width:1.1"/>`, { bias: 0.5, name: nameFor(`panel.needle-${g.key}`), shapes: [record(A.cylinder(g.x, g.y, g.r - 3.6, PANEL_H + 4.55, 0.3, { name: `panel.needle-${g.key}` }))] });
}
// SCRAM push button
{
  const bx = 120, by = 108;
  const out = [];
  out.push(S(k.cylinder(bx, by, 6.5, PANEL_H, 2.6, P, 32), { tone: "mid" }));
  out.push(S(G.ringBand(0, 2.6, 6.5, 8.6, G.frameAlong([bx, by, PANEL_H + 2.6], [0, 0, 1]), P), { tone: "mid" }));
  out.push(Ln(k.knurl(bx, by, 8.6, PANEL_H + 2.6, PANEL_H + 5.2, 40, P, 0.3), { tone: "lo" }));
  put("panel", [bx, by, PANEL_H + 4], out.join(""), { name: nameFor("panel.scram-base"), shapes: [record(A.cylinder(bx, by, 8.6, PANEL_H, 5.2, { name: "panel.scram-base" }))] });
  const capPlan = { capR: 5.4, capH: 3.6 };
  const capPaths = G.solidOf([[0, 0], [1.4, 4.6, 1], [2.6, 5.4, 1], [capPlan.capH, 5.4], [capPlan.capH, 0]], G.frameAlong([bx, by, PANEL_H + 5.2], [0, 0, 1]), P, { bevel: 0.5 });
  put("panel", [bx, by, PANEL_H + 7], `<g data-live="scram">${S(capPaths, { tone: "hi", lit: true })}</g>`, {
    bias: 0.6, name: nameFor("panel.scram-cap"),
    shapes: [record(A.cylinder(bx, by, 5.4, PANEL_H + 5.2, capPlan.capH, { name: "panel.scram-cap" }))], move: [0, 0, -2.2],
  });
  out.length = 0;
}

// ================================================================= neutron detector
{
  const DX = -225, DY = -10;
  boxAt("detector", { x: DX - 5, y: DY - 5, w: 10, d: 10, r: 1.5 }, 0, 4, { tone: "mid" }, { name: "detector.foot" });
  turned("detector", G.frameAlong([DX, DY, 4], [0, 0, 1]), [[0, 2.2], [80, 2.2]], { tone: "mid" }, { name: "detector.post" });
  turned("detector", G.frameAlong([DX + 6.5, DY, 84], [0, 0, 1]), [[0, 3.5], [26, 3.5], [27.5, 2.6], [27.5, 0]], { tone: "hi" }, { name: "detector.chamber", bias: 0.2, inner: [8, 18].map((s) => G.arcOf(G.frameAlong([DX + 6.5, DY, 84], [0, 0, 1]), s, 3.5, P)).join("") });
  put("detector", [DX + 3.6, DY, 96], Ln(k.segment([DX + 2.2, DY, 92], [DX + 3.0, DY, 92], P), { tone: "lo" }), { name: nameFor("detector.brace"), shapes: [record(A.box([DX + 2.2, DY - 0.3, 91.7], [DX + 3.0, DY + 0.3, 92.3], { name: "detector.brace" }))] });
  const detClamps = [[-170, 18], [-95, 19], [-40, 56]].map(([x, y]) => ({ centre: [x, y, 0.9], axis: [0, 0, 1], radius: 1.3 }));
  cableAt("detector", [
    [-217.6, -6.7, 108],
    [-216.5, -2.6, 108],
    [-219, -2, 100],
    [-219, -2, 40],
    [-215.5, 10, 0.9],
    [-40, 20, 0.9],
    [-40, 96, 0.9],
    [40, 96, 10],
    [44.6, 96, 10],
  ], { name: "detector.cable", shells: [true, true], r: 0.6, bend: 7, clamps: detClamps });
  boxAt("panel", { x: 44.6, y: 93.5, w: 3.4, d: 5, r: 0.8 }, 8, 5, { tone: "mid" }, { name: "panel.connector-det", bias: 0.3 });
}

// seat the cable end shells into their connectors
{
  const conn = R.solids.find((s) => s.name === "panel.connector-pump");
  const det = R.solids.find((s) => s.name === "panel.connector-det");
  for (const shell of CABLE_SHELLS) {
    const host = shell.name.startsWith("pump.cable") ? conn : det;
    if (host) { shell.seated = true; shell.cut = [host]; shell.piece = "panel"; shell.ride = "panel"; }
  }
  for (const s of R.solids) if ((s.name ?? "").startsWith("core.guide-upper")) { s.piece = "rpv"; s.ride = "rpv"; }
}

// assembly + page ------------------------------------------------------------
A.settle(R, P);
items.sort((a, b) => a.key - b.key);

const backItems = items.filter((item) => !item.front);
const frontItems = items.filter((item) => item.front);
const group = (item) => `<g class="it" data-piece="${item.piece}" data-k="${item.key.toFixed(2)}"${item.name.includes("cursor") ? ' data-live="cursor-item"' : ""}>${item.svg}</g>`;
const backSvg = k.figureSvg({
  width: W, height: H,
  label: "Cutaway teaching model of a pressurised-water reactor: steel pressure vessel with a window into the core, fuel assemblies, control rods and their drive housings, hot and cold legs, a reactor coolant pump, a steam generator with a steam line, a pressurizer, and an instrument panel with two dials, two power bars and a guarded SCRAM push button.",
  body: back.join("") + backItems.map(group).join(""),
  className: "rx-back",
});
const rodGroup = `<g id="rx-rods">${frontItems.filter((item) => item.piece === "rods").map(group).join("")}</g>`;
const frontRest = frontItems.filter((item) => item.piece !== "rods").map(group).join("");
const frontSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg rx-front" viewBox="0 0 ${W} ${H}" aria-hidden="true">${rodGroup}${frontRest}</svg>`;

const ZSV = (vec) => { const o = at([0, 0, 0]); const p = at(vec); return [p[0] - o[0], p[1] - o[1]]; };
const PARTS = [
  ["rpv", "Reactor pressure vessel", "steel vessel at 155 bar; the window is cut away"],
  ["core", "Fuel assemblies", "at power fission makes ~93 % of the heat and decay ~7 %; after SCRAM the chain reaction is suppressed and the fission products keep decaying"],
  ["rods", "Control rods", "free-fall into the core in 2.4 s; they suppress the chain reaction — decay heat is not fission and keeps going"],
  ["hotleg", "Hot leg", "carries the coolant at the core-outlet temperature (teaching curve: 325 °C at power, ≈292 °C at hot standby — not a plant prediction)"],
  ["crossover", "Crossover leg", "steam generator outlet to the pump"],
  ["coldleg", "Cold leg", "returns to the vessel at about 292 C"],
  ["pump", "Reactor coolant pump", "keeps running at full flow; it must, or the core uncovers"],
  ["sg", "Steam generator", "boils secondary water; carries the decay heat away as steam; the sight-glass level is a fixed schematic — feedwater holds it"],
  ["steam", "Main steam line", "after a SCRAM it still carries a few percent of full-power steam"],
  ["pzr", "Pressurizer", "holds the primary at about 155 bar — a fixed nominal schematic value; no pressurizer dynamics are modelled"],
  ["panel", "Instrument panel", "power and core outlet temperature, live from the model"],
  ["detector", "Source-range detector", "counts neutrons; sees the power fall by decades"],
];
const DATA = {
  W, H,
  camera: glCamera(P),
  proj: P,
  needles: needleBase,
  EZ: ZSV([0, 0, 1]),
  axis: [RPV.x, RPV.y],
  rOut: R_OUT, rIn: R_IN, rBar: 36, rCore: 30,
  winZ: Z_WIN, winB: WIN_B, plateZ: Z_PLATE[1],
  asmZ: ASM_Z, asmHalf: ASM_HALF,
  asm: ASM.map(({ at: c }) => [c[0], c[1]]),
  rodStroke: ROD_STROKE,
  pieces: Object.fromEntries(PARTS.map(([id, name, say]) => [id, { name, say }])),
  order: PARTS.map(([id]) => id),
  model: {
    P0: M.P0_MW, tinFull: M.TIN_C, dtFull: M.DT_FULL_C,
    tavg0: M.TAVG0_C, tavgStandby: M.TAVG_STANDBY_C,
    tauLoop: M.TAU_LOOP_S, tauOutlet: M.TAU_OUTLET_S,
    rodTravel: M.ROD_TRAVEL_S, window: M.WINDOW_S, pBar: M.P_BAR,
  },
};
const MODEL_SRC = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA)).replace("__MODEL__", MODEL_SRC);
const CSS = readFileSync(join(HERE, "style.css"), "utf8");

const slider = `<label class="rx-slider"><span class="rx-slider-label">time after scram</span><input type="range" min="0" max="60" step="0.1" value="0" data-slider aria-label="Time after scram, in seconds"/></label>`;
const corners = `<div class="iso-plate-corners" aria-hidden="true"><span class="iso-plate-corner" data-corner="fig">Fig 1</span><span class="iso-plate-corner" data-corner="title">The reactor that won't turn cold</span><span class="iso-plate-corner" data-corner="readout" data-readout>ready</span></div>`;
const stage = `<div class="rx-stage" tabindex="0" role="slider" aria-label="Pressurised-water reactor cutaway. Space or the SCRAM button starts the scram; arrow keys scrub time; hover parts for what they do." aria-valuemin="0" aria-valuemax="60" aria-valuenow="0" aria-valuetext="ready">${backSvg}<canvas class="rx-gl" aria-hidden="true"></canvas>${frontSvg}</div>`;
const caption = `A pressurised-water reactor at 3,400 MW thermal (representative teaching setting). SCRAM drops the rods and the self-sustaining chain reaction is suppressed within seconds — a small residual fission term keeps a fraction of a percent alive. What cannot be switched off is decay heat from the fission products already made: about 6.6 % of full power at once, still 2.9 % (≈99 MW) a minute later, on top of a few tenths of a percent of residual fission. The pumps keep circulating and the plant parks at hot standby — roughly 292 °C on a stylised teaching curve — for hours: the heat power collapses, the temperature does not. Teaching illustration with labelled approximations — not an accident-analysis or operations tool. Details under “Model & assumptions” below.`;
const notes = `<details class="rx-notes"><summary>Model &amp; assumptions</summary><div class="rx-notes-body"><p><strong>Scope.</strong> This figure is a teaching illustration of why decay heat matters. It is not a plant simulator, not an accident-analysis program, and not an operator aid: do not use it for real-plant accident prediction, operational decisions or safety analysis. Real plants are analysed with licensed codes (RELAP5, TRACE) on plant-specific data.</p><p>Every moving number is a pure function of one variable: t, the seconds since the operator pressed SCRAM (t = 0 is full power). P₀ = 3,400 MW thermal is a representative large four-loop PWR — a teaching setting, not a specific unit. Powers are shares of P₀ or MW; temperatures in °C; pressure in bar absolute.</p><dl><dt>Decay heat — Way–Wigner teaching rule</dt><dd>P/P₀ = 0.066 · t<sup>−0.2</sup>, t in seconds, held at 6.6 % below 1 s (the truncation avoids the power law's divergence as t → 0). Assumes the core ran at full power long before the scram — an irradiation history far longer than this 60 s window. Reference values: ≈6.6 % of full power at 1 s; ≈2.9 % (≈99 MW) at 60 s. This power law is the classic teaching approximation — it is <em>not</em> an implementation of the ANSI/ANS-5.1 standard, which sums many nuclide groups and reads slightly higher at short times. Source (bibliography checked online): K. Way &amp; E. P. Wigner, “The Rate of Decay of Fission Products”, Phys. Rev. 73, 1318–1330 (1948), <a href="https://doi.org/10.1103/PhysRev.73.1318">doi:10.1103/PhysRev.73.1318</a>.</dd><dt>Residual fission term</dt><dd>Rods free-fall for 2.4 s (real PWR scram rods: roughly 2–4 s). While they fall, prompt power is drawn down as (1 − rod travel)⁴ — a spatial-worth shape, not point kinetics. After insertion, fission does not drop to zero: a residual term ≈0.006 · (1+t)<sup>−0.2</sup> of P₀ remains. Its coefficient is a teaching stand-in of the same order as a U-235 core's effective delayed-neutron fraction (~0.65 %) — not a validated kinetics model — and the t<sup>−0.2</sup> shape stands in for the six delayed-neutron groups (longest-lived half-life ≈55 s). Total heat power = residual fission + decay heat; the readout shows both separately.</dd><dt>Loop average temperature — stylised</dt><dd>T<sub>avg</sub>(t) = 291.5 + 17 · e<sup>−t/25</sup> °C. A stylised teaching response: the full-power average (308.5 °C) relaxing toward a representative hot-standby average (291.5 °C). The 291.5 °C figure, the 17 °C span and the 25 s time constant are teaching choices — not universal real-PWR parameters — standing in for loop inertia and steam-generator heat transfer; a real plant approaches its no-load temperature over one to a few minutes. Not a prediction of any plant's temperatures.</dd><dt>Core outlet temperature</dt><dd>Targets T<sub>avg</sub> + 16.5 °C × (total heat power)/P₀ through a 4 s transport lag. Assumes constant primary mass flow (pumps at full flow), constant coolant specific heat, and core ΔT proportional to power — teaching proportionality only. Values are computed by fixed-step integration from t = 0, so a reading depends only on the time t, never on how the slider was moved.</dd><dt>Fuel heat state</dt><dd>No fuel temperature is computed or displayed. At power the fuel stores sensible heat of order a few full-power seconds (rough estimate: ≈100 t UO₂ × ~0.3 J/g·K × ~390 K ≈ 13 GJ ≈ 4 s of full power — teaching estimate), which flows out over the first tens of seconds; pellet interiors run far hotter than any average. The orange glow is a relative heat-intensity cue driven by the remaining heat power — it is not a calculated temperature field.</dd><dt>Pressure &amp; sight glass</dt><dd>Pressure is a fixed nominal 155 bar (absolute), schematic: no pressurizer dynamics (shrink/swell, heaters, spray) are modelled. The steam-generator sight-glass level is a fixed schematic: feedwater, boiling and secondary level control are not modelled, and no level change is implied.</dd><dt>Not modelled</dt><dd>Real coolant flow rates and loop transport, the pressurizer, secondary-side steam pressure and feedwater, spatial power and fuel temperature distributions, fission-product nuclide composition, and everything after t = 60 s (decay heat keeps falling for days; spent fuel needs years of cooling).</dd><dt>References</dt><dd>K. Way &amp; E. P. Wigner, “The Rate of Decay of Fission Products”, Phys. Rev. 73, 1318–1330 (1948), <a href="https://doi.org/10.1103/PhysRev.73.1318">doi:10.1103/PhysRev.73.1318</a> (bibliography verified online via Crossref). ANSI/ANS-5.1, “Decay Heat Power in Light Water Reactors”, American Nuclear Society — the standard used in real analyses; this figure does not implement it, and its current edition was not verified here: consult the published standard. Nuclear-regulator material (e.g. the US NRC's reactor-concept resources) covers decay heat in operational terms.</dd></dl></div></details>`;
const keys = [
  { mark: "lit", label: "control rods and needles, driven by the model" },
  { mark: "red", label: "core heat — relative glow intensity: fission at power, decay heat after SCRAM (orange)" },
  { mark: "blue", label: "primary coolant (blue)" },
];
const body = `<figure class="iso-figure rx"><div class="iso-plate">${corners}${stage}${slider}</div><figcaption class="iso-legend"><span class="iso-keys">${keys.map((key) => `<span class="iso-key"><i data-mark="${key.mark}"></i>${key.label}</span>`).join("")}</span><span class="iso-caption">${caption}</span>${notes}</figcaption></figure>`;
const page = k.pageHtml({ title: "The reactor that won't turn cold", theme: THEME, body: `<style>${CSS}</style>${body}`, script: kitScript() + glScript() + LIVE, width: 1040 });
const name = THEME === "light" ? "reactor-scram-light.html" : "reactor-scram.html";
writeFileSync(join(HERE, "..", name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${items.length} items`);

// the guide tubes' tops end inside the head's silhouette (verified at 3x: shots/guide-head.png)
A.auditOrExit(R, P, {
  cover: ["rpv.farwall"],
  allow: [["core.guide-upper*", "rpv.head"]],
  ground: (s) => A.grounded(s) || (s.name ?? "").startsWith("rods.rod"),
});
