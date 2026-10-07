(function () {
  "use strict";
  var score = window.__gauge_score;
  if (score == null) return;
  var css = function (name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); };
  var NS = "http://www.w3.org/2000/svg";
  var el = function (tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  var ZONES = [
    { max: 25, c: "--fear-x" }, { max: 45, c: "--fear" }, { max: 55, c: "--neutral" },
    { max: 75, c: "--greed" }, { max: 100, c: "--greed-x" },
  ];
  var g = document.getElementById("gauge");
  if (!g) return;
  var cx = 200, cy = 200, R = 165, w = 30;
  var ang = function (v) { return Math.PI * (1 - v / 100); };
  var pt = function (v, r) { return [cx + r * Math.cos(ang(v)), cy - r * Math.sin(ang(v))]; };
  var start = 0;
  ZONES.forEach(function (z) {
    var p1 = pt(start + 0.6, R), p2 = pt(z.max - 0.6, R);
    el("path", { d: "M" + p1[0] + " " + p1[1] + " A" + R + " " + R + " 0 0 1 " + p2[0] + " " + p2[1], stroke: css(z.c), "stroke-width": w, fill: "none" }, g);
    start = z.max;
  });
  var target = 180 * score / 100;
  var needle = el("g", { transform: "rotate(" + target + " " + cx + " " + cy + ")" }, g);
  el("line", { x1: cx, y1: cy, x2: cx - R + 44, y2: cy, stroke: css("--ink"), "stroke-width": 4, "stroke-linecap": "round" }, needle);
  el("circle", { cx: cx, cy: cy, r: 11, fill: css("--ink") }, needle);
  var num = el("text", { x: cx, y: cy + 66, "text-anchor": "middle", "font-size": "56", "font-weight": "800", "font-family": "Archivo, sans-serif", fill: css("--ink") }, g);
  num.textContent = score;
  var sub = el("text", { x: cx, y: cy + 86, "text-anchor": "middle", "font-size": "12", fill: css("--muted") }, g);
  sub.textContent = "out of 100";
})();
