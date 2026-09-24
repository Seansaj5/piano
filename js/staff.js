/* Notation drawn as SVG from the Bravura outlines in glyphs.js.
   Vertical positions are "steps": 0 is the bottom staff line, each step is half a staff space, up is positive. */
(function (root) {
  "use strict";
  var W = root.W = root.W || {};
  var T = W.T, G = W.GLYPHS, S = W.Staff = {};

  var BOTTOM = { treble: 30, bass: 18 };                    // staffIndex of the bottom line: E4, G2
  var SHARP_STEPS = [8, 5, 9, 6, 3, 7, 4], FLAT_STEPS = [4, 7, 3, 6, 2, 5, 1];   // treble; bass is two lower
  var ACC_GLYPH = { "-2": "doubleFlat", "-1": "flat", "0": "natural", "1": "sharp", "2": "doubleSharp" };

  function f(n) { return (Math.round(n * 100) / 100).toString(); }
  function glyph(name, x, y, s, cls, sx) {
    var k = s / 250;
    return '<path class="' + (cls || "ink") + '" transform="translate(' + f(x) + " " + f(y) + ") scale(" + f4(k * (sx || 1)) + " " + f4(k) + ')" d="' + G[name].d + '"/>';
  }
  function f4(n) { return (Math.round(n * 10000) / 10000).toString(); }
  function gw(name, s) { return G[name].w * s / 250; }
  function line(x1, y1, x2, y2, w, cls) { return '<line class="' + (cls || "ln") + '" x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '" stroke-width="' + f(w) + '"/>'; }
  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  S.stepOf = function (p, clef) { return T.staffIndex(p) - BOTTOM[clef]; };
  function sigMap(sig) { var m = [0, 0, 0, 0, 0, 0, 0]; T.sigNotes(sig || 0).forEach(function (n) { m[n.l] = n.a; }); return m; }

  // Draws clef, key signature and time signature for one staff. Returns the x where music can start.
  function preamble(out, st, s, x, sig, time) {
    var y = function (step) { return st.y0 - step * s / 2; };
    out.push(glyph(st.clef === "treble" ? "gClef" : "fClef", x, y(st.clef === "treble" ? 2 : 6), s));
    x += gw("gClef", s) + 0.6 * s;
    var n = Math.abs(sig || 0), steps = sig > 0 ? SHARP_STEPS : FLAT_STEPS, drop = st.clef === "bass" ? 2 : 0;
    for (var i = 0; i < n; i++) { out.push(glyph(sig > 0 ? "sharp" : "flat", x, y(steps[i] - drop), s, "ink sig")); x += (sig > 0 ? 1.08 : 0.95) * s; }
    if (n) x += 0.5 * s;
    if (time) {
      var w = Math.max(gw("ts" + time[0], s), gw("ts" + time[1], s));
      out.push(glyph("ts" + time[0], x + (w - gw("ts" + time[0], s)) / 2, y(6), s));
      out.push(glyph("ts" + time[1], x + (w - gw("ts" + time[1], s)) / 2, y(2), s));
      x += w + 0.7 * s;
    }
    return x;
  }
  function preambleWidth(s, sig, time) {
    var n = Math.abs(sig || 0);
    return gw("gClef", s) + 0.6 * s + n * (sig > 0 ? 1.08 : 0.95) * s + (n ? 0.5 * s : 0) + (time ? gw("ts4", s) + 0.7 * s : 0);
  }
  function staffLines(out, st, s, x1, x2) { for (var i = 0; i < 5; i++) out.push(line(x1, st.y0 - i * s, x2, st.y0 - i * s, Math.max(1, s * 0.11))); }
  function ledgers(out, st, s, x, w, lo, hi) {
    var k, ext = 0.42 * s, y;
    for (k = -2; k >= lo; k -= 2) { y = st.y0 - k * s / 2; out.push(line(x - ext, y, x + w + ext, y, Math.max(1.1, s * 0.15))); }
    for (k = 10; k <= hi; k += 2) { y = st.y0 - k * s / 2; out.push(line(x - ext, y, x + w + ext, y, Math.max(1.1, s * 0.15))); }
  }

  /* Draw a group of simultaneous notes. notes: [{p: pitch, cls}], dur in beats (4 whole, 2 half, 1 quarter, .5 eighth, .25 16th;
     dotted = 1.5x). accState: optional {key: accidental} memory for the bar. Returns {left, right} extents. */
  function drawChord(out, st, s, x, notes, dur, smap, accState) {
    var dotted = [6, 3, 1.5, 0.75].indexOf(dur) >= 0, base = dotted ? dur / 1.5 : dur;
    var head = base >= 4 ? "noteWhole" : base >= 2 ? "noteHalf" : "noteBlack", hw = gw(head, s);
    var list = notes.map(function (n) { return { p: n.p, cls: n.cls, step: S.stepOf(n.p, st.clef) }; }).sort(function (a, b) { return a.step - b.step; });
    var lo = list[0].step, hi = list[list.length - 1].step;
    var up = base >= 4 ? true : ((lo + hi) / 2 < 4);
    // seconds: push one of the pair across the stem
    var i;
    for (i = 0; i < list.length; i++) list[i].shift = 0;
    for (i = 1; i < list.length; i++) if (list[i].step - list[i - 1].step === 1 && !list[i - 1].shift) list[i].shift = 1;
    if (!up) for (i = 0; i < list.length; i++) { /* down-stem chords hang the odd note on the left */ if (list[i].shift) list[i].shift = -1; }

    // accidentals, stacked leftward in columns
    var cols = [], left = x;
    list.slice().reverse().forEach(function (n) {
      var key = n.p.l + ":" + n.p.o, cur = accState && key in accState ? accState[key] : smap[n.p.l];
      if (n.p.a === cur) return;
      if (accState) accState[key] = n.p.a;
      var c = 0; while (cols[c] != null && cols[c] - n.step < 6) c++;
      cols[c] = n.step;
      var name = ACC_GLYPH[n.p.a], ax = x - (list.some(function (q) { return q.shift < 0; }) ? hw : 0) - 0.28 * s - gw(name, s) - c * 1.12 * s;
      out.push(glyph(name, ax, st.y0 - n.step * s / 2, s, "ink " + (n.cls || "")));
      left = Math.min(left, ax);
    });

    var minX = x + Math.min.apply(null, list.map(function (n) { return n.shift; })) * hw * 0.92;
    var maxX = x + hw + Math.max.apply(null, list.map(function (n) { return n.shift; })) * hw * 0.92;
    ledgers(out, st, s, minX, maxX - minX, lo, hi);
    list.forEach(function (n) { out.push(glyph(head, x + n.shift * hw * 0.92, st.y0 - n.step * s / 2, s, "ink note " + (n.cls || ""))); });

    if (base < 4) {
      var sw = Math.max(1.1, s * 0.13), len = 3.5 * s, sx, y1, y2;
      if (up) { sx = x + hw - sw / 2; y1 = st.y0 - lo * s / 2 - 0.15 * s; y2 = st.y0 - hi * s / 2 - len; if (hi < -1) y2 = st.y0 - 4 * s / 2; }
      else { sx = x + sw / 2; y1 = st.y0 - hi * s / 2 + 0.15 * s; y2 = st.y0 - lo * s / 2 + len; if (lo > 9) y2 = st.y0 - 4 * s / 2; }
      out.push(line(sx, y1, sx, y2, sw, "ln stem " + (list.length === 1 ? (list[0].cls || "") : "")));
      if (base <= 0.5) out.push(glyph((base <= 0.25 ? "flag16" : "flag8") + (up ? "Up" : "Down"), sx - sw / 2, y2, s, "ink " + (list.length === 1 ? (list[0].cls || "") : "")));
      if (up && base <= 0.5) maxX = Math.max(maxX, sx + gw("flag8Up", s));
    }
    if (dotted) list.forEach(function (n) {
      var dy = n.step % 2 === 0 ? -s / 2 : 0;
      out.push('<circle class="ink ' + (n.cls || "") + '" cx="' + f(maxX + 0.45 * s) + '" cy="' + f(st.y0 - n.step * s / 2 + dy) + '" r="' + f(0.2 * s) + '"/>');
    });
    return { left: left, right: maxX + (dotted ? 0.8 * s : 0), top: st.y0 - Math.max(hi, 8) * s / 2 - (up && base < 4 ? 3.5 * s : 0) };
  }
  function drawRest(out, st, s, x, dur) {
    var dotted = [3, 1.5, 0.75].indexOf(dur) >= 0, base = dotted ? dur / 1.5 : dur;
    var name = base >= 4 ? "restWhole" : base >= 2 ? "restHalf" : base >= 1 ? "restQuarter" : "rest8";
    out.push(glyph(name, x, st.y0 - (name === "restWhole" ? 6 : 4) * s / 2, s));
    if (dotted) out.push('<circle class="ink" cx="' + f(x + gw(name, s) + 0.4 * s) + '" cy="' + f(st.y0 - 5 * s / 2) + '" r="' + f(0.2 * s) + '"/>');
  }

  /* ---------- single system: chords, scales, flash cards, key signatures ----------
     spec: { clef: "treble"|"bass"|"grand", sig, space, width, items: [{pitches:[pitch], cls, label, staff, clsEach:[...]}], justify }
     Pitches in a grand staff go to the treble from middle C up unless item.staff says otherwise. */
  S.render = function (el, spec) {
    var s = spec.space || 10, clef = spec.clef || "treble", grand = clef === "grand";
    var width = Math.max(140, spec.width || el.clientWidth || 320);
    var items = spec.items || [], smap = sigMap(spec.sig);
    var split = function (it) {
      var t = [], b = [];
      (it.pitches || []).forEach(function (p, i) {
        var n = { p: p, cls: (it.clsEach && it.clsEach[i]) || it.cls || "" };
        var where = !grand ? clef : ((it.staffEach && it.staffEach[i]) || it.staff || (p.midi >= 60 ? "treble" : "bass"));
        (where === "treble" ? t : b).push(n);
      });
      return { treble: t, bass: b };
    };
    var parts = items.map(split);
    var ext = { treble: [-3.5, 11], bass: [-1, 9] };
    parts.forEach(function (pt) {
      ["treble", "bass"].forEach(function (c) {
        pt[c].forEach(function (n) { var st = S.stepOf(n.p, c); ext[c][0] = Math.min(ext[c][0], st - 2); ext[c][1] = Math.max(ext[c][1], st + 2); });
      });
    });
    var hasLabel = items.some(function (it) { return it.label; });
    var pad = 0.7 * s + (hasLabel ? 2.3 * s : 0), staves = [];
    var first = grand ? "treble" : clef;
    var y0 = pad + (ext[first][1] - 8) * s / 2 + 4 * s;
    staves.push({ clef: first, y0: y0 });
    if (grand) {
      var gapSteps = Math.max(12, -ext.treble[0] + (ext.bass[1] - 8) + 2);
      staves.push({ clef: "bass", y0: y0 + gapSteps * s / 2 + 4 * s });
    }
    var last = staves[staves.length - 1], height = last.y0 - ext[last.clef][0] * s / 2 + 0.6 * s;

    var out = [], x0 = grand ? 1.5 * s : 0.4 * s, xEnd = width - 0.4 * s;
    staves.forEach(function (st) { staffLines(out, st, s, x0, xEnd); });
    var xs = x0 + 0.5 * s;
    staves.forEach(function (st) { xs = Math.max(xs, preamble(out, st, s, x0 + 0.5 * s, spec.sig, spec.time)); });
    if (grand) {
      var topY = staves[0].y0 - 4 * s, botY = staves[1].y0;
      out.push(line(x0, topY, x0, botY, Math.max(1.2, s * 0.14)));
      out.push(glyph("brace", x0 - 0.35 * s - gw("brace", s) * 1.7, botY, (botY - topY) / 4, "ink", 1.7 * 4 * s / (botY - topY)));
    }
    out.push(line(xEnd, staves[0].y0 - 4 * s, xEnd, last.y0, Math.max(1.2, s * 0.14)));

    var n = items.length;
    if (n) {
      var avail = xEnd - xs - s, slot = Math.min(avail / n, (spec.maxSlot || 8.5) * s), start = xs + (spec.justify === "left" ? 0.5 * s : (avail - slot * n) / 2);
      items.forEach(function (it, i) {
        var cx = start + slot * i + slot / 2 - gw("noteWhole", s) / 2 + (spec.justify === "left" ? 0 : 0.4 * s);
        var top = staves[0].y0 - 4 * s;
        staves.forEach(function (st) {
          var ns = parts[i][st.clef];
          if (ns.length) { var r = drawChord(out, st, s, cx, ns, it.dur || 4, smap, null); if (st === staves[0]) top = Math.min(top, r.top); }
        });
        if (it.label) out.push('<text class="lbl ' + (it.labelCls || "") + '" x="' + f(cx + gw("noteWhole", s) / 2) + '" y="' + f(Math.min(top, staves[0].y0 - 4 * s) - 0.9 * s) + '" text-anchor="middle" font-size="' + f(1.5 * s) + '">' + esc(it.label) + "</text>");
      });
    }
    el.innerHTML = '<svg class="staff" viewBox="0 0 ' + f(width) + " " + f(height) + '" width="' + f(width) + '" height="' + f(height) + '" role="img" aria-label="' + esc(spec.aria || "Music notation") + '">' + out.join("") + "</svg>";
  };

  /* ---------- lead sheet: melody on a treble staff, chord symbols above, several systems ----------
     song: { sig, time: [beats, unit], bars: [{ notes: [{p: pitch|null, d: beats, cls}], chords: [{beat, text, i}] , beats? }] }
     opts: { space, width, perLine, noTime (a window that starts mid-tune) }. Chord symbols carry data-ci so the caller can make them clickable. */
  S.leadSheet = function (el, song, opts) {
    var o = opts || {}, s = o.space || 9, width = Math.max(260, o.width || el.clientWidth || 340);
    var full = song.time[0], perLine = o.perLine || (width > 900 ? 4 : width > 560 ? 3 : 2);
    var smap = sigMap(song.sig), out = [], y = 0;
    var bars = song.bars, idx = 0, sys = 0;
    while (idx < bars.length) {
      var showTime = sys === 0 && !o.noTime, pre = preambleWidth(s, song.sig, showTime ? song.time : null) + 0.9 * s;
      var group = [], weight = 0;
      while (idx < bars.length && group.length < perLine + (sys === 0 && (bars[0].beats || full) < full ? 1 : 0)) {
        var b = bars[idx], beats = b.beats || full; group.push({ bar: b, i: idx, w: Math.max(0.45, beats / full) }); weight += Math.max(0.45, beats / full); idx++;
      }
      // highest and lowest things on this system decide its height
      var hi = 8, lo = 0;
      group.forEach(function (g) { g.bar.notes.forEach(function (n) { if (n.p) { var st = S.stepOf(n.p, "treble"); hi = Math.max(hi, st + (st < 4 ? 7 : 0)); lo = Math.min(lo, st - (st >= 4 ? 7 : 0)); } }); });
      var st = { clef: "treble", y0: y + 3.4 * s + (Math.max(hi, 11) - 8) * s / 2 + 4 * s };
      var x0 = 0.4 * s, xEnd = width - 0.4 * s;
      staffLines(out, st, s, x0, xEnd);
      preamble(out, st, s, x0 + 0.5 * s, song.sig, showTime ? song.time : null);
      var bx = x0 + pre, unit = (xEnd - bx) / Math.max(weight, perLine * (group.length < perLine ? 1 : 0) || weight);
      if (group.length < perLine && idx >= bars.length) unit = (xEnd - bx) / Math.max(weight, perLine * 0.75);
      var labelY = st.y0 - Math.max(hi + 1, 11.5) * s / 2 - 0.5 * s;
      group.forEach(function (g) {
        var bw = unit * g.w, beats = g.bar.beats || full, inner = bw - 2.6 * s, acc = {}, t = 0;
        out.push('<rect class="barbg" data-bar="' + g.i + '" x="' + f(bx) + '" y="' + f(st.y0 - 4 * s) + '" width="' + f(bw) + '" height="' + f(4 * s) + '"/>');
        // Short notes get more than their share of the bar, as in engraved music, so a sixteenth never collides with its neighbour.
        var onsets = [], cum = [], total = 0;
        g.bar.notes.forEach(function (n) { onsets.push(t); cum.push(total); total += Math.pow(n.d, 0.55); t += n.d; });
        onsets.push(t); cum.push(total);
        var xAt = function (beat) {
          if (!total) return bx + 1.0 * s + (beat / beats) * inner;
          for (var k = onsets.length - 2; k >= 0; k--) if (beat >= onsets[k]) {
            var span = onsets[k + 1] - onsets[k], frac = span ? (beat - onsets[k]) / span : 0;
            return bx + 1.0 * s + (cum[k] + frac * (cum[k + 1] - cum[k])) / total * inner;
          }
          return bx + 1.0 * s;
        };
        g.bar.notes.forEach(function (n, k) {
          var nx = xAt(onsets[k]);
          if (n.p) drawChord(out, st, s, nx, [{ p: n.p, cls: n.cls }], n.d, smap, acc); else drawRest(out, st, s, nx, n.d);
        });
        (g.bar.chords || []).forEach(function (c) {
          var cx = xAt(c.beat) - 0.2 * s;
          out.push('<text class="lbl chord" data-ci="' + c.i + '" x="' + f(cx) + '" y="' + f(labelY) + '" font-size="' + f(1.7 * s) + '">' + esc(c.text) + "</text>");
        });
        bx += bw;
        out.push(line(bx, st.y0 - 4 * s, bx, st.y0, Math.max(1, s * 0.12)));
      });
      if (idx >= bars.length) out.push(line(bx - 0.45 * s, st.y0 - 4 * s, bx - 0.45 * s, st.y0, Math.max(1, s * 0.12)));
      y = st.y0 - Math.min(lo, -3.5) * s / 2 + 1.2 * s;
      sys++;
    }
    el.innerHTML = '<svg class="staff sheet" viewBox="0 0 ' + f(width) + " " + f(y) + '" width="' + f(width) + '" height="' + f(y) + '" role="img" aria-label="Lead sheet">' + out.join("") + "</svg>";
  };
})(typeof self !== "undefined" ? self : globalThis);
