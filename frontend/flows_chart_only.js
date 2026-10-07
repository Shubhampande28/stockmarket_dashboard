(function () {
  "use strict";
  var rows = window.__flows_rows || [];
  var s = document.getElementById("flows");
  if (!s || !rows.length) return;
  var css = function (name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); };
  var NS = "http://www.w3.org/2000/svg";
  var el = function (tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  var vb = s.viewBox.baseVal;
  var W = vb.width || 640, H = vb.height || 260;
  var L = 54, R = 12, T = 12, B = 28, iw = W - L - R, ih = H - T - B;
  var allVals = rows.map(function (r) { return r.fii_net; }).concat(rows.map(function (r) { return r.dii_net; }));
  var mx = Math.max(1000, Math.max.apply(null, allVals.map(Math.abs)));
  var y = function (v) { return T + ih * (1 - (v + mx) / (2 * mx)); };
  var bw = iw / rows.length;
  [-mx, 0, mx].forEach(function (v) {
    el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: css("--line"), "stroke-width": v === 0 ? 1.5 : 1 }, s);
    var t = el("text", { x: L - 8, y: y(v) + 4, "text-anchor": "end", "font-size": 10, fill: css("--muted") }, s);
    t.textContent = (v / 1000).toFixed(1) + "k";
  });
  rows.forEach(function (r, i) {
    var x0 = L + i * bw + bw * 0.12, w = bw * 0.36;
    [[r.fii_net, "--down", x0], [r.dii_net, "--up", x0 + w + 1]].forEach(function (pair) {
      var v = pair[0], c = pair[1], xx = pair[2];
      el("rect", { x: xx, y: Math.min(y(v), y(0)), width: w, height: Math.abs(y(v) - y(0)) || 0.5, fill: css(c), rx: 1.5 }, s);
    });
    if (i % 3 === 0 || i === rows.length - 1) {
      var t = el("text", { x: L + i * bw + bw / 2, y: H - 8, "text-anchor": "middle", "font-size": 9, fill: css("--muted") }, s);
      t.textContent = (r.date || "").slice(-5);
    }
  });
})();
