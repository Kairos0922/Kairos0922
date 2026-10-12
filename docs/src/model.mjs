// Teaching model for the first 60 seconds after a PWR scram.
// Pure functions of t (seconds since the operator pressed SCRAM, t < 0 = at power).
//
// Sources for the numbers (teaching values, not an accident-analysis code):
//  - P0 = 3400 MWt: thermal power of a typical large four-loop PWR.
//  - Decay heat follows the Way–Wigner rule, P/P0 = 0.066 · t^-0.2 with t in seconds
//    (K. Way & E. P. Wigner, 1948/1962 correlation as commonly taught), for an
//    irradiation history much longer than the 60 s window. Handbook teaching
//    figures for a power reactor: ~6.5% of full power at 1 s after shutdown,
//    ~3.3% at one minute, ~1.3% at one hour. This model reads 6.6% and 2.9% at
//    those points; real plants measure slightly higher at short times.
//  - Fission power: rods free-fall into the core in ~2.4 s (real PWR scram rods
//    are fully inserted in roughly 2-4 s). While they fall the prompt power is
//    modelled as falling with the fourth power of the remaining travel; after
//    insertion a small delayed-neutron tail (~0.6%, decaying like t^-0.2) remains.
//  - Core outlet temperature: T_in + full-power rise x total power, through a
//    4 s first-order lag (loop transport/plant inertia, teaching simplification).
//    T_in is held at 292 C: the steam generator keeps drawing heat, so steam keeps
//    flowing after the scram - that is the point of the figure.
//  - Pressure: 155.0 bar nominal, held by the pressurizer; a small ~1.5 bar dip
//    is modelled as the coolant shrinks. Cosmetic.
// The figure is an illustration of why decay heat matters, not a prediction tool.

export const P0_MW = 3400;
export const TIN_C = 292;
export const DT_FULL_C = 33;
export const ROD_TRAVEL_S = 2.4;
export const WINDOW_S = 60;
export const P_BAR = 155.0;

// 0 = rods fully withdrawn, 1 = fully inserted. Free fall: distance ~ t^2.
export function rodFrac(t) {
  if (t <= 0) return 0;
  const s = t / ROD_TRAVEL_S;
  return s >= 1 ? 1 : s * s;
}

// Share of P0 made by fission right now.
export function fissionFrac(t) {
  if (t <= 0) return 0.934;
  const rod = rodFrac(t);
  const prompt = 0.934 * Math.pow(Math.max(0, 1 - rod), 4);
  const tail = 0.006 * Math.pow(1 + t, -0.2) * Math.min(1, rod * 3);
  return prompt + tail;
}

// Share of P0 made by radioactive decay of the fission products.
export function decayFrac(t) {
  if (t <= 0) return 0.066;
  return 0.066 * Math.pow(Math.max(t, 1), -0.2);
}

export function totalFrac(t) {
  return fissionFrac(t) + decayFrac(t);
}

export function pressureBar(t) {
  if (t <= 0) return P_BAR;
  return P_BAR - 1.5 * (1 - Math.exp(-t / 10));
}

// Core outlet temperature through a 4 s lag, integrated from t = 0 so that
// scrubbing the time slider stays deterministic.
const LAG_S = 4;
const lagCache = new Map();
export function outletC(t) {
  if (t <= 0) return TIN_C + DT_FULL_C * totalFrac(0);
  const key = Math.round(t * 20);
  if (lagCache.has(key)) return lagCache.get(key);
  const tEnd = key / 20;
  let x = TIN_C + DT_FULL_C * totalFrac(0);
  const h = 0.1;
  for (let s = 0; s < tEnd; s += h) {
    const target = TIN_C + DT_FULL_C * totalFrac(s + h / 2);
    x += ((target - x) / LAG_S) * h;
  }
  const value = Math.round(x * 100) / 100;
  lagCache.set(key, value);
  return value;
}

export function phaseOf(t) {
  if (t <= 0) return "ready";
  if (t < ROD_TRAVEL_S) return "rods inserting";
  return "subcritical";
}

export function readoutOf(t) {
  const total = totalFrac(t);
  const mw = Math.round(total * P0_MW);
  const out = outletC(t);
  const phase = phaseOf(t);
  if (phase === "ready") return `ready · rods up · ${P0_MW.toLocaleString("en-US")} MWt`;
  const decay = decayFrac(t);
  if (phase === "rods inserting") {
    return `t ${t.toFixed(1)} s · fission ${(fissionFrac(t) * 100).toFixed(0)} % · decay ${(decay * 100).toFixed(1)} % · ${out.toFixed(0)} °C`;
  }
  return `t ${t.toFixed(1)} s · fission ${(fissionFrac(t) * 100).toFixed(2)} % · decay ${(decay * 100).toFixed(1)} % · ${mw.toLocaleString("en-US")} MW · ${out.toFixed(0)} °C`;
}
