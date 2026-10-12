const get = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
  const gl = get.call(this, kind, ...rest);
  if (gl && String(kind).startsWith("webgl") && !this.__gl) {
    this.__gl = gl;
    for (const name of ["drawArrays", "clear"]) {
      const call = gl[name].bind(gl);
      gl[name] = (...args) => { gl.__drew = true; return call(...args); };
    }
  }
  return gl;
};
const raf = window.requestAnimationFrame.bind(window);
window.__frames = [];
window.requestAnimationFrame = (cb) => raf((now) => {
  cb(now);
  const canvas = document.querySelector(".rx-gl");
  const gl = canvas && canvas.__gl;
  if (!gl || !gl.__drew) return;
  gl.__drew = false;
  const w = canvas.width, h = canvas.height;
  const [rx, ry, rw, rh] = window.__region || [0, 0, w, h];
  const px = new Uint8Array(rw * rh * 4);
  gl.readPixels(rx, ry, rw, rh, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let sum = 0, maxA = 0, corners = 0;
  for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) {
    const i = (y * rw + x) * 4;
    const [r, g, b, a] = [px[i], px[i + 1], px[i + 2], px[i + 3]];
    maxA = Math.max(maxA, a);
    if ((rx + x < 5 || ry + y < 5 || rx + x > w - 6 || ry + y > h - 6) && a > 0) corners++;
    sum += 255 - (0.2126 * (r + 255 - a) + 0.7152 * (g + 255 - a) + 0.0722 * (b + 255 - a));
  }
  window.__frames.push({ t: now, ink: Math.round(sum / (rw * rh)), maxA, cornerHot: corners });
});
