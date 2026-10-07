(function () {
  "use strict";
  var history = window.__mood_history || [];
  var s = document.getElementById("history");
  if (!s || history.length < 2) return;
  var css = function (name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); };
  var NS = "http://www.w3.org/2000/svg";
  var el = function (tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  var vb = s.viewBox.baseVal;
  var W = vb.width, H = vb.height, L = 40, Rm = 60, T = 14, B = 30, iw = W - L - Rm, ih = H - T - B;
  var mood = history.map(function (h) { return h.score; });
  var nifty = history.map(function (h) { return h.niftyClose; }).filter(function (v) { return v != null; });
  var N = mood.length;
  var x = function (i) { return L + iw * i / (N - 1); };
  var y = function (v) { return T + ih * (1 - v / 100); };
  [0, 25, 50, 75, 100].forEach(function (v) {
    el("line", { x1: L, x2: L + iw, y1: y(v), y2: y(v), stroke: css("--line"), "stroke-width": 1 }, s);
  });
  var path = function (arr, fy) { return arr.map(function (v, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + fy(v).toFixed(1); }).join(" "); };
  el("path", { d: path(mood, y), fill: "none", stroke: css("--accent"), "stroke-width": 2 }, s);
  if (nifty.length > 1) {
    var nMin = Math.min.apply(null, nifty), nMax = Math.max.apply(null, nifty), pad = (nMax - nMin) * 0.1 || 1;
    var yn = function (v) { return T + ih * (1 - (v - (nMin - pad)) / ((nMax + pad) - (nMin - pad))); };
    el("path", { d: path(nifty, yn), fill: "none", stroke: css("--muted"), "stroke-width": 1.3, "stroke-dasharray": "4 3" }, s);
  }
})();
