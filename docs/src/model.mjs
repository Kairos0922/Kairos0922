// Teaching model for the first 60 seconds after a PWR scram.
// Pure functions of t (seconds since the operator pressed SCRAM, t < 0 = at power).
//
// Everything here is a TEACHING ILLUSTRATION, not a plant simulator or an
// accident-analysis code. Numbers marked "teaching" are representative and
// order-correct; they are neither measured plant data nor universal parameters.
// Real analysis uses licensed codes (RELAP5, TRACE) on plant-specific data and
// the ANSI/ANS-5.1 decay-heat standard. This module implements none of those.
//
// - P0_MW = 3400 MWt: a representative large four-loop PWR. Teaching setting,
//   not a specific plant.
// - Decay heat (Way–Wigner teaching rule): P/P0 = 0.066 · t^-0.2 for t ≥ 1 s,
//   held at 6.6 % below 1 s. The truncation avoids the power law's divergence
//   as t → 0. Assumes an irradiation history much longer than this 60 s window.
//   Reference values: ≈ 6.6 % of full power at 1 s; ≈ 2.9 % (≈ 99 MW) at 60 s.
//   This is the classic power-law teaching approximation, NOT an implementation
//   of the ANSI/ANS-5.1 standard (which sums many nuclide groups and reads a
//   few tenths of a percent higher at short times).
//   Source (bibliography verified online via Crossref): K. Way & E. P. Wigner,
//   "The Rate of Decay of Fission Products", Physical Review 73, 1318–1330
//   (1948), doi:10.1103/physrev.73.1318.
// - Fission power: rods free-fall for ~2.4 s (real PWR scram rods: roughly
//   2–4 s). While they fall, prompt power is drawn down with the fourth power
//   of the remaining travel — a spatial-worth shape, not point kinetics. After
//   insertion a residual fission term ≈ 0.006 · (1+t)^-0.2 remains: its
//   coefficient is a TEACHING STAND-IN of the same order as a U-235 core's
//   effective delayed-neutron fraction (~0.65 %), not a validated kinetic
//   model, and the t^-0.2 shape stands in for the six delayed-neutron groups
//   (longest-lived half-life ≈ 55 s). The self-sustaining chain reaction is
//   suppressed within seconds — the heat output does NOT drop to zero at once.
// - Loop average temperature: Tavg(t) = 291.5 + 17 · exp(−t/25) °C. A STYLISED
//   teaching response: the full-power average (292 + 33/2 = 308.5 °C) relaxing
//   toward a representative hot-standby average (291.5 °C — a teaching figure,
//   not a universal plant parameter), with a 25 s time constant standing in
//   for loop inertia and steam-generator heat transfer. Real plants approach
//   their no-load temperature over one to a few minutes. Not a prediction of
//   any plant's temperatures.
// - Core outlet temperature: targets Tavg + 16.5 · P_total/P0 through a 4 s
//   transport lag. Assumptions: primary mass flow constant (pumps at full
//   flow), coolant specific heat constant, and core ΔT proportional to power
//   (teaching proportionality; 16.5 °C = half of the full-power 33 °C rise).
//   Integrated from t = 0 with a fixed step and cached at 0.05 s granularity,
//   so the value at a given t is path-independent: scrubbing the slider back
//   and forth, playing, or pausing all yield the same reading.
// - Fuel heat state: NOT computed as a temperature. At power the fuel stores
//   sensible heat of order a few full-power seconds (≈ 100 t UO2 × ~0.3 J/g·K
//   × ~390 K ≈ 13 GJ ≈ 4 × 3.4 GW·s — a rough teaching estimate), which flows
//   out over the first tens of seconds; pellet interiors run far hotter than
//   any average. The figure's orange glow is a RELATIVE heat-intensity cue
//   driven by the remaining heat power, not a computed temperature field.
// - Pressure: fixed nominal 155 bar (absolute), schematic. No pressurizer
//   model: no shrink/swell, heater or spray dynamics are claimed.
// - Sight-glass level: fixed schematic. Feedwater, boiling and secondary
//   level control are not modelled.

export const P0_MW = 3400;
export const TIN_C = 292; // full-power core inlet / cold leg (teaching figure)
export const DT_FULL_C = 33; // full-power rise across the core at full flow
export const DT_HALF_C = DT_FULL_C / 2; // 16.5 °C, average-to-outlet half-rise
export const TAVG0_C = TIN_C + DT_HALF_C; // 308.5 °C, full-power loop average
export const TAVG_STANDBY_C = 291.5; // representative hot-standby average (teaching figure)
export const TAU_LOOP_S = 25; // stylised teaching time constant
export const TAU_OUTLET_S = 4; // transport lag through core + hot leg (teaching)
export const ROD_TRAVEL_S = 2.4;
export const WINDOW_S = 60;
export const P_BAR = 155.0; // nominal, schematic — no pressurizer model

// 0 = rods fully withdrawn, 1 = fully inserted. Free fall: distance ~ t^2.
export function rodFrac(t) {
  if (t <= 0) return 0;
  const s = t / ROD_TRAVEL_S;
  return s >= 1 ? 1 : s * s;
}

// Share of P0 made by fission right now (prompt drawdown + residual fission term).
export function fissionFrac(t) {
  if (t <= 0) return 0.934;
  const rod = rodFrac(t);
  const prompt = 0.934 * Math.pow(Math.max(0, 1 - rod), 4);
  const tail = 0.006 * Math.pow(1 + t, -0.2) * Math.min(1, rod * 3);
  return prompt + tail;
}

// Share of P0 made by radioactive decay of the fission products (Way–Wigner teaching rule).
export function decayFrac(t) {
  if (t <= 0) return 0.066;
  return 0.066 * Math.pow(Math.max(t, 1), -0.2);
}

// Total heat power share: residual fission + decay heat.
export function totalFrac(t) {
  return fissionFrac(t) + decayFrac(t);
}

// Loop average temperature: stylised exponential, closed form.
export function loopAvgC(t) {
  if (t <= 0) return TAVG0_C;
  return TAVG_STANDBY_C + (TAVG0_C - TAVG_STANDBY_C) * Math.exp(-t / TAU_LOOP_S);
}

// Integrator used by outletC: first-order toward a moving target, stepped from
// t = 0 with a fixed step and cached at 0.05 s granularity — the value depends
// only on t, never on the path the slider took.
const CACHE_STEP = 0.05;
const outletCache = new Map();
function outletTarget(s) {
  return loopAvgC(s) + DT_HALF_C * totalFrac(s);
}
export function outletC(t) {
  if (t <= 0) return TAVG0_C + DT_HALF_C * totalFrac(0);
  const key = Math.round(t / CACHE_STEP);
  if (outletCache.has(key)) return outletCache.get(key);
  const tEnd = key * CACHE_STEP;
  let x = TAVG0_C + DT_HALF_C * totalFrac(0);
  const h = 0.05;
  for (let s = 0; s < tEnd; s += h) {
    x += ((outletTarget(s + h / 2) - x) / TAU_OUTLET_S) * h;
  }
  const value = Math.round(x * 100) / 100;
  outletCache.set(key, value);
  return value;
}

export function phaseOf(t) {
  if (t <= 0) return "ready";
  if (t < ROD_TRAVEL_S) return "rods inserting";
  return "subcritical";
}

export function readoutOf(t) {
  const phase = phaseOf(t);
  if (phase === "ready") {
    return `ready · rods up · ${P0_MW.toLocaleString("en-US")} MWt · outlet ${outletC(t).toFixed(0)} °C`;
  }
  const fis = fissionFrac(t) * 100;
  const dec = decayFrac(t);
  const tot = totalFrac(t);
  const out = outletC(t).toFixed(0);
  if (phase === "rods inserting") {
    return `t ${t.toFixed(1)} s · fission ${fis.toFixed(1)} % · decay ${(dec * 100).toFixed(1)} % · total ${(tot * 100).toFixed(1)} % · outlet ${out} °C`;
  }
  const decMw = Math.round(dec * P0_MW);
  const totMw = Math.round(tot * P0_MW);
  return `t ${t.toFixed(1)} s · fission ${fis.toFixed(2)} % · decay ${(dec * 100).toFixed(1)} % (${decMw} MW) · total ${totMw.toLocaleString("en-US")} MW · outlet ${out} °C`;
}
