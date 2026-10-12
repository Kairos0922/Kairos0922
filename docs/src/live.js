const D = __DATA__;
__MODEL__

const stage = document.querySelector(".rx-stage");
const back = stage.querySelector(".rx-back");
const front = stage.querySelector(".rx-front");
const canvas = stage.querySelector(".rx-gl");
const readout = document.querySelector("[data-readout]");
const slider = document.querySelector("[data-slider]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const LIGHT = document.body.dataset.theme === "light" ? 1 : 0;
const PROJ = D.proj;
const NEEDLES = D.needles;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------- shader
const FRAGMENT = `
uniform float uHeat;
uniform float uFirst;
uniform float uLight;
uniform vec2 uAsm[9];
const vec2 AXIS = vec2(${D.axis[0].toFixed(1)}, ${D.axis[1].toFixed(1)});
const float ROUT = ${D.rOut.toFixed(1)};
const float RIN = ${D.rIn.toFixed(1)};
const float RBAR = ${D.rBar.toFixed(1)};
const float RCORE = ${D.rCore.toFixed(1)};
const float WINZ0 = ${D.winZ[0].toFixed(1)};
const float WINZ1 = ${D.winZ[1].toFixed(1)};
const float WINB = ${D.winB.toFixed(2)};
const float PLATEZ = ${D.plateZ.toFixed(1)};
const float ASMZ0 = ${D.asmZ[0].toFixed(1)};
const float ASMZ1 = ${D.asmZ[1].toFixed(1)};
const float ASMH = ${D.asmHalf.toFixed(1)};
vec2 cylHit(vec2 o, vec2 d, float R) {
  float a = dot(d, d);
  float b = dot(o, d);
  float c = dot(o, o) - R * R;
  float disc = b * b - a * c;
  if (disc < 0.0) return vec2(1e9, -1e9);
  float sq = sqrt(disc);
  return vec2((-b - sq) / a, (-b + sq) / a);
}
vec3 rampOf(float e) {
  vec3 tint = vec3(1.0, 0.86, 0.76);
  vec3 body = vec3(0.94, 0.40, 0.07);
  vec3 rim = vec3(1.0, 0.58, 0.16);
  vec3 core = vec3(1.0, 0.86, 0.62);
  vec3 col = mix(vec3(1.0), tint, smoothstep(0.0, 0.12, e));
  col = mix(col, body, smoothstep(0.12, 0.5, e));
  col = mix(col, rim, smoothstep(0.42, 0.66, e));
  col = mix(col, core, smoothstep(0.62, 0.92, e));
  return col;
}
vec4 inkFor(vec3 seen, float cover) {
  vec3 absorbed = 1.0 - seen;
  float a = max(max(absorbed.r, max(absorbed.g, absorbed.b)), cover);
  return vec4(vec3(a) - absorbed, a);
}
void main() {
  vec2 vb = viewOf(gl_FragCoord.xy);
  vec3 g0 = rayOf(vb);
  vec3 V = towardViewer();
  float px = pixelOf();
  float pxz = px / uCam.w;
  vec2 o = g0.xy - AXIS;
  vec2 h46 = cylHit(o, V.xy, ROUT);
  float tN = h46.y;
  float zN = g0.z + tN * V.z;
  float bOff = abs(o.x * V.y - o.y * V.x) / uCam.w;
  float mask = (1.0 - smoothstep(WINB - 0.9 * px, WINB + 0.9 * px, bOff)) * window(zN, WINZ0 + 0.5, WINZ1 - 0.5, 1.1 * pxz);
  vec3 col = vec3(0.0);
  float lin = 0.0;
  if (mask > 0.001 && tN < 1e8) {
    vec2 h41 = cylHit(o, V.xy, RIN);
    vec2 h36 = cylHit(o, V.xy, RBAR);
    vec2 h30 = cylHit(o, V.xy, RCORE);
    float tW = h41.x;
    float tB = h36.x;
    float tPlate = (PLATEZ - g0.z) / V.z;
    vec3 pPlate = g0 + tPlate * V;
    bool plateOk = tPlate < tN && tPlate > tW && length(pPlate.xy - AXIS) < 40.0 && tPlate > 0.0;
    float tFirst = plateOk ? tPlate : max(tB, tW);
    float fl = 0.82 + 0.36 * fbm3(vec3(g0.xy * 0.028, uTime * 0.55));
    float ember = 0.0;
    for (int i = 0; i < 9; i++) {
      vec2 c = uAsm[i];
      vec2 d2 = o - (c - AXIS);
      vec2 inv = 1.0 / V.xy;
      vec2 tA = (-ASMH - d2) * inv;
      vec2 tB = (ASMH - d2) * inv;
      vec2 tlo = min(tA, tB);
      vec2 thi = max(tA, tB);
      float tmin = max(max(tlo.x, tlo.y), (ASMZ0 - g0.z) / V.z);
      float tmax = min(min(thi.x, thi.y), (ASMZ1 - g0.z) / V.z);
      if (tmax > tmin) {
        float chord = min(tmax, tN) - max(tmin, tFirst);
        if (chord > 0.0) {
          float w = chord / (2.0 * ASMH);
          float f = 0.75 + 0.5 * fbm3(vec3(c * 0.11, uTime * 0.5 + float(i) * 1.71));
          ember += w * f;
        }
      }
    }
    float water = 0.0;
    float c30 = 0.0;
    if (h30.y > h30.x) {
      c30 = min(h30.y, tN) - max(h30.x, tFirst);
      if (c30 > 0.0) water += c30 * 0.055;
    }
    if (h36.y > h36.x) {
      float c36 = min(h36.y, tN) - max(h36.x, tFirst);
      if (c36 > 0.0) water += max(c36 - max(c30, 0.0), 0.0) * 0.02;
    // bias the water glow toward the core's mid height so it hugs the fuel
    vec3 pMid = g0 + V * clamp(dot(vec3(AXIS, 87.0) - g0, V) / dot(V, V), tFirst, tN);
    water *= 0.35 + 0.65 * exp(-pow((pMid.z - 87.0) / 34.0, 2.0));
    }
    float surf = 0.0;
    vec3 pFirst = g0 + tFirst * V;
    float zFirst = pFirst.z;
    if (tFirst > -1e8) {
      if (plateOk) surf = 1.1;
      else if (zFirst > WINZ0 - 4.0 && zFirst < WINZ1 + 4.0) surf = 0.85 * window(zFirst, WINZ0, WINZ1, 3.0);
    }
    lin = ember * 0.30 + water * 0.14 + surf * 0.32;
    lin *= fl;
  }
  float bright = 0.10 + 0.90 * pow(clamp(uHeat, 0.0, 1.0), 0.45);
  float e = (1.0 - exp(-2.2 * lin * bright)) * mask;
  vec3 seen = rampOf(e);
  float wash = 0.55 * smoothstep(0.5, 0.9, e);
  vec4 ink = inkFor(seen, wash);
  ink.rgb *= ink.a;
  ink *= uFirst;
  vec3 add = tonemap(vec3(1.0, 0.42, 0.12) * lin * bright * 1.35 + vec3(1.0, 0.72, 0.4) * pow(lin * bright, 2.2) * 0.9, 1.1) * mask * uFirst;
  float mAdd = max(add.r, max(add.g, add.b));
  vec4 dark = vec4(add, mAdd);
  float m = max(ink.r, max(ink.g, ink.b));
  float n = (hash12(gl_FragCoord.xy + fract(uTime * 0.61) * 91.0) + hash12(gl_FragCoord.yx * 1.37 + fract(uTime * 0.37) * 57.0) - 1.0) / 255.0;
  ink = max(ink + vec4(n * smoothstep(0.0, 1.5 / 255.0, m)), vec4(0.0));
  dark = max(dark + vec4(n * smoothstep(0.0, 1.5 / 255.0, mAdd)), vec4(0.0));
  gl_FragColor = mix(dark, ink, uLight);
}`;

const layer = glLayer({
  canvas,
  fragment: FRAGMENT,
  view: [D.W, D.H],
  camera: D.camera,
  uniforms: ["uHeat", "uFirst"],
  fixed: { uLight: LIGHT, uAsm: new Float32Array(D.asm.flat()) },
});
if (layer) stage.setAttribute("data-gl", "");

// ---------------------------------------------------------------- refs
const rodsEl = document.getElementById("rx-rods");
const cursorEl = stage.querySelector('[data-live="cursor-item"]');
const scramEl = stage.querySelector('[data-live="scram"]');
const needleEls = {
  power: stage.querySelector('[data-live="needle-power"]'),
  temp: stage.querySelector('[data-live="needle-temp"]'),
};
const barEls = {
  fission: stage.querySelector('[data-bar="fission"]'),
  decay: stage.querySelector('[data-bar="decay"]'),
};
const BAR_Z = [14, 34];
const needleAt = (key, value) => {
  const n = NEEDLES[key];
  const share = clamp((value - n.lo) / (n.hi - n.lo), 0, 1);
  const angle = ((n.from + n.span * share) * Math.PI) / 180;
  return lineOnTop([n.x - Math.sin(angle) * 3.2, n.y + Math.cos(angle) * 3.2], [n.x + Math.sin(angle) * (n.r - 3.6), n.y - Math.cos(angle) * (n.r - 3.6)], n.top + 0.2, PROJ);
};

// ---------------------------------------------------------------- state
let t = 0;
let playing = false;
let scramAt = -1;
let selected = null;
let inside = false;
let visible = false;
let frame = 0;
let last = 0;
let clock = 0;
let touring = !still.matches;
let tourClock = 0;
let idleTimer = 0;
let leaveTimer = 0;
let lastVT = "";
let shownRods = "";
let shownCursor = "";

const heat = { x: 1, v: 0 };
const rodE = { x: 0, v: 0 };
const first = { x: 0, v: 0 };

function say(text) { if (readout.textContent !== text) readout.textContent = text; }
// live hover for the core: separates fission power, decay heat and the heat glow.
// No fuel temperature is claimed — the glow is a relative heat-intensity cue.
function coreSay(t) {
  if (t <= 0) return "fuel assemblies · at power: fission 93.4 % + decay 6.6 % of full power · glow = remaining heat";
  return `fuel assemblies · fission ${(fissionFrac(t) * 100).toFixed(2)} % (chain reaction suppressed) · decay heat ${(decayFrac(t) * 100).toFixed(1)} % · glow tracks the remaining heat`;
}
function reset() {
  playing = false;
  t = 0;
  scramAt = -1;
  slider.value = "0";
  run();
}
function scram() {
  if (t > 0) { reset(); return; }
  playing = true;
  scramAt = clock;
  run();
}

// ---------------------------------------------------------------- per-frame draw
function draw() {
  const rod = rodFrac(t);
  const total = totalFrac(t);
  const drop = -D.rodStroke * rodE.x;
  const rodsKey = drop.toFixed(2);
  if (rodsKey !== shownRods) {
    shownRods = rodsKey;
    rodsEl.setAttribute("transform", translateAlong(PROJ, [0, 0, drop]));
    holdStill(rodsEl, [D.EZ[0] * drop, D.EZ[1] * drop]);
  }
  const cx = (t * (320 / 60)).toFixed(2);
  if (cx !== shownCursor) {
    shownCursor = cx;
    cursorEl.setAttribute("transform", translateAlong(PROJ, [t * (320 / 60), 0, 0]));
  }
  needleEls.power.setAttribute("d", needleAt("power", total * 100));
  needleEls.temp.setAttribute("d", needleAt("temp", outletC(t)));
  const zSpan = BAR_Z[1] - BAR_Z[0];
  const fh = zSpan * clamp(fissionFrac(t), 0, 1);
  const dh = zSpan * clamp((decayFrac(t) * 100) / 8, 0, 1);
  barEls.fission.setAttribute("height", fh.toFixed(2));
  barEls.fission.setAttribute("y", (-BAR_Z[0] - fh).toFixed(2));
  barEls.decay.setAttribute("height", dh.toFixed(2));
  barEls.decay.setAttribute("y", (-BAR_Z[0] - dh).toFixed(2));
  const press = scramAt >= 0 ? burst(clock - scramAt, 0.06, 0.22) : 0;
  scramEl.setAttribute("transform", translateAlong(PROJ, [0, 0, -2.2 * press]));
  stage.style.setProperty("--rx-heat", heat.x.toFixed(3));
  if (!selected) say(readoutOf(t));
  else if (selected === "core") say(coreSay(t));
  stage.setAttribute("aria-valuenow", String(Math.round(t)));
  const vt = phaseOf(t) === "ready" ? "ready, rods up, at power, core outlet 325 degrees" : `${phaseOf(t)}, t ${t.toFixed(0)} seconds, decay heat ${(decayFrac(t) * 100).toFixed(1)} percent, core outlet ${outletC(t).toFixed(0)} degrees celsius`;
  if (vt !== lastVT) { lastVT = vt; stage.setAttribute("aria-valuetext", vt); }
  if (layer) {
    const active = heat.x > 0.004 || first.x < 0.999;
    if (active) layer.draw({ uHeat: heat.x, uFirst: first.x }, still.matches ? 0.8 : clock);
    else layer.clear();
  }
}

// ---------------------------------------------------------------- loop
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  const calm = still.matches;
  if (touring) {
    tourClock += dt;
    if (t === 0 && !playing && tourClock > 1.6) { scram(); tourClock = 0; }
    else if (playing && t >= 26) { playing = false; tourClock = 0; }
    else if (t >= 26 && !playing && tourClock > 2.4) { reset(); tourClock = 0; }
    else if (t === 0 && !playing && tourClock > 3.4) { tourClock = 0; }
  }
  if (playing) {
    t = Math.min(60, t + dt * 3);
    slider.value = String(t);
    if (t >= 60) playing = false;
  }
  settle(heat, totalFrac(t), dt, 0.5, calm);
  settle(rodE, rodFrac(t), dt, 0.18, calm);
  settle(first, visible ? 1 : 0, dt, 0.7, calm);
  draw();
  const pressDone = scramAt < 0 || clock - scramAt > 1.2;
  const settled = !playing && !touring && Math.abs(heat.x - totalFrac(t)) < 1e-4 && Math.abs(rodE.x - rodFrac(t)) < 1e-4 && pressDone;
  frame = visible && (!settled || (layer && first.x < 0.999)) ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }

new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);

// ---------------------------------------------------------------- interaction
function quietTour() {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (inside || playing || t > 0) { quietTour(); return; }
    touring = !still.matches;
    tourClock = 0;
    run();
  }, 3600);
}
function pieceAt(event) {
  const hit = document.elementFromPoint(event.clientX, event.clientY);
  const item = hit && hit.closest ? hit.closest(".it") : null;
  return item ? item.dataset.piece : null;
}
function select(id) {
  if (selected === id) return;
  selected = id;
  for (const node of stage.querySelectorAll(".it")) {
    if (id && node.dataset.piece === id) node.setAttribute("data-on", "");
    else node.removeAttribute("data-on");
  }
  if (id) stage.setAttribute("data-focus", "");
  else stage.removeAttribute("data-focus");
  say(id ? (D.pieces[id] ? D.pieces[id].say : readoutOf(t)) : readoutOf(t));
}
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  inside = true;
  clearTimeout(leaveTimer);
  quietTour();
  select(pieceAt(event));
  run();
});
stage.addEventListener("pointerleave", () => {
  inside = false;
  clearTimeout(leaveTimer);
  leaveTimer = setTimeout(() => { if (!inside) select(null); }, 260);
});
stage.addEventListener("pointerdown", (event) => {
  quietTour();
  const hit = document.elementFromPoint(event.clientX, event.clientY);
  if (hit && hit.closest && hit.closest('[data-live="scram"]')) { scram(); return; }
  if (event.pointerType === "touch") {
    const id = pieceAt(event);
    if (id) { select(id); run(); }
  }
});
slider.addEventListener("input", () => {
  quietTour();
  playing = false;
  t = clamp(parseFloat(slider.value) || 0, 0, 60);
  run();
});
stage.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    quietTour();
    scram();
    return;
  }
  if (event.key === "Escape") { event.preventDefault(); quietTour(); reset(); return; }
  let next = null;
  const step = event.shiftKey ? 5 : 1;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") next = clamp(t + step, 0, 60);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = clamp(t - step, 0, 60);
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = 60;
  if (next === null) return;
  event.preventDefault();
  quietTour();
  playing = false;
  t = next;
  slider.value = String(next);
  run();
});
window.addEventListener("resize", () => run());
