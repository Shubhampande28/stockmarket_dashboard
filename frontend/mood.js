(function () {
  "use strict";

  var DATA = JSON.parse(document.getElementById("mood-data").textContent);
  var css = function (name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); };
  var NS = "http://www.w3.org/2000/svg";
  var el = function (tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  var reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var ZONES = [
    { max: 25, c: "--fear-x" }, { max: 45, c: "--fear" }, { max: 55, c: "--neutral" },
    { max: 75, c: "--greed" }, { max: 100, c: "--greed-x" },
  ];
  function zoneColor(v) { for (var i = 0; i < ZONES.length; i++) if (v <= ZONES[i].max) return ZONES[i].c; return ZONES[4].c; }

  // ---------------- gauge ----------------
  function drawGauge() {
    var g = document.getElementById("gauge");
    if (!g) return;
    Array.prototype.slice.call(g.querySelectorAll(":not(title)")).forEach(function (n) { n.remove(); });
    var cx = 200, cy = 200, R = 165, w = 30;
    var ang = function (v) { return Math.PI * (1 - v / 100); };
    var pt = function (v, r) { return [cx + r * Math.cos(ang(v)), cy - r * Math.sin(ang(v))]; };
    var start = 0;
    ZONES.forEach(function (z) {
      var p1 = pt(start + 0.6, R), p2 = pt(z.max - 0.6, R);
      el("path", { d: "M" + p1[0] + " " + p1[1] + " A" + R + " " + R + " 0 0 1 " + p2[0] + " " + p2[1], stroke: css(z.c), "stroke-width": w, fill: "none" }, g);
      start = z.max;
    });
    [0, 25, 50, 75, 100].forEach(function (v) {
      var p = pt(v, R - w / 2 - 14);
      var t = el("text", { x: p[0], y: p[1] + 4, "text-anchor": "middle", "font-size": "11", "font-family": "JetBrains Mono, monospace", fill: css("--muted") }, g);
      t.textContent = v;
    });
    var needle = el("g", {}, g);
    el("line", { x1: cx, y1: cy, x2: cx - R + 44, y2: cy, stroke: css("--ink"), "stroke-width": 4, "stroke-linecap": "round" }, needle);
    el("circle", { cx: cx, cy: cy, r: 11, fill: css("--ink") }, needle);
    el("circle", { cx: cx, cy: cy, r: 4, fill: css("--surface") }, needle);
    var num = el("text", { x: cx, y: cy + 66, "text-anchor": "middle", "font-size": "56", "font-weight": "800", "font-family": "Archivo, sans-serif", fill: css("--ink") }, g);
    num.textContent = DATA.score;
    var sub = el("text", { x: cx, y: cy + 86, "text-anchor": "middle", "font-size": "12", fill: css("--muted") }, g);
    sub.textContent = "out of 100";

    var target = 180 * DATA.score / 100;
    if (reduceMotion) { needle.setAttribute("transform", "rotate(" + target + " " + cx + " " + cy + ")"); return; }
    var t0 = performance.now();
    (function step(t) {
      var p = Math.min(1, (t - t0) / 1100), e = 1 - Math.pow(1 - p, 3);
      needle.setAttribute("transform", "rotate(" + (target * e) + " " + cx + " " + cy + ")");
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  // ---------------- mood vs nifty history ----------------
  function drawHistory() {
    var s = document.getElementById("history");
    if (!s || !DATA.history || DATA.history.length < 2) return;
    s.innerHTML = "";
    var mood = DATA.history.map(function (h) { return h.score; });
    var nifty = DATA.history.map(function (h) { return h.niftyClose; }).filter(function (v) { return v != null; });
    if (nifty.length < 2) return;
    var N = mood.length;
    var W = 640, H = 260, L = 34, Rm = 54, T = 12, B = 28, iw = W - L - Rm, ih = H - T - B;
    var x = function (i) { return L + iw * i / (N - 1); };
    var y = function (v) { return T + ih * (1 - v / 100); };
    var nMin = Math.min.apply(null, nifty), nMax = Math.max.apply(null, nifty), pad = (nMax - nMin) * 0.1 || 1;
    var lo = nMin - pad, hi = nMax + pad;
    var yn = function (v) { return T + ih * (1 - (v - lo) / (hi - lo)); };
    [0, 25, 50, 75, 100].forEach(function (v) {
      el("line", { x1: L, x2: L + iw, y1: y(v), y2: y(v), stroke: css("--line"), "stroke-width": 1 }, s);
      var t = el("text", { x: L - 6, y: y(v) + 4, "text-anchor": "end", "font-size": 11, fill: css("--muted") }, s);
      t.textContent = v;
    });
    var path = function (arr, fy) { return arr.map(function (v, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + fy(v).toFixed(1); }).join(" "); };
    el("path", { d: path(nifty, yn), fill: "none", stroke: css("--muted"), "stroke-width": 1.5, "stroke-dasharray": "4 3" }, s);
    el("path", { d: path(mood, y), fill: "none", stroke: css("--accent"), "stroke-width": 2.5, "stroke-linejoin": "round" }, s);
    el("circle", { cx: x(N - 1), cy: y(mood[N - 1]), r: 5, fill: css("--accent"), stroke: css("--surface"), "stroke-width": 2 }, s);
  }

  // ---------------- FII/DII flows ----------------
  function drawFlows() {
    var s = document.getElementById("flows");
    if (!s || !DATA.flows || !DATA.flows.length) return;
    s.innerHTML = "";
    var rows = DATA.flows;
    var W = 360, H = 240, L = 44, R = 8, T = 10, B = 26, iw = W - L - R, ih = H - T - B;
    var allVals = rows.map(function (r) { return r.fii; }).concat(rows.map(function (r) { return r.dii; }));
    var mx = Math.max(1000, Math.max.apply(null, allVals.map(Math.abs)));
    var y = function (v) { return T + ih * (1 - (v + mx) / (2 * mx)); };
    var bw = iw / rows.length;
    [-mx, 0, mx].forEach(function (v) {
      el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: css("--line"), "stroke-width": v === 0 ? 1.5 : 1 }, s);
    });
    rows.forEach(function (r, i) {
      var x0 = L + i * bw + bw * 0.14, w = bw * 0.34;
      [[r.fii, "--down", x0], [r.dii, "--up", x0 + w + 1]].forEach(function (pair) {
        var v = pair[0], c = pair[1], xx = pair[2];
        el("rect", { x: xx, y: Math.min(y(v), y(0)), width: w, height: Math.abs(y(v) - y(0)), fill: css(c), rx: 1.5 }, s);
      });
      var t = el("text", { x: L + i * bw + bw / 2, y: H - 8, "text-anchor": "middle", "font-size": 9, fill: css("--muted") }, s);
      t.textContent = (r.date || "").slice(-2);
    });
  }

  // ---------------- share ----------------
  var shareBtn = document.getElementById("shareBtn");
  if (shareBtn) {
    shareBtn.addEventListener("click", function () {
      var txt = "Market mood today (" + new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + "): " +
        shareBtn.dataset.score + "/100, " + shareBtn.dataset.zone + "\n" + shareBtn.dataset.headline +
        "\nSee why -> https://www.equilytics.in/?utm_source=share&utm_medium=copy";
      var toast = document.getElementById("toast");
      navigator.clipboard.writeText(txt).then(function () {
        toast.textContent = "Copied. Paste it into WhatsApp or X.";
        if (window.gtag) gtag("event", "share_copy");
      }, function () { toast.textContent = txt; });
    });
  }
  var waBtn = document.getElementById("waShareBtn");
  if (waBtn) waBtn.addEventListener("click", function () { if (window.gtag) gtag("event", "share_whatsapp"); });

  // ---------------- focus lists ----------------
  var LIST_TABS = [
    ["near-52w-high", "Near 52-week high"],
    ["near-52w-low", "Near 52-week low"],
    ["volume-shockers", "Volume shockers"],
    ["steady-climbers", "Steady climbers"],
  ];
  var curList = LIST_TABS[0][0];
  var listCache = {};

  function renderListTable(data) {
    var rule = document.getElementById("listRule");
    var tbl = document.getElementById("listTbl");
    if (!rule || !tbl) return;
    rule.textContent = (data && data.rule) || "";
    var rows = (data && data.rows) || [];
    var cols = (data && data.cols) || [];
    tbl.innerHTML = "<thead><tr>" + cols.map(function (c, i) { return "<th class=\"" + (i >= 2 ? "n" : "") + "\">" + c + "</th>"; }).join("") + "</tr></thead>" +
      "<tbody>" + rows.map(function (r) {
        return "<tr>" + r.map(function (v, i) { return "<td class=\"" + (i >= 2 ? "n" : "") + "\">" + (i === 0 ? "<b>" + v + "</b>" : v) + "</td>"; }).join("") + "</tr>";
      }).join("") + "</tbody>";
  }

  function loadList(id) {
    if (listCache[id]) { renderListTable(listCache[id]); return; }
    fetch("/api/lists/" + id).then(function (r) { return r.json(); }).then(function (data) {
      listCache[id] = data;
      renderListTable(data);
    }).catch(function () { renderListTable(null); });
  }

  var tabsEl = document.getElementById("tabs");
  if (tabsEl) {
    tabsEl.innerHTML = LIST_TABS.map(function (t) {
      return '<button class="tab" role="tab" type="button" aria-selected="' + (t[0] === curList) + '" data-k="' + t[0] + '">' + t[1] + "</button>";
    }).join("");
    tabsEl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-k]");
      if (!b) return;
      curList = b.dataset.k;
      Array.prototype.forEach.call(tabsEl.querySelectorAll(".tab"), function (x) { x.setAttribute("aria-selected", x === b); });
      loadList(curList);
      if (window.gtag) gtag("event", "focus_tab", { list: curList });
    });
    loadList(curList);
  }

  // ---------------- poll ----------------
  var pollOpts = document.getElementById("pollOpts");
  var pollRes = document.getElementById("pollRes");
  function renderPollResults(data, mine) {
    if (!pollRes || !data) return;
    var total = (data.up || 0) + (data.flat || 0) + (data.down || 0) || 1;
    var rows = [["Higher", "up", "--up"], ["Same", "flat", "--neutral"], ["Lower", "down", "--down"]];
    pollRes.innerHTML = rows.map(function (r) {
      var pct = Math.round((data[r[1]] || 0) / total * 100);
      return '<div class="poll-row"><span>' + r[0] + (mine === r[1] ? " ✓" : "") + '</span>' +
        '<div class="track"><div class="fill" style="width:' + pct + '%;background:var(' + r[2] + ')"></div></div>' +
        '<span class="mono">' + pct + "%</span></div>";
    }).join("");
  }
  if (pollOpts) {
    fetch("/api/poll").then(function (r) { return r.json(); }).then(function (data) {
      renderPollResults(data.counts, data.yourVote);
      if (data.yourVote) {
        pollOpts.querySelectorAll(".btn").forEach(function (b) { b.disabled = true; });
      }
    });
    pollOpts.addEventListener("click", function (e) {
      var b = e.target.closest("[data-v]");
      if (!b || b.disabled) return;
      fetch("/api/poll", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice: b.dataset.v }),
      }).then(function (r) { return r.json(); }).then(function (data) {
        renderPollResults(data.counts, b.dataset.v);
        pollOpts.querySelectorAll(".btn").forEach(function (x) { x.disabled = true; });
        if (window.gtag) gtag("event", "poll_vote", { choice: b.dataset.v });
      });
    });
  }

  // ---------------- signal card view tracking ----------------
  if ("IntersectionObserver" in window && window.gtag) {
    var seen = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !seen.has(entry.target)) {
          seen.add(entry.target);
          gtag("event", "signal_card_view");
        }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll(".sig").forEach(function (card) { io.observe(card); });
  }

  // ---------------- live refresh ----------------
  if (DATA.marketOpen) {
    setInterval(function () {
      fetch("/api/mood").then(function (r) { return r.json(); }).then(function (data) {
        if (!data || data.error) return;
        DATA.score = data.score;
        document.getElementById("moodWord").textContent = data.zone;
        document.getElementById("moodLede").innerHTML = data.headline + " So the market is <b>" + data.verdict + "</b>.";
        drawGauge();
      }).catch(function () {});
    }, 120000);
  }

  drawGauge();
  drawHistory();
  drawFlows();
})();
