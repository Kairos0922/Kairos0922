const get = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
  const gl = get.call(this, kind, ...rest);
  if (gl && String(kind).startsWith("webgl") && !this.__gl) this.__gl = gl;
  return gl;
};
